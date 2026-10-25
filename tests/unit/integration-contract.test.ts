import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/openapi.json', import.meta.url), 'utf8'),
) as {
  paths: Record<string, Record<string, unknown>>
  components: {
    schemas: Record<string, { properties?: Record<string, unknown> }>
    parameters: Record<string, unknown>
  }
}

describe('shared production integration inventory', () => {
  it('contains the shared workflow, delegation, draft and attachment routes', () => {
    expect(contract.paths['/workflows/{id}/snapshot']).toHaveProperty('get')
    expect(contract.paths['/workflows/{id}/actions/{action}']).toHaveProperty('post')
    expect(contract.paths['/approvals/delegations']).toMatchObject({ get: {}, post: {} })
    expect(contract.paths['/form-drafts/{kind}']).toMatchObject({ get: {}, put: {} })
    expect(contract.paths['/leave/requests/{id}/attachments/presign']).toHaveProperty('post')
    expect(contract.paths['/requests/{id}/attachments/presign']).toHaveProperty('post')
  })

  it('uses one login tenant field and one leave portion vocabulary', () => {
    const login = contract.components.schemas.AuthLoginRequest as {
      required: string[]
      properties: Record<string, unknown>
    }
    expect(login.required).toContain('tenant')
    expect(login.properties).not.toHaveProperty('tenantSlug')
    const leave = contract.components.schemas.CreateLeaveRequest as {
      properties: { portion: { enum: string[] } }
    }
    expect(leave.properties.portion.enum).toEqual(['FULL_DAY', 'MORNING', 'AFTERNOON'])
  })

  it('defines the shared asynchronous export and signed attachment payloads', () => {
    const exportRequest = contract.components.schemas.CreateExportRequest as {
      required: string[]
      properties: { report: { enum: string[] }; format: { enum: string[] } }
    }
    expect(exportRequest.required).toEqual(['report', 'format'])
    expect(exportRequest.properties.report.enum).toEqual(['ATTENDANCE', 'LEAVE', 'REQUESTS'])
    expect(exportRequest.properties.format.enum).toEqual(['CSV'])

    const attachment = contract.components.schemas.PresignAttachmentRequest as {
      required: string[]
      properties: { size: { maximum: number }; contentType: { enum: string[] } }
    }
    expect(attachment.required).toEqual(['fileName', 'contentType', 'size', 'sha256'])
    expect(attachment.properties.size.maximum).toBe(10 * 1024 * 1024)
    expect(attachment.properties.contentType.enum).toEqual([
      'application/pdf',
      'image/png',
      'image/jpeg',
    ])
  })

  it('defines zero-based page and bounded size for shared queues', () => {
    const page = contract.components.parameters.Page as { schema: { minimum: number } }
    const size = contract.components.parameters.Size as {
      schema: { minimum: number; maximum: number }
    }
    expect(page.schema.minimum).toBe(0)
    expect(size.schema).toMatchObject({ minimum: 1, maximum: 100 })
    for (const path of [
      '/employees',
      '/requests/inbox',
      '/leave/requests/pending',
      '/attendance/corrections',
    ]) {
      const get = contract.paths[path]?.get as { parameters?: { $ref: string }[] }
      const parameters = get.parameters?.map((parameter) => parameter.$ref)
      expect(parameters).toContain('#/components/parameters/Page')
      expect(parameters).toContain('#/components/parameters/Size')
      expect(parameters).toContain('#/components/parameters/Search')
      if (path !== '/employees') {
        expect(parameters).toContain('#/components/parameters/Status')
        expect(parameters).toContain('#/components/parameters/Sort')
        expect(parameters).toContain('#/components/parameters/MinAgeDays')
      }
    }
  })
})
