import type { Role } from '../../types/workspace'
import { workflows } from './catalog'
import { workspaceNavigation } from '../navigation'

// User tasks reuse the existing journeys. Transport and operator processes stay in the docs.
const taskLabels: Record<number, { title: string; purpose: string; roles?: Role[] }> = {
  5: { title: 'My schedule', purpose: 'View assigned shifts. HR can assign or close a schedule.' },
  13: {
    title: 'Review daily attendance',
    purpose: 'Review daily results and unresolved attendance.',
    roles: ['HR_ADMIN', 'OWNER'],
  },
  18: {
    title: 'Adjust leave balance',
    purpose: 'Review an employee’s balance and record a reason for any adjustment.',
    roles: ['HR_ADMIN', 'OWNER'],
  },
  19: {
    title: 'Review leave carry-over',
    purpose: 'Preview eligible leave before applying a carry-over.',
    roles: ['HR_ADMIN', 'OWNER'],
  },
  20: {
    title: 'Review leave and attendance conflicts',
    purpose: 'Review work recorded during approved leave.',
    roles: ['HR_ADMIN', 'OWNER'],
  },
  25: {
    title: 'Issue requested materials',
    purpose: 'Record the quantities supplied for an approved material request.',
    roles: ['HR_ADMIN', 'OWNER'],
  },
  26: {
    title: 'Manage private request files',
    purpose: 'Attach or download files for a request you can access.',
  },
  28: {
    title: 'Notification preferences',
    purpose: 'Choose optional updates and review required approval notices.',
  },
  30: {
    title: 'Download attendance reports',
    purpose: 'Track an export and download the completed private file.',
    roles: ['HR_ADMIN', 'OWNER'],
  },
}

export function taskWorkflows(roles: Role[]) {
  return workflows.flatMap((flow) => {
    const task = taskLabels[flow.number]
    if (!task || !(task.roles ?? flow.roles).some((role) => roles.includes(role))) return []
    return [{ ...flow, title: task.title, purpose: task.purpose }]
  })
}

export function workspaceTasks(roles: Role[], mode: 'local' | 'remote') {
  if (mode === 'local')
    return taskWorkflows(roles).map((task) => ({ ...task, to: `/workflows/${task.id}` }))
  const descriptions: Record<string, string> = {
    '/attendance': 'Review recorded sessions and request an attendance correction.',
    '/leave': 'Check your balances, request leave and follow approval progress.',
    '/requests': 'Create a workplace request and follow its decisions and files.',
    '/approvals': 'Review requests waiting for your decision.',
    '/people': 'Find employees and view their organization details.',
    '/organization': 'Manage departments, positions, shifts and company records.',
    '/reports': 'Review attendance results and download a private export.',
    '/audit': 'Review recorded organization activity.',
  }
  return workspaceNavigation(roles)
    .filter((item) => descriptions[item.to])
    .map((item) => ({
      id: item.to,
      to: item.to,
      title: item.label,
      group: item.group,
      purpose: descriptions[item.to]!,
    }))
}
