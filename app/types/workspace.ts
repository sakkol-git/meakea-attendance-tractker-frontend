// Type-only public models. Runtime validation belongs to the API boundary.
export type {
  Role,
  UserProfile,
  EntityRow,
  AttendanceRow,
  NoticeRow,
  PreferenceValues,
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
