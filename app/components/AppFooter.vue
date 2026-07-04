<template>
  <footer class="border-t border-default">
    <div class="mx-auto flex h-12 max-w-5xl items-center justify-between gap-4 px-4 text-xs text-muted sm:px-6">
      <p class="truncate">
        Free forever · codes are generated on your device
      </p>
      <a
        :href="TIP_URL"
        target="_blank"
        rel="noopener"
        class="flex shrink-0 items-center gap-1.5 transition-colors hover:text-highlighted"
      >
        <UIcon name="i-lucide-coffee" class="size-3.5" />
        Tip jar
      </a>
    </div>
  </footer>
</template>
