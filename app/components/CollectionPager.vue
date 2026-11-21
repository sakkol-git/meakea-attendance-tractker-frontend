<script setup lang="ts">
const props = defineProps<{ page: number; size: number; total: number }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)))
</script>

<template>
  <nav v-if="pages > 1" class="collection-pager" aria-label="Result pages">
    <PButton
      type="button"
      label="Previous"
      outlined
      :disabled="page === 0"
      @click="emit('update:page', page - 1)"
    />
    <span aria-live="polite"
      >Page {{ page + 1 }} of {{ pages }} · Results {{ Math.min(page * size + 1, total) }}–{{
        Math.min((page + 1) * size, total)
      }}
      of {{ total }}</span
    >
    <PButton
      type="button"
      label="Next"
      outlined
      :disabled="page + 1 >= pages"
      @click="emit('update:page', page + 1)"
    />
  </nav>
</template>
