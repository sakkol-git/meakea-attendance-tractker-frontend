import { expect, it } from 'vitest'
import { ClientData } from '../../app/data/client'
import { SessionService } from '../../app/api/auth'
import type { DataSource } from '../../app/data/source'
it('shares refresh requests and prevents an in-flight refresh reviving a signed-out session', async () => {
  let resolve!: (value: { status: number; data: { accessToken: string } }) => void
  let refreshes = 0
  const client = new ClientData('local', '')
  let tokenWrites = 0
  client.setAccessToken = () => {
    tokenWrites++
  }
  const source: DataSource = {
    mode: 'remote',
    async send(r) {
      if (r.path === '/auth/refresh') {
        refreshes++
        return new Promise((r) => {
          resolve = r
        })
      }
      return { status: 204, data: null }
    },
  }
  const service = new SessionService(client, source)
  const first = service.refresh()
  const second = service.refresh()
  const settled = Promise.allSettled([first, second])
  await Promise.resolve()
  expect(refreshes).toBe(1)
  await service.logout()
  resolve({ status: 200, data: { accessToken: 'late-token' } })
  expect((await settled).every((x) => x.status === 'rejected')).toBe(true)
  expect(tokenWrites).toBe(0)
})

it('dispatches forgot-password, reset-password, change-password and profile update requests', async () => {
  const dispatched: { method: string; path: string; body?: unknown }[] = []
  const client = new ClientData('local', '')
  const source: DataSource = {
    mode: 'remote',
    async send(r) {
      dispatched.push({ method: r.method, path: r.path, body: r.body })
      if (r.path === '/auth/profile') {
        return {
          status: 200,
          data: {
            userId: 'user-1',
            employeeId: 'emp-1',
            tenantId: 'tenant-test',
            email: 'user@example.test',
            name: 'Updated Name',
            roles: ['EMPLOYEE'],
            timeZone: 'Asia/Bangkok',
          },
        }
      }
      return { status: 200, data: { ok: true } }
    },
  }
  const service = new SessionService(client, source)
  await service.setupWorkspace({
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerName: 'Jane Doe',
    ownerEmail: 'jane@acme.com',
    bootstrapCode: 'code-123',
    timezone: 'Asia/Phnom_Penh',
    locale: 'en',
  })
  await service.forgotPassword('user@example.test')
  await service.resetPassword({ token: 'tok-123', newPassword: 'new-password' })
  await service.changePassword({ currentPassword: 'old-pw', newPassword: 'new-pw' })
  const updated = await service.updateProfile({ name: 'Updated Name', timeZone: 'Asia/Bangkok' })

  expect(dispatched).toHaveLength(5)
  expect(dispatched[0]).toMatchObject({
    method: 'POST',
    path: '/auth/setup',
    body: {
      name: 'Acme Corp',
      slug: 'acme-corp',
      ownerName: 'Jane Doe',
      ownerEmail: 'jane@acme.com',
      bootstrapCode: 'code-123',
      timezone: 'Asia/Phnom_Penh',
      locale: 'en',
    },
  })
  expect(dispatched[1]).toMatchObject({
    method: 'POST',
    path: '/auth/forgot-password',
    body: { email: 'user@example.test' },
  })
  expect(dispatched[2]).toMatchObject({
    method: 'POST',
    path: '/auth/reset-password',
    body: { token: 'tok-123', newPassword: 'new-password' },
  })
  expect(dispatched[3]).toMatchObject({
    method: 'POST',
    path: '/auth/change-password',
    body: { currentPassword: 'old-pw', newPassword: 'new-pw' },
  })
  expect(dispatched[4]).toMatchObject({
    method: 'PATCH',
    path: '/auth/profile',
    body: { name: 'Updated Name', timeZone: 'Asia/Bangkok' },
  })
  expect(updated.name).toBe('Updated Name')
  expect(updated.timeZone).toBe('Asia/Bangkok')
})

it('bootstraps a missing browser CSRF cookie before sending credentials', async () => {
  const paths: string[] = []
  let csrf: string | undefined
  const client = new ClientData('local', '')
  const source: DataSource = {
    mode: 'remote',
    async send(request) {
      paths.push(request.path)
      if (request.path === '/auth/csrf') {
        csrf = 'csrf-token'
        return { status: 204, data: null }
      }
      if (request.path === '/auth/login')
        return { status: 200, data: { accessToken: 'access-token' } }
      return {
        status: 200,
        data: {
          employeeId: 'employee-1',
          tenantId: 'tenant-1',
          name: 'Sok Dara',
          roles: ['EMPLOYEE'],
          timeZone: 'Asia/Phnom_Penh',
        },
      }
    },
  }
  const service = new SessionService(
    client,
    source,
    () => {
      if (!csrf) throw new Error('CSRF required')
    },
    () => csrf,
  )

  await service.login({ tenant: 'hrflow', email: 'dara@example.test', password: 'secret' })
  expect(paths).toEqual(['/auth/csrf', '/auth/login', '/auth/me'])
})

it('validates setupWorkspaceForm and employeeForm with tenant catalog IDs', async () => {
  const { setupWorkspaceForm, employeeForm } = await import('../../app/schemas/forms')

  const validSetup = setupWorkspaceForm.safeParse({
    name: 'Acme Corporation',
    slug: 'acme-corp',
    ownerName: 'Jane Owner',
    ownerEmail: 'jane@acme.com',
  })
  expect(validSetup.success).toBe(true)
  if (validSetup.success) {
    expect(validSetup.data.timezone).toBe('Asia/Phnom_Penh')
    expect(validSetup.data.locale).toBe('en')
  }

  const invalidSetup = setupWorkspaceForm.safeParse({
    name: 'A',
    slug: 'INVALID SLUG!',
    ownerName: '',
    ownerEmail: 'not-an-email',
  })
  expect(invalidSetup.success).toBe(false)

  const validEmployee = employeeForm.safeParse({
    name: 'Alice Cooper',
    email: 'alice@example.com',
    employeeNo: 'EMP-101',
    hireDate: '2024-02-01',
    departmentId: 'engineering',
    positionId: 'engineer',
    managerId: 'manager',
  })
  expect(validEmployee.success).toBe(true)

  const employeeWithoutOptionalFields = employeeForm.safeParse({
    name: 'Bob Marley',
    email: 'bob@example.com',
    employeeNo: 'EMP-102',
    departmentId: 'engineering',
    positionId: 'engineer',
  })
  expect(employeeWithoutOptionalFields.success).toBe(true)
  expect(
    employeeForm.safeParse({
      name: 'Bob',
      email: 'bob@example.com',
      departmentId: 'engineering',
      positionId: 'engineer',
    }).success,
  ).toBe(false)
})
