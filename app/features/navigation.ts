import type { Role } from '../types/workspace'

export function workspaceNavigation(roles: Role[]) {
  const manages = roles.some((role) => ['MANAGER', 'HR_ADMIN', 'OWNER'].includes(role))
  const administers = roles.some((role) => ['HR_ADMIN', 'OWNER'].includes(role))
  return [
    { label: 'Overview', icon: 'home', to: '/', group: 'My work' },
    { label: 'Attendance', icon: 'clock', to: '/attendance', group: 'My work' },
    { label: 'Leave', icon: 'sun', to: '/leave', group: 'My work' },
    { label: 'Requests', icon: 'briefcase', to: '/requests', group: 'My work' },
    { label: 'Tasks', icon: 'th-large', to: '/workflows', group: 'My work' },
    ...(manages
      ? [
          { label: 'Approvals', icon: 'check-square', to: '/approvals', group: 'Team' },
          { label: 'People', icon: 'users', to: '/people', group: 'Team' },
        ]
      : []),
    ...(administers
      ? [{ label: 'Organization', icon: 'sitemap', to: '/organization', group: 'Administration' }]
      : []),
    ...(roles.includes('OWNER')
      ? [{ label: 'Audit', icon: 'history', to: '/audit', group: 'Administration' }]
      : []),
    ...(manages
      ? [{ label: 'Reports', icon: 'chart-bar', to: '/reports', group: 'Administration' }]
      : []),
  ]
}

export function workspaceGroups(roles: Role[]) {
  const items = workspaceNavigation(roles)
  return ['My work', 'Team', 'Administration']
    .map((label) => ({ label, items: items.filter((item) => item.group === label) }))
    .filter((group) => group.items.length > 0)
}
