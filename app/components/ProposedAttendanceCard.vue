<script setup lang="ts">
import { dateLabel, titleCase } from '~/utils/format'

defineProps<{
  workDate: string
  clockIn: string
  clockOut: string
  source: string
  busy: boolean
}>()
defineEmits<{ confirm: []; decline: [] }>()
</script>

<template>
  <section
    class="panel proposed-attendance"
    aria-labelledby="proposed-attendance-title"
    :aria-busy="busy"
  >
    <header class="proposal-heading">
      <span class="proposal-icon"><AppIcon name="clock" /></span>
      <div>
        <p class="proposal-eyebrow">ATTENDANCE REVIEW</p>
        <h2 id="proposed-attendance-title">Review your proposed workday</h2>
      </div>
      <span class="proposal-status">Awaiting your review</span>
    </header>
    <div class="proposal-content">
      <div class="proposal-details">
        <p class="proposal-date">{{ dateLabel(workDate, 'EEEE, MMM d, yyyy') }}</p>
        <dl class="proposal-times">
          <div>
            <dt>Proposed start</dt>
            <dd>{{ clockIn || '—' }}</dd>
          </div>
          <span class="proposal-arrow" aria-hidden="true">→</span>
          <div>
            <dt>Proposed finish</dt>
            <dd>{{ clockOut || '—' }}</dd>
          </div>
        </dl>
        <p class="proposal-source">
          <AppIcon name="info-circle" /> Source: {{ titleCase(source) }}
        </p>
      </div>
      <div class="proposal-decision">
        <p>Do these times match your workday?</p>
        <div class="proposal-actions">
          <PButton
            label="Confirm workday"
            icon="pi pi-check"
            :loading="busy"
            @click="$emit('confirm')"
          />
          <PButton
            label="Decline"
            severity="secondary"
            outlined
            :disabled="busy"
            @click="$emit('decline')"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.proposed-attendance {
  border-inline-start: 3px solid var(--teal);
}
.proposal-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.proposal-icon {
  display: grid;
  place-items: center;
  width: var(--control-height);
  height: var(--control-height);
  border-radius: var(--radius-md);
  background: var(--teal-light);
  color: var(--teal);
  flex-shrink: 0;
}
.proposal-eyebrow {
  font-size: var(--font-size-caption);
  font-weight: 650;
  letter-spacing: 0.08em;
}
.proposal-heading h2 {
  font-size: var(--font-size-title);
}
.proposal-status {
  margin-inline-start: auto;
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-caption);
  color: var(--status-warning-text);
  background: var(--status-warning-bg);
}
.proposal-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-6);
  margin-top: var(--space-6);
}
.proposal-details {
  min-width: 0;
}
.proposal-date {
  font-weight: 650;
  color: var(--text-primary);
}
.proposal-times {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  margin: var(--space-3) 0;
}
.proposal-times dt {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
}
.proposal-times dd {
  margin: 0;
  font-size: 28px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}
.proposal-arrow {
  color: var(--text-secondary);
}
.proposal-source {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--font-size-caption);
  overflow-wrap: anywhere;
}
.proposal-decision {
  display: grid;
  gap: var(--space-3);
}
.proposal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
@media (max-width: 640px) {
  .proposal-content {
    align-items: stretch;
    flex-direction: column;
  }
  .proposal-status {
    margin-inline-start: 0;
  }
  .proposal-actions > * {
    flex: 1;
  }
}
</style>
