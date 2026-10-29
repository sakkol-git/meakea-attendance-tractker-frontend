import { describe, expect, it } from 'vitest'
import type { Role } from '../../app/types/workspace'
import { workspaceNavigation, workspaceGroups } from '../../app/features/navigation'
import { taskWorkflows, workspaceTasks } from '../../app/features/workflows/tasks'

const computeNavigation = (role: Role) => workspaceNavigation([role])

describe('Workspace navigation', () => {
  it('remote tasks open implemented feature pages instead of provisional workflow endpoints', () => {
    const tasks = workspaceTasks(['EMPLOYEE'], 'remote')
    expect(tasks.map((task) => task.to)).toContain('/leave')
    expect(tasks.every((task) => !task.to.startsWith('/workflows/'))).toBe(true)
    expect(tasks.some((task) => task.to === '/organization')).toBe(false)
    expect(workspaceTasks(['HR_ADMIN'], 'remote').map((task) => task.to)).toContain('/reports')
  })
  it('employee role only sees employee-eligible navigation items', () => {
    const nav = computeNavigation('EMPLOYEE')
    const labels = nav.map((item) => item.label)

    expect(labels).toEqual(['Overview', 'Attendance', 'Leave', 'Requests', 'Tasks'])
    expect(labels).not.toContain('Approvals')
    expect(labels).not.toContain('People')
    expect(labels).not.toContain('Organization')
    expect(labels).not.toContain('Audit')
    expect(labels).not.toContain('Reports')
  })

  it('groups eligible tasks without exposing implementation processes', () => {
    expect(workspaceGroups(['EMPLOYEE']).map((group) => group.label)).toEqual(['My work'])
    expect(workspaceGroups(['HR_ADMIN']).map((group) => group.label)).toEqual([
      'My work',
      'Team',
      'Administration',
    ])
    const employee = taskWorkflows(['EMPLOYEE'])
    expect(employee.map((task) => task.title)).toContain('My schedule')
    expect(
      employee.some((task) => /token|outbox|inbox consumption|scoring|training/i.test(task.title)),
    ).toBe(false)
    expect(employee.some((task) => task.id === 'BF-018')).toBe(false)
    expect(taskWorkflows(['HR_ADMIN']).some((task) => task.id === 'BF-018')).toBe(true)
  })

  it('manager role sees approvals, people and reports', () => {
    const nav = computeNavigation('MANAGER')
    const labels = nav.map((item) => item.label)

    expect(labels).toContain('Approvals')
    expect(labels).toContain('People')
    expect(labels).toContain('Reports')
    expect(labels).not.toContain('Organization')
    expect(labels).not.toContain('Audit')
  })

  it('HR admin sees organization tools and owner sees audit', () => {
    const nav = computeNavigation('HR_ADMIN')
    const labels = nav.map((item) => item.label)

    expect(labels).toContain('Organization')
    expect(labels).not.toContain('Audit')
    expect(computeNavigation('OWNER').map((item) => item.label)).toContain('Audit')
    expect(labels).toContain('Approvals')
    expect(labels).toContain('People')
    expect(labels).toContain('Reports')
  })
})
