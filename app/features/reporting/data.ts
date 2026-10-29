import { z } from 'zod'
import type { WorkspaceApi } from '../../api/workspace'
import { DataFailure } from '../../data/source'
import type { DataSource } from '../../data/source'
import { decode } from '../../schemas/contracts'
import { saveCsv } from '../../utils/download'

const SessionSummary = z.object({
  totalCount: z.number().int().nonnegative(),
  records: z.array(
    z.object({
      sessionId: z.string(),
      employeeId: z.string(),
      workDate: z.string(),
      status: z.string(),
      minutesWorked: z.number().int().nonnegative().nullable(),
      aggregateRevision: z.number().int().positive(),
      clockIn: z.string().nullable(),
      clockOut: z.string().nullable(),
      timezone: z.string().nullable(),
      source: z.string().nullable(),
    }),
  ),
})

export async function attendanceReport(source: DataSource, from?: string, to?: string) {
  return decode(
    SessionSummary,
    (
      await source.send({
        method: 'GET',
        path: '/reports/attendance/summary',
        query: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      })
    ).data,
  )
}

export async function downloadReportCsv(
  api: Pick<WorkspaceApi, 'exportReport' | 'exportStatus'>,
  source: DataSource,
  report: 'ATTENDANCE' | 'LEAVE',
  wait: (ms: number) => Promise<void>,
  demoExport?: () => Promise<string>,
) {
  let job = await api.exportReport({ report, format: 'CSV' })
  for (
    let attempt = 0;
    attempt < 10 && ['QUEUED', 'PENDING', 'RUNNING'].includes(job.status);
    attempt++
  ) {
    await wait(2000)
    job = await api.exportStatus(job.id)
  }
  if (['FAILED', 'CANCELLED'].includes(job.status))
    throw new DataFailure(0, 'EXPORT_FAILED', 'The export failed. Start a new export.')
  if (job.status !== 'COMPLETED')
    throw new DataFailure(0, 'EXPORT_PENDING', 'The export is not complete. Check again later.')
  if (demoExport) saveCsv(await demoExport(), 'hrflow-demo-leave.csv')
  else {
    const path = `/reports/exports/${encodeURIComponent(job.id)}/download`
    if (job.downloadUrl !== `/api/v1${path}`)
      throw new DataFailure(
        0,
        'INVALID_FILE_URL',
        'The export link does not match this private job.',
      )
    const result = await source.send({ method: 'GET', path, responseType: 'csv' })
    if (typeof result.data !== 'string') throw new Error('The export did not return CSV data.')
    saveCsv(result.data, `${job.id}.csv`)
  }
  return job
}
