<script setup lang="ts">
import type { QrHistoryEntry } from '~/composables/useQrHistory'

const emit = defineEmits<{ restore: [entry: QrHistoryEntry] }>()

const { entries, remove, clear } = useQrHistory()

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
</script>

<template>
  <ClientOnly>
    <div v-if="entries.length === 0" class="py-8 text-center">
      <p class="text-sm text-muted">
        Codes you download show up here
      </p>
    </div>
    <div v-else class="flex flex-col gap-1">
      <div class="mb-1 flex items-center justify-between">
        <p class="text-xs text-muted">
          {{ entries.length }} saved on this device
        </p>
        <UButton
          label="Clear all"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="clear()"
        />
      </div>
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="group flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-elevated transition-colors"
      >
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-3 text-start"
          @click="emit('restore', entry)"
        >
          <img
            :src="entry.thumb"
            alt=""
            class="size-11 shrink-0 rounded-md border border-default"
          >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-highlighted">{{ entry.options.data }}</span>
            <span class="block text-xs text-muted">{{ timeAgo(entry.createdAt) }}</span>
          </span>
        </button>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          class="lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          :aria-label="`Delete ${entry.options.data}`"
          @click="remove(entry.id)"
        />
      </div>
    </div>
  </ClientOnly>
</template>
