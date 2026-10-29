<script setup lang="ts">
import type { EntityRow } from '~/types/workspace'
import { titleCase } from '~/utils/format'

const props = defineProps<{ row: EntityRow; kind: 'leave' | 'request' }>()
const context = computed<Record<string, unknown>>(() =>
  props.row.reviewContext && typeof props.row.reviewContext === 'object'
    ? (props.row.reviewContext as Record<string, unknown>)
    : {},
)
const teamMembers = computed(() =>
  Array.isArray(context.value.teamMembersOff)
    ? context.value.teamMembersOff.filter((value): value is string => typeof value === 'string')
    : [],
)
const materials = computed(() =>
  Array.isArray(context.value.materials)
    ? context.value.materials.filter(
        (value): value is Record<string, unknown> => !!value && typeof value === 'object',
      )
    : [],
)
const steps = computed(() =>
  Array.isArray(context.value.steps)
    ? context.value.steps.filter(
        (value): value is Record<string, unknown> => !!value && typeof value === 'object',
      )
    : [],
)
const hasContext = computed(() => Object.keys(context.value).length > 0)
</script>

<template>
  <section v-if="hasContext" class="review-context" aria-labelledby="review-context-title">
    <div class="section-heading">
      <div>
        <h2 id="review-context-title">Decision context</h2>
        <p>Review the business effect before recording a decision.</p>
      </div>
    </div>
    <dl v-if="kind === 'leave'" class="detail-list">
      <div>
        <dt>Chargeable time</dt>
        <dd>{{ context.chargeableDays ?? 'Not provided' }} days</dd>
      </div>
      <div>
        <dt>Balance after approval</dt>
        <dd>{{ context.balanceAfter ?? 'Not provided' }} days</dd>
      </div>
      <div>
        <dt>Team members off</dt>
        <dd>
          {{
            teamMembers.length
              ? teamMembers.join(', ')
              : Array.isArray(context.teamMembersOff)
                ? 'No overlapping approved leave'
                : 'Not provided'
          }}
        </dd>
      </div>
    </dl>
    <div v-if="kind === 'request' && materials.length" class="context-list">
      <article v-for="(material, index) in materials" :key="index" class="activity-item">
        <span class="activity-dot" />
        <div>
          <strong>{{ material.name || 'Material' }}</strong>
          <p>
            {{ material.requested ?? '—' }} requested · {{ material.stockAvailable ?? '—' }} in
            stock
          </p>
        </div>
      </article>
    </div>
    <div v-if="steps.length || context.nextReviewer" class="context-list">
      <article v-for="(step, index) in steps" :key="index" class="activity-item">
        <span class="activity-dot" />
        <div>
          <strong>{{ step.actor || 'Reviewer' }}</strong>
          <p>{{ titleCase(String(step.action || step.status || 'completed')) }}</p>
        </div>
      </article>
      <p v-if="context.nextReviewer" class="small-note">
        Next reviewer: {{ context.nextReviewer }}
      </p>
    </div>
  </section>
</template>
