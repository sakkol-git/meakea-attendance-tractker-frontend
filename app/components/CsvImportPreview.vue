<script setup lang="ts">
defineProps<{
  rows: Record<string, string>[]
  headers: string[]
  rowErrors: string[]
  validCount: number
  invalidCount: number
}>()
</script>
<template>
  <!-- Preview Section -->
  <div v-if="rows.length > 0" class="preview-section">
    <div class="stats-pills">
      <span class="pill-total">Total: {{ rows.length }}</span>
      <span class="pill-valid">Valid: {{ validCount }}</span>
      <span v-if="invalidCount > 0" class="pill-invalid">Issues: {{ invalidCount }}</span>
    </div>

    <div class="preview-table-wrapper" tabindex="0" role="region" aria-label="CSV preview">
      <table class="preview-table">
        <caption class="sr-only">
          Preview: first five rows and first four columns of the selected CSV file
        </caption>
        <thead>
          <tr>
            <th scope="col" class="col-index">#</th>
            <th scope="col" v-for="h in headers.slice(0, 4)" :key="h">{{ h }}</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in rows.slice(0, 5)"
            :key="idx"
            :class="{ 'row-issue': Boolean(rowErrors[idx]) }"
          >
            <td>{{ idx + 1 }}</td>
            <td v-for="h in headers.slice(0, 4)" :key="h">
              {{ row[h] || '—' }}
            </td>
            <td>
              <span v-if="rowErrors[idx]" class="status-pill issue">
                {{ rowErrors[idx] }}
              </span>
              <span v-else class="status-pill ok">Valid</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="rows.length > 5" class="table-more-hint">...and {{ rows.length - 5 }} more rows</p>
    </div>
  </div>
</template>
