// Type-only public models. Runtime validation belongs to the API boundary.
export type {
  Role,
  UserProfile,
  EntityRow,
  AttendanceRow,
  NoticeRow,
  PreferenceValues,
  EmployeeRecord,
  DepartmentRecord,
  PositionRecord,
  WorkSiteRecord,
  LeaveRecord,
  ShiftRecord,
  HolidayRecord,
  DocumentRecord,
} from '../schemas/contracts'
export type Resource =
  | 'leaves'
  | 'myLeaves'
  | 'pendingLeaves'
  | 'requests'
  | 'myRequests'
  | 'pendingRequests'
  | 'corrections'
  | 'employees'
  | 'departments'
  | 'positions'
  | 'shifts'
  | 'holidays'
  | 'workSites'
  | 'materials'
