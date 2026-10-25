<script setup lang="ts">
const props = defineProps<{ page: number; size: number; total: number }>()
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)))
</script>

<template>
  <nav v-if="pages > 1" class="collection-pager" aria-label="Result pages">
    <PButton
      label="Previous"
      outlined
      :disabled="page === 0"
      @click="emit('update:page', page - 1)"
    />
    <span aria-live="polite">Page {{ page + 1 }} of {{ pages }}</span>
    <PButton
      label="Next"
      outlined
      :disabled="page + 1 >= pages"
      @click="emit('update:page', page + 1)"
    />
  </nav>
</template>
