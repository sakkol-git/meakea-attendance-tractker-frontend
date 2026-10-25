<script setup lang="ts">
import { initials } from '~/utils/format'
import { matchesQuery } from '~/utils/filter'

interface OrgNode {
  id: string
  name: string
  department?: string
  position?: string
  manager?: string
  children: OrgNode[]
  collapsed: boolean
}

const api = useWorkspace()
const employeesQuery = useWorkspaceQuery('orgchart-employees', () => api.list('employees'))
const search = ref('')

const rawEmployees = computed(() => employeesQuery.data.value?.items || [])

const tree = computed<OrgNode[]>(() => {
  const list = rawEmployees.value
  if (!list.length) return []

  // Create node lookup map
  const map = new Map<string, OrgNode>()
  for (const emp of list) {
    if (!emp.name) continue
    map.set(emp.name, {
      id: emp.id,
      name: String(emp.name),
      department: emp.department ? String(emp.department) : undefined,
      position: emp.position ? String(emp.position) : undefined,
      manager: emp.manager ? String(emp.manager) : undefined,
      children: [],
      collapsed: false,
    })
  }

  // Build tree
  const roots: OrgNode[] = []
  for (const node of map.values()) {
    if (node.manager && map.has(node.manager) && node.manager !== node.name) {
      map.get(node.manager)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // If no hierarchy (all roots), pick first few managers as roots
  return roots
})

function toggleCollapse(node: OrgNode) {
  node.collapsed = !node.collapsed
}

function matchesSearch(node: OrgNode): boolean {
  return matchesQuery(
    node as unknown as Record<string, unknown>,
    ['name', 'position', 'department'],
    search.value,
  )
}
</script>

<template>
  <div class="org-chart-shell">
    <div class="org-chart-header">
      <div>
        <h3 class="org-chart-title">Organizational Hierarchy</h3>
        <small class="org-chart-subtitle">Visual reporting structure across all departments</small>
      </div>
      <div class="org-chart-search">
        <PInputText
          v-model="search"
          placeholder="Filter by person, position, or department…"
          size="small"
          class="org-chart-search-input"
        />
      </div>
    </div>

    <QueryState
      :pending="employeesQuery.isPending.value"
      :error="employeesQuery.error.value"
      :empty="!tree.length"
      title="No employees found"
      message="Add people to your workspace to generate an organization chart."
      @retry="employeesQuery.refetch()"
    >
      <div class="org-chart-canvas">
        <div class="org-chart-roots">
          <div v-for="rootNode in tree" :key="rootNode.id" class="org-tree-branch">
            <!-- Node Card -->
            <div
              class="org-node-card root-node panel"
              :class="{ 'is-faded': !matchesSearch(rootNode) }"
            >
              <span class="avatar org-node-avatar">
                {{ initials(rootNode.name) }}
              </span>
              <strong class="org-node-name">{{ rootNode.name }}</strong>
              <small class="org-node-position">
                {{ rootNode.position || 'Team Member' }}
              </small>
              <span v-if="rootNode.department" class="status-badge org-node-dept">
                {{ rootNode.department }}
              </span>

              <div v-if="rootNode.children.length" class="org-node-actions">
                <PButton
                  :icon="rootNode.collapsed ? 'pi pi-plus' : 'pi pi-minus'"
                  :label="`${rootNode.children.length} report${rootNode.children.length > 1 ? 's' : ''}`"
                  size="small"
                  text
                  @click="toggleCollapse(rootNode)"
                />
              </div>
            </div>

            <!-- Children Sub-tree -->
            <div v-if="rootNode.children.length && !rootNode.collapsed" class="org-children-tree">
              <div v-for="child in rootNode.children" :key="child.id" class="org-child-branch">
                <div
                  class="org-node-card child-node panel"
                  :class="{ 'is-faded': !matchesSearch(child) }"
                >
                  <span class="avatar org-node-avatar small">
                    {{ initials(child.name) }}
                  </span>
                  <strong class="org-node-name">{{ child.name }}</strong>
                  <small class="org-node-position">
                    {{ child.position || 'Team Member' }}
                  </small>
                  <span v-if="child.department" class="status-badge org-node-dept small">
                    {{ child.department }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </QueryState>
  </div>
</template>
