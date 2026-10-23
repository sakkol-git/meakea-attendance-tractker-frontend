export interface WorkflowField {
  key: string
  label: string
  type: 'text' | 'email' | 'date' | 'time' | 'number' | 'select' | 'textarea' | 'checkbox'
  options?: string[]
  min?: number
  max?: number
  step?: number
  required?: boolean
  help?: string
}
export interface WorkflowAction {
  key: string
  label: string
  fields: WorkflowField[]
  warning?: string
}
const text = (key: string, label: string, type: WorkflowField['type'] = 'text'): WorkflowField => ({
  key,
  label,
  type,
  required: true,
})
const select = (key: string, label: string, options: string[]): WorkflowField => ({
  ...text(key, label, 'select'),
  options,
})
const number = (key: string, label: string, min = 0, max = 1000000, step = 1): WorkflowField => ({
  ...text(key, label, 'number'),
  min,
  max,
  step,
})
const reason = text('reason', 'Reason and supporting context', 'textarea')
const employee = text('employeeId', 'Employee reference')
const workDate = text('workDate', 'Work date', 'date')
const year = number('year', 'Year', 2000, 2200)
const actions: Record<number, WorkflowAction[]> = {
  2: [
    { key: 'rotate', label: 'Preview refresh rotation', fields: [] },
    {
      key: 'reuse',
      label: 'Simulate old refresh reuse',
      fields: [],
      warning: 'This revokes the synthetic token family only. No real token is shown or changed.',
    },
  ],
  3: [
    {
      key: 'create',
      label: 'Create demo company',
      fields: [
        text('name', 'Company name'),
        text('ownerEmail', 'Initial owner email', 'email'),
        text('timeZone', 'IANA time zone'),
      ],
    },
  ],
  4: [
    {
      key: 'invite',
      label: 'Prepare account invitation',
      fields: [
        employee,
        text('email', 'Work email', 'email'),
        select('role', 'Assigned role', ['EMPLOYEE', 'MANAGER', 'HR_ADMIN']),
        text('managerId', 'Manager reference'),
      ],
      warning: 'Demo invitations remain local. No email is sent.',
    },
  ],
  5: [
    {
      key: 'assign',
      label: 'Assign a shift',
      fields: [
        employee,
        text('shiftId', 'Shift reference'),
        text('startDate', 'Effective from', 'date'),
        { ...text('endDate', 'Effective through', 'date'), required: false },
      ],
    },
    {
      key: 'close',
      label: 'Close an assignment',
      fields: [
        text('recordId', 'Assignment reference'),
        text('endDate', 'Final effective date', 'date'),
        reason,
      ],
    },
  ],
  9: [
    {
      key: 'capture',
      label: 'Record aggregate evidence',
      fields: [
        workDate,
        number('minutesInZone', 'Minutes in work zone', 0, 1440),
        number('wifiObservations', 'Wi-Fi observations', 0, 10000),
        number('bleObservations', 'BLE observations', 0, 10000),
        {
          key: 'consent',
          label: 'I consent to submitting these aggregate observations',
          type: 'checkbox',
          required: true,
        },
      ],
      warning:
        'Manual browser demonstration; no GPS track, Wi-Fi scan or sensor collection is performed.',
    },
  ],
  10: [
    {
      key: 'evaluate',
      label: 'Simulate inference proposal',
      fields: [
        workDate,
        number('confidence', 'Confidence score', 0, 1, 0.01),
        text('clockIn', 'Proposed arrival', 'time'),
        text('clockOut', 'Proposed departure', 'time'),
      ],
      warning:
        'Demo proposal only. Standalone scoring does not create attendance. Production thresholds and orchestration belong to the server.',
    },
  ],
  11: [
    {
      key: 'confirm',
      label: 'Confirm proposed session',
      fields: [text('recordId', 'Proposal reference')],
    },
    {
      key: 'reject',
      label: 'Reject proposed session',
      fields: [text('recordId', 'Proposal reference'), reason],
    },
  ],
  13: [
    {
      key: 'inspect',
      label: 'Review employee-day calculation',
      fields: [workDate],
      warning:
        'Calculations are a demo preview. Unknown cutoff, break, DST and conflict policies cannot be silently finalized.',
    },
  ],
  17: [
    {
      key: 'cancelApproved',
      label: 'Cancel future approved leave',
      fields: [text('recordId', 'Leave request reference'), reason],
      warning:
        'Only whole, future approved requests can be cancelled in this preview. Partial/retroactive policy remains explicitly unresolved.',
    },
  ],
  18: [
    {
      key: 'adjust',
      label: 'Record entitlement adjustment',
      fields: [
        employee,
        select('type', 'Leave type', ['Annual leave', 'Medical leave', 'Personal leave']),
        year,
        number('days', 'Adjustment in days', -365, 365, 0.5),
        reason,
      ],
    },
  ],
  19: [
    {
      key: 'preview',
      label: 'Preview carry-over',
      fields: [
        employee,
        year,
        number('targetYear', 'Target year', 2001, 2201),
        number('carryCap', 'Explicit carry cap (days)', 0, 365, 0.5),
        reason,
      ],
      warning:
        'No default carry policy is assumed. Pending leave blocks the preview until an approved settlement policy exists.',
    },
    {
      key: 'commit',
      label: 'Apply reviewed demo carry-over',
      fields: [text('recordId', 'Preview reference'), reason],
    },
  ],
  20: [
    {
      key: 'resolve',
      label: 'Record conflict review',
      fields: [
        text('recordId', 'Conflict reference'),
        select('resolution', 'Reviewed interpretation', [
          'RETAIN_APPROVED_LEAVE',
          'REFER_FOR_MANUAL_REVIEW',
        ]),
        reason,
      ],
      warning:
        'The original evidence and leave remain visible. This does not silently choose unresolved production payroll precedence.',
    },
  ],
  22: [
    {
      key: 'chain',
      label: 'Preview approval routing',
      fields: [
        text('recordId', 'Request reference'),
        select('chain', 'Explicit demo approval chain', ['MANAGER', 'MANAGER_THEN_HR']),
      ],
      warning:
        'Actual approver membership must come from the server; the client cannot grant itself decision rights.',
    },
  ],
  25: [
    {
      key: 'fulfill',
      label: 'Record material issue',
      fields: [
        text('recordId', 'Approved request reference'),
        text('materialId', 'Material reference'),
        number('quantity', 'Quantity to issue', 1, 1000),
        reason,
      ],
    },
  ],
  27: [
    {
      key: 'retry',
      label: 'Simulate delivery retry',
      fields: [text('recordId', 'Delivery reference')],
      warning: 'A demo retry never sends email, push notifications or messages.',
    },
  ],
  28: [
    {
      key: 'preferences',
      label: 'Save category preferences',
      fields: [
        select('category', 'Notification category', [
          'ATTENDANCE',
          'LEAVE',
          'REQUESTS',
          'SECURITY',
        ]),
        { key: 'email', label: 'Email updates', type: 'checkbox' },
        { key: 'inApp', label: 'In-app updates', type: 'checkbox' },
        { ...text('quietStart', 'Quiet hours start', 'time'), required: false },
        { ...text('quietEnd', 'Quiet hours end', 'time'), required: false },
      ],
    },
  ],
  29: [
    {
      key: 'query',
      label: 'Run bounded report query',
      fields: [
        text('startDate', 'From date', 'date'),
        text('endDate', 'Through date', 'date'),
        { ...employee, required: false },
      ],
    },
  ],
  30: [
    {
      key: 'export',
      label: 'Prepare CSV export',
      fields: [text('startDate', 'From date', 'date'), text('endDate', 'Through date', 'date')],
    },
    {
      key: 'cancel',
      label: 'Cancel pending export',
      fields: [text('recordId', 'Export reference')],
    },
  ],
  31: [
    {
      key: 'simulate',
      label: 'Simulate projection rebuild',
      fields: [text('checkpoint', 'Authoritative checkpoint'), reason],
    },
  ],
  32: [
    {
      key: 'score',
      label: 'Calculate rules-only preview',
      fields: [
        { key: 'inGeofence', label: 'Inside geofence', type: 'checkbox' },
        { key: 'wifiConnected', label: 'Wi-Fi connected', type: 'checkbox' },
        { key: 'usualDevice', label: 'Usual device', type: 'checkbox' },
        { key: 'mockLocation', label: 'Mock location detected', type: 'checkbox' },
        number('ble', 'BLE beacons', 0, 100),
        number('movement', 'Movement observations', 0, 1000),
        number('interaction', 'Interaction observations', 0, 1000),
        number('presentDays', 'Present days out of last 14', 0, 14),
      ],
      warning:
        'Rules-only local preview based on the documented formula. This does not call the private worker or create attendance.',
    },
  ],
  34: [
    {
      key: 'simulate',
      label: 'Simulate offline training stages',
      fields: [
        number('samples', 'Synthetic samples', 60, 100000),
        text('labelSet', 'Label set / experiment reference'),
        reason,
      ],
    },
  ],
  35: [
    {
      key: 'simulate',
      label: 'Simulate outbox publication',
      fields: [text('recordId', 'Event reference'), reason],
    },
  ],
  36: [
    {
      key: 'simulate',
      label: 'Simulate quarantined-event retry',
      fields: [text('recordId', 'Quarantine reference'), reason],
    },
  ],
  37: [
    {
      key: 'simulate',
      label: 'Simulate cutoff catch-up',
      fields: [workDate, text('checkpoint', 'Scheduler checkpoint'), reason],
    },
  ],
  38: [
    {
      key: 'simulate',
      label: 'Simulate reference bootstrap',
      fields: [text('checkpoint', 'Trusted reference checkpoint'), reason],
    },
  ],
}
export const workflowActions = (n: number) => actions[n] ?? []
