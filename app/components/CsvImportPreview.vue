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
    <details v-if="invalidCount" class="form-review">
      <summary>Review {{ invalidCount }} row {{ invalidCount === 1 ? 'issue' : 'issues' }}</summary>
      <ul>
        <template v-for="(error, index) in rowErrors" :key="index"
          ><li v-if="error">Data row {{ index + 1 }}: {{ error }}</li></template
        >
      </ul>
      <p>Fix these rows in your CSV and choose the file again. Only valid rows will be imported.</p>
    </details>
    <div class="stats-pills" role="status">
      <span class="pill-total">Total: {{ rows.length }}</span>
      <span class="pill-valid">Valid: {{ validCount }}</span>
      <span v-if="invalidCount > 0" class="pill-invalid">Issues: {{ invalidCount }}</span>
    </div>

    <div class="preview-table-wrapper" tabindex="0" role="region" aria-label="CSV preview">
      <table class="preview-table">
        <caption class="small-note">
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

<style scoped>
.preview-section {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}
.stats-pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
.stats-pills span {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--surface-subtle);
}
.pill-invalid {
  color: var(--status-danger-text);
}
.preview-table-wrapper {
  overflow-x: auto;
  max-width: 100%;
}
.preview-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.preview-table caption {
  text-align: left;
  padding-bottom: var(--space-2);
}
.preview-table th,
.preview-table td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}
.table-more-hint {
  margin-top: var(--space-2);
}
</style>
