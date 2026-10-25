<script setup lang="ts">
import { dateLabel } from '~/utils/format'
import {
  buildCalendarMonthGrid,
  coverageLabel,
  isCoverageLow,
  type AbsenceEntry,
  type CalendarDay,
} from '~/utils/calendar'

const api = useWorkspace()
const leavesQuery = useWorkspaceQuery('calendar-leaves', () => api.list('leaves'))
const employeesQuery = useWorkspaceQuery('calendar-employees', () => api.list('employees'))
const holidaysQuery = useWorkspaceQuery('calendar-holidays', () => api.list('holidays'))
const departmentsQuery = useWorkspaceQuery('calendar-departments', () => api.list('departments'))

const selectedDepartment = ref<string>('ALL')
const coverageThreshold = ref(0.3)
const view = ref<'month' | 'list'>('month')
const selectedDay = ref<CalendarDay>()
const currentMonth = ref(new Date())

function prevMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1,
  )
}

function nextMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1,
  )
}

function resetToCurrent() {
  currentMonth.value = new Date()
}

const year = computed(() => currentMonth.value.getFullYear())
const month = computed(() => currentMonth.value.getMonth())

const monthTitle = computed(() => {
  return dateLabel(currentMonth.value.toISOString(), 'MMMM yyyy')
})

const holidaysMap = computed(() => {
  const map = new Map<string, string>()
  for (const h of holidaysQuery.data.value?.items || []) {
    if (h.date) map.set(String(h.date), String(h.name || 'Holiday'))
  }
  return map
})

const employeesMap = computed(() => {
  const map = new Map<string, { name: string; department?: string }>()
  for (const e of employeesQuery.data.value?.items || []) {
    map.set(e.id, {
      name: String(e.name),
      department: e.department ? String(e.department) : undefined,
    })
  }
  return map
})

const mappedAbsences = computed<AbsenceEntry[]>(() => {
  const allLeaves = leavesQuery.data.value?.items || []
  return allLeaves
    .filter((item) => item.status !== 'REJECTED' && item.status !== 'CANCELLED')
    .map((item) => {
      const emp = employeesMap.value.get(item.employeeId || '')
      const empName = item.employeeName || emp?.name || 'Employee'
      const dept = item.department || emp?.department
      return {
        id: item.id,
        employeeName: empName,
        department: dept,
        type: String(item.type || 'Leave'),
        status: String(item.status || 'PENDING'),
        portion: typeof item.portion === 'string' ? item.portion : undefined,
        startDate: String(item.startDate || ''),
        endDate: String(item.endDate || item.startDate || ''),
      }
    })
    .filter(
      (item) => selectedDepartment.value === 'ALL' || item.department === selectedDepartment.value,
    )
})

const calendarDays = computed(() =>
  buildCalendarMonthGrid(year.value, month.value, mappedAbsences.value, holidaysMap.value),
)
const teamSize = computed(
  () =>
    [...employeesMap.value.values()].filter(
      (employee) =>
        selectedDepartment.value === 'ALL' || employee.department === selectedDepartment.value,
    ).length,
)
const currentMonthDays = computed(() => calendarDays.value.filter((day) => day.isCurrentMonth))
function updateDayDialog(visible: boolean) {
  if (!visible) selectedDay.value = undefined
}
</script>

<template>
  <div class="calendar-shell">
    <div class="calendar-header">
      <div class="calendar-title-group">
        <h3 class="calendar-month-title">{{ monthTitle }}</h3>
        <div class="calendar-nav-buttons">
          <PButton
            icon="pi pi-chevron-left"
            size="small"
            text
            rounded
            aria-label="Previous month"
            @click="prevMonth"
          />
          <PButton label="Today" size="small" text @click="resetToCurrent" />
          <PButton
            icon="pi pi-chevron-right"
            size="small"
            text
            rounded
            aria-label="Next month"
            @click="nextMonth"
          />
        </div>
      </div>

      <div class="calendar-dept-filter">
        <label for="calendar-dept" class="calendar-dept-label">Department:</label>
        <PSelect
          input-id="calendar-dept"
          v-model="selectedDepartment"
          :options="[
            { label: 'All departments', value: 'ALL' },
            ...(departmentsQuery.data.value?.items || []).map((d) => ({
              label: d.name,
              value: d.name,
            })),
          ]"
          option-label="label"
          option-value="value"
          size="small"
        />
        <PSelect
          v-model="coverageThreshold"
          aria-label="Low coverage threshold"
          :options="[
            { label: 'Low at 20%', value: 0.2 },
            { label: 'Low at 30%', value: 0.3 },
            { label: 'Low at 40%', value: 0.4 },
          ]"
          option-label="label"
          option-value="value"
          size="small"
        />
      </div>
    </div>

    <div class="view-switcher" role="group" aria-label="Coverage view">
      <PButton
        label="Month"
        icon="pi pi-calendar"
        size="small"
        :outlined="view !== 'month'"
        @click="view = 'month'"
      />
      <PButton
        label="Accessible list"
        icon="pi pi-list"
        size="small"
        :outlined="view !== 'list'"
        @click="view = 'list'"
      />
    </div>

    <!-- Calendar Grid -->
    <div v-if="view === 'month'" class="calendar-grid-wrapper">
      <div class="calendar-grid">
        <!-- Header Days -->
        <div
          v-for="dayName in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
          :key="dayName"
          class="calendar-day-header"
        >
          {{ dayName }}
        </div>

        <!-- Cells -->
        <button
          v-for="cell in calendarDays"
          :key="cell.dateStr"
          type="button"
          class="calendar-cell"
          :class="{
            'is-other-month': !cell.isCurrentMonth,
            'is-weekend': cell.isWeekend,
            'coverage-low': isCoverageLow(cell, teamSize, coverageThreshold),
          }"
          :aria-label="`${dateLabel(`${cell.dateStr}T12:00:00Z`, 'MMMM d')}, ${coverageLabel(cell, teamSize, coverageThreshold)}`"
          @click="selectedDay = cell"
        >
          <div class="calendar-cell-top">
            <span class="calendar-day-number">
              {{ cell.dayNumber }}
            </span>
            <span
              v-if="cell.hasOverlap"
              class="status-badge calendar-overlap-badge"
              title="Multiple team members away on this day"
            >
              {{ cell.absences.length }} away
            </span>
          </div>

          <div v-if="cell.holidayName" class="calendar-holiday-badge">★ {{ cell.holidayName }}</div>

          <!-- Absences List -->
          <div
            v-for="absence in cell.absences"
            :key="absence.id"
            class="calendar-absence-pill"
            :class="absence.status === 'APPROVED' ? 'is-approved' : 'is-pending'"
            :title="`${absence.employeeName} (${absence.type}) · ${absence.status}`"
          >
            <strong>{{ absence.employeeName.split(' ')[0] }}</strong> ({{ absence.type }})
          </div>
        </button>
      </div>
    </div>
    <ul v-else class="coverage-day-list">
      <li v-for="cell in currentMonthDays" :key="cell.dateStr">
        <button type="button" @click="selectedDay = cell">
          <strong>{{ dateLabel(`${cell.dateStr}T12:00:00Z`, 'EEEE, MMMM d') }}</strong>
          <span>{{ coverageLabel(cell, teamSize, coverageThreshold) }}</span>
        </button>
      </li>
    </ul>
    <CoverageDayDialog
      :visible="!!selectedDay"
      :day="selectedDay"
      :team-size="teamSize"
      :threshold="coverageThreshold"
      @update:visible="updateDayDialog"
    />
  </div>
</template>
