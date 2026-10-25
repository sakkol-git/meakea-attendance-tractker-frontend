<script setup lang="ts">
import type { EntityRow } from '~/types/workspace'
import { dateLabel } from '~/utils/format'

defineProps<{ history: NonNullable<EntityRow['history']> }>()
</script>

<template>
  <section v-if="history.some((event) => event.quantity)" aria-labelledby="material-history-title">
    <h2 id="material-history-title">Material issue history</h2>
    <article
      v-for="(event, index) in history.filter((item) => item.quantity)"
      :key="index"
      class="activity-item"
    >
      <span class="activity-dot" />
      <div>
        <strong
          >{{ event.materialName || event.materialId || 'Material' }} ·
          {{ event.quantity }} issued</strong
        >
        <p>
          {{ dateLabel(event.at, 'MMM d, yyyy, h:mm a') }} ·
          {{ event.issuedBefore ?? 0 }} previously issued ·
          {{ event.remainingAfter ?? '—' }} remaining · stock {{ event.stockBefore ?? '—' }} →
          {{ event.stockAfter ?? '—' }}
        </p>
        <p v-if="event.reason">{{ event.reason }}</p>
      </div>
    </article>
  </section>
</template>
