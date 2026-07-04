<template>
  <header class="border-b border-default">
    <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <div class="grid size-7 place-items-center rounded-md bg-primary">
          <UIcon name="i-lucide-qr-code" class="size-4 text-inverted" />
        </div>
        <span class="text-sm font-semibold text-highlighted">Snuuy - QRMaker</span>
      </NuxtLink>
      <div class="flex items-center gap-1">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
