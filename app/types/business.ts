import type { RecordData } from '../data/source'
export interface WorkflowRecord {
  id: string
  status: string
  version: number
  title: string
  createdAt: string
  details: RecordData
  history: { at: string; action: string; actor: string }[]
}
export interface WorkflowSnapshot {
  items: WorkflowRecord[]
  references: { id: string; name: string; version?: number; kind?: string }[]
  note: string
}

export interface BusinessPort {
  snapshot(id: string): Promise<WorkflowSnapshot>
  execute(
    id: string,
    action: string,
    values: RecordData,
    key: string,
    versions?: Record<string, number>,
  ): Promise<WorkflowRecord>
  upload(scope: 'leave' | 'request', ownerId: string, file: File): Promise<WorkflowRecord>
  download(id: string, recordId: string): Promise<void>
  clear(): void
}
