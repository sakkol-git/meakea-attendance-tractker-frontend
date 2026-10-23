import { describe, expect, it, vi } from 'vitest'
import { BusinessApi } from '../../app/api/business'
import { WorkspaceApi } from '../../app/api/workspace'
import { WorkspaceDemoSource } from '../../app/data/demo'
import { LocalDataSource } from '../../app/data/local'
import { commandKey } from '../../app/data/source'
import { workflows } from '../../app/features/workflows/catalog'
import { workflowActions } from '../../app/features/workflows/forms'
function fixture(role = 'HR_ADMIN') {
  const demo = new WorkspaceDemoSource(new LocalDataSource())
  demo.setRole(role)
  const core = new WorkspaceApi(demo)
  return { demo, core, business: new BusinessApi(core, () => {}) }
}
async function run(
  b: BusinessApi,
  n: number,
  action: string,
  values: Record<string, string | number | boolean>,
  key = commandKey(),
) {
  const id = `BF-${String(n).padStart(3, '0')}`
  const snap = await b.snapshot(id)
  const versions = Object.fromEntries(
    [...snap.items, ...snap.references]
      .filter((x) => x.version !== undefined)
      .map((x) => [x.id, x.version!]),
  )
  return b.execute(id, action, values, key, versions)
}
describe('complete source catalogue', () => {
  it('maps each of the 40 business IDs once, with source, purpose, roles and a resolvable screen', () => {
    expect(workflows.map((x) => x.number)).toEqual(Array.from({ length: 40 }, (_, i) => i + 1))
    for (const flow of workflows) {
      expect(flow.source).toMatch(/^docs\/business-flow\/.+\.md$/)
      expect(flow.purpose.length).toBeGreaterThan(15)
      expect(flow.roles.length).toBeGreaterThan(0)
      expect(new Set(workflowActions(flow.number).map((x) => x.key)).size).toBe(
        workflowActions(flow.number).length,
      )
    }
  })
  it('allows owner previews for all workflows and denies privileged mutations to employees', async () => {
    const { business } = fixture('OWNER')
    for (const flow of workflows) expect((await business.snapshot(flow.id)).items).toBeDefined()
    const e = fixture('EMPLOYEE')
    await expect(e.business.snapshot('BF-003')).rejects.toMatchObject({ status: 403 })
    await expect(
      run(e.business, 18, 'adjust', {
        employeeId: 'demo-employee',
        year: 2026,
        type: 'Annual leave',
        days: 1,
        reason: 'A valid reason.',
      }),
    ).rejects.toMatchObject({ status: 403 })
  })
})
describe('advanced HR workflows', () => {
  it('validates real dates, assignments, inclusive overlap, closure and stale decisions', async () => {
    const { business } = fixture()
    const first = await run(business, 5, 'assign', {
      employeeId: 'demo-employee',
      shiftId: 'standard',
      startDate: '2030-02-01',
      endDate: '2030-02-10',
    })
    await expect(
      run(business, 5, 'assign', {
        employeeId: 'demo-employee',
        shiftId: 'standard',
        startDate: '2030-02-10',
        endDate: '2030-02-15',
      }),
    ).rejects.toMatchObject({ status: 409 })
    await expect(
      run(business, 5, 'assign', {
        employeeId: 'demo-employee',
        shiftId: 'standard',
        startDate: '2030-02-30',
      }),
    ).rejects.toMatchObject({ status: 422 })
    await expect(
      business.execute(
        'BF-005',
        'close',
        { recordId: first.id, endDate: '2030-02-05', reason: 'Close dated assignment.' },
        commandKey(),
        { [first.id]: 99 },
      ),
    ).rejects.toMatchObject({ status: 412 })
    expect(
      (
        await run(business, 5, 'close', {
          recordId: first.id,
          endDate: '2030-02-05',
          reason: 'Close dated assignment.',
        })
      ).status,
    ).toBe('CLOSED')
  })
  it('records exact ledger changes once, rejects overdraft and blocks unresolved pending rollover', async () => {
    const { business, core } = fixture()
    const before = (await core.balances()).items[0]!.available
    const body = {
      employeeId: 'demo-employee',
      type: 'Annual leave',
      year: new Date().getFullYear(),
      days: 1.5,
      reason: 'Additional entitled leave.',
    }
    const key = commandKey()
    await run(business, 18, 'adjust', body, key)
    await run(business, 18, 'adjust', body, key)
    expect((await core.balances()).items[0]!.available).toBe(before + 1.5)
    expect(
      (await business.snapshot('BF-018')).items.find(
        (x) => x.status === 'BALANCE' && x.details.type === 'Annual leave',
      )!.details.available,
    ).toBe(before + 1.5)
    await expect(run(business, 18, 'adjust', { ...body, days: -365 })).rejects.toMatchObject({
      status: 422,
    })
    await expect(
      run(business, 19, 'preview', {
        employeeId: 'demo-employee',
        year: new Date().getFullYear(),
        targetYear: new Date().getFullYear() + 1,
        carryCap: 5,
        reason: 'Explicit cap for preview.',
      }),
    ).rejects.toMatchObject({ status: 409 })
  })
  it('supports half days, draft editing, history and future approved cancellation', async () => {
    const { core, demo } = fixture('EMPLOYEE')
    const leave = await core.create('leaves', {
      type: 'Medical leave',
      portion: 'MORNING',
      startDate: '2030-02-04',
      endDate: '2030-02-04',
      reason: 'Half-day medical appointment.',
    })
    expect(leave.days).toBe(0.5)
    demo.setRole('MANAGER')
    await core.change('leaves', leave.id, 'approve', 1)
    demo.setRole('EMPLOYEE')
    await core.change('leaves', leave.id, 'cancel', 2)
    expect((await core.detail('leaves', leave.id)).row.status).toBe('CANCELLED')
    const draft = await core.create('requests', {
      title: 'Original draft',
      type: 'General',
      quantity: 1,
      reason: 'Initial request reason.',
    })
    const edited = await core.update('requests', draft.id, 1, {
      title: 'Updated draft',
      type: 'General',
      quantity: 1,
      reason: 'Updated request reason.',
    })
    expect(edited.title).toBe('Updated draft')
    await core.change('requests', draft.id, 'submit', 2)
    await expect(
      core.update('requests', draft.id, 3, {
        title: 'Cannot edit',
        type: 'General',
        quantity: 1,
        reason: 'Invalid submitted edit.',
      }),
    ).rejects.toMatchObject({ status: 409 })
  })
  it('guards partial fulfillment and decrements stock without over-issuing', async () => {
    const { business, core, demo } = fixture('EMPLOYEE')
    const row = await core.create('requests', {
      title: 'Two monitors',
      type: 'Equipment',
      quantity: 2,
      reason: 'Monitors for a team desk.',
    })
    await core.change('requests', row.id, 'submit', 1)
    demo.setRole('MANAGER')
    await core.change('requests', row.id, 'approve', 2)
    demo.setRole('HR_ADMIN')
    const before = (await core.detail('materials', 'monitor')).row.quantity!
    await run(business, 25, 'fulfill', {
      recordId: row.id,
      materialId: 'monitor',
      quantity: 1,
      reason: 'First monitor issued.',
    })
    expect((await core.detail('requests', row.id)).row.status).toBe('APPROVED')
    await run(business, 25, 'fulfill', {
      recordId: row.id,
      materialId: 'monitor',
      quantity: 1,
      reason: 'Second monitor issued.',
    })
    expect((await core.detail('requests', row.id)).row.status).toBe('FULFILLED')
    expect((await core.detail('materials', 'monitor')).row.quantity).toBe(before - 2)
    await expect(
      run(business, 25, 'fulfill', {
        recordId: row.id,
        materialId: 'monitor',
        quantity: 1,
        reason: 'Cannot issue a third.',
      }),
    ).rejects.toMatchObject({ status: 409 })
  })
})
describe('evidence, files and technical boundaries', () => {
  it('confirms inference only once and preserves the review history', async () => {
    const { business } = fixture('EMPLOYEE')
    const first = (await business.snapshot('BF-011')).items[0]!
    await run(business, 11, 'confirm', { recordId: first.id })
    expect((await business.snapshot('BF-011')).items[0]!.status).toBe('CONFIRMED')
    await expect(
      run(business, 11, 'reject', { recordId: first.id, reason: 'Already confirmed.' }),
    ).rejects.toMatchObject({ status: 409 })
  })
  it('checks private file content, size and parent ownership', async () => {
    const { business, core } = fixture('EMPLOYEE')
    const req = await core.create('requests', {
      title: 'A private document',
      type: 'General',
      quantity: 1,
      reason: 'Please review attached evidence.',
    })
    await expect(
      business.upload(
        'request',
        req.id,
        new File(['malicious'], 'test.pdf', { type: 'application/pdf' }),
      ),
    ).rejects.toMatchObject({ status: 422 })
    const file = await business.upload(
      'request',
      req.id,
      new File(['%PDF-1.7\nexample'], 'test.pdf', { type: 'application/pdf' }),
    )
    expect(file.status).toBe('LOCAL_READY')
    expect((await business.snapshot('BF-026')).items).toHaveLength(1)
  })
  it('keeps scoring separate from attendance and blocks mock-location scoring', async () => {
    const { business, core } = fixture('OWNER')
    const before = await core.attendance()
    const row = await run(business, 32, 'score', {
      inGeofence: true,
      wifiConnected: true,
      usualDevice: true,
      mockLocation: true,
      ble: 3,
      movement: 20,
      interaction: 10,
      presentDays: 14,
    })
    expect(row.details.score).toBe(0)
    expect(row.details.attendanceCreated).toBe(false)
    expect(await core.attendance()).toEqual(before)
  })
  it('shows queued jobs before completion and never calls real operators', async () => {
    vi.useFakeTimers()
    try {
      const { business } = fixture('OWNER')
      const row = await run(business, 31, 'simulate', {
        checkpoint: 'a-known-offset',
        reason: 'Rebuild demo projection.',
      })
      expect(row.status).toBe('QUEUED')
      vi.advanceTimersByTime(1500)
      const result = (await business.snapshot('BF-031')).items[0]!
      expect(result.status).toBe('COMPLETED')
      expect(result.details.productionChanged).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
  it('never substitutes preview data in remote mode', async () => {
    const core = {
      mode: 'remote',
      profile: async () => ({
        roles: ['OWNER'],
        tenantId: 't',
        employeeId: 'e',
        userId: 'u',
        name: 'Owner',
        locale: 'en',
        timeZone: 'UTC',
      }),
    } as unknown as WorkspaceApi
    await expect(new BusinessApi(core, () => {}).snapshot('BF-003')).rejects.toMatchObject({
      status: 501,
      code: 'CONTRACT_REQUIRED',
    })
  })
})

it('uses an explicitly supplied accepted adapter in remote mode without changing the screens', async () => {
  const core = {
    mode: 'remote',
    profile: async () => ({
      roles: ['OWNER'],
      tenantId: 't',
      employeeId: 'e',
      userId: 'u',
      name: 'Owner',
      locale: 'en',
      timeZone: 'UTC',
    }),
  } as unknown as WorkspaceApi
  let reads = 0
  const port = {
    snapshot: async () => {
      reads++
      return { items: [], references: [], note: 'Accepted server contract' }
    },
    execute: async () => {
      throw new Error('Unused')
    },
    upload: async () => {
      throw new Error('Unused')
    },
    download: async () => {},
    clear: () => {},
  }
  const api = new BusinessApi(core, () => {}, port)
  expect((await api.snapshot('BF-003')).note).toBe('Accepted server contract')
  expect(reads).toBe(1)
})

it('serializes competing entitlement adjustments so an overdraw cannot pass twice', async () => {
  const { core } = fixture()
  const before = (await core.balances()).items[0]!.available
  const body = {
    employeeId: 'demo-employee',
    type: 'Annual leave',
    year: new Date().getFullYear(),
    days: -Math.ceil(before * 0.75),
    reason: 'Concurrent adjustment test.',
  }
  const outcomes = await Promise.allSettled([
    core.adjustBalance({ ...body, reason: 'First competing adjustment.' }),
    core.adjustBalance({ ...body, reason: 'Second competing adjustment.' }),
  ])
  expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
  expect((await core.balances()).items[0]!.available).toBeGreaterThanOrEqual(0)
})

it('rejects late old-account results and never grants operator execution to a tenant owner', async () => {
  const core = {
    mode: 'remote',
    profile: async () => ({
      roles: ['OWNER'],
      tenantId: 't',
      employeeId: 'e',
      userId: 'u',
      name: 'Owner',
      locale: 'en',
      timeZone: 'UTC',
    }),
  } as unknown as WorkspaceApi
  let resolve!: (value: { items: []; references: []; note: string }) => void
  let calls = 0
  let ready!: () => void
  const started = new Promise<void>((r) => {
    ready = r
  })
  const port = {
    snapshot: () =>
      new Promise<{ items: []; references: []; note: string }>((r) => {
        resolve = r
        ready()
      }),
    execute: async () => {
      calls++
      throw new Error('Must not execute')
    },
    upload: async () => {
      throw new Error('Unused')
    },
    download: async () => {},
    clear: () => {},
  }
  const api = new BusinessApi(core, () => {}, port)
  await expect(
    api.execute(
      'BF-035',
      'simulate',
      { recordId: 'event', reason: 'Not a valid operator grant' },
      commandKey(),
    ),
  ).rejects.toMatchObject({ status: 403, code: 'OPERATOR_CONTRACT_REQUIRED' })
  expect(calls).toBe(0)
  const pending = api.snapshot('BF-003')
  await started
  api.clear()
  resolve({ items: [], references: [], note: 'Old account data' })
  await expect(pending).rejects.toMatchObject({ code: 'SESSION_CHANGED' })
})

it('rejects impossible calendar dates, whitespace-only names and invalid clock times', async () => {
  const { leaveForm, correctionForm } = await import('../../app/schemas/forms')
  expect(
    leaveForm.safeParse({
      type: 'Annual leave',
      startDate: '2030-02-30',
      endDate: '2030-02-30',
      reason: 'Invalid date request.',
    }).success,
  ).toBe(false)
  expect(
    correctionForm.safeParse({ date: '2026-02-29', reason: 'Invalid non-leap date.' }).success,
  ).toBe(false)
  const { business } = fixture('OWNER')
  await expect(
    run(business, 3, 'create', {
      name: '   ',
      ownerEmail: 'owner@example.test',
      timeZone: 'Asia/Phnom_Penh',
    }),
  ).rejects.toMatchObject({ status: 422 })
  await expect(
    run(business, 10, 'evaluate', {
      workDate: '2030-02-04',
      confidence: 0.9,
      clockIn: '99:99',
      clockOut: '99:99',
    }),
  ).rejects.toMatchObject({ status: 422 })
})

it('applies at most one concurrent carry-over for an employee and source year', async () => {
  const { core, business } = fixture('HR_ADMIN')
  for (const row of (await core.list('myLeaves')).items.filter((x) => x.status === 'PENDING'))
    await core.change('leaves', row.id, 'cancel', row.version)
  const year = new Date().getFullYear()
  const body = {
    employeeId: 'demo-employee',
    year,
    targetYear: year + 1,
    carryCap: 5,
    reason: 'Explicit carry cap reviewed.',
  }
  const first = await run(business, 19, 'preview', body)
  const second = await run(business, 19, 'preview', {
    ...body,
    reason: 'Second preview of the same year.',
  })
  const snapshot = await business.snapshot('BF-019')
  const versions = Object.fromEntries(snapshot.items.map((x) => [x.id, x.version]))
  const results = await Promise.allSettled([
    business.execute(
      'BF-019',
      'commit',
      { recordId: first.id, reason: 'Apply first reviewed preview.' },
      commandKey(),
      versions,
    ),
    business.execute(
      'BF-019',
      'commit',
      { recordId: second.id, reason: 'Apply second reviewed preview.' },
      commandKey(),
      versions,
    ),
  ])
  expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
  expect(
    (await core.balances(year + 1, 'demo-employee')).items.find((x) => x.type === 'Annual leave')!
      .available,
  ).toBe(20)
})
