import type { Json, RecordData } from './source'

export function seedEmployees(original: RecordData): RecordData[] {
  return [
    {
      id: String(original.employeeId),
      name: String(original.name),
      email: 'dara@example.test',
      employeeNo: 'EMP-001',
      departmentId: 'engineering',
      positionId: 'engineer',
      department: 'Engineering',
      position: 'Software engineer',
      status: 'ACTIVE',
      version: 1,
    },
    {
      id: 'demo-manager',
      name: 'Chan Sopheak',
      email: 'sopheak@example.test',
      employeeNo: 'EMP-002',
      departmentId: 'engineering',
      positionId: 'manager',
      department: 'Engineering',
      position: 'Engineering manager',
      status: 'ACTIVE',
      version: 1,
    },
  ]
}

export function catalogName(rows: RecordData[] | undefined, id: Json | undefined): string {
  return String(rows?.find((row) => row.id === id)?.name ?? '')
}
