<script setup lang="ts">
import type { DotStyle } from '~/composables/useQrState'

const state = useQrState()

const dotStyles: { value: DotStyle, label: string, icon: string }[] = [
  { value: 'square', label: 'Square', icon: 'i-lucide-square' },
  { value: 'rounded', label: 'Rounded', icon: 'i-lucide-squircle' },
  { value: 'dots', label: 'Dots', icon: 'i-lucide-grip' },
]

const fgSwatches = ['#18181b', '#1e3a8a', '#065f46', '#7c2d12', '#581c87']
const bgSwatches = ['#ffffff', '#fafaf9', '#f0fdf4', '#eff6ff', '#fdf4ff']
const frameSwatches = ['#18181b', '#059669', '#2563eb', '#dc2626', '#7c3aed']

const fileInput = ref<HTMLInputElement>()

function onLogoPicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    state.value.logo = reader.result as string
  }
  reader.readAsDataURL(file)
  ;(event.target as HTMLInputElement).value = ''
}

function removeLogo() {
  state.value.logo = null
}

function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

const lowContrast = computed(() => {
  const [l1, l2] = [luminance(state.value.fgColor), luminance(state.value.bgColor)]
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  return ratio < 2.5
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
        Content
      </h2>
      <UTextarea
        v-model="state.data"
        :rows="2"
        autoresize
        size="xl"
        placeholder="Paste a link or type any text…"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
        Shape
      </h2>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="style in dotStyles"
          :key="style.value"
          type="button"
          class="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors"
          :class="state.dotStyle === style.value
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-default text-toned hover:bg-elevated'"
          @click="state.dotStyle = style.value"
        >
          <UIcon :name="style.icon" class="size-4 shrink-0" />
          {{ style.label }}
        </button>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
        Colors
      </h2>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <UPopover>
          <button
            type="button"
            class="flex min-h-11 w-full items-center gap-3 rounded-lg border border-default px-3 py-2.5 text-sm hover:bg-elevated transition-colors"
          >
            <span
              class="size-5 shrink-0 rounded-full border border-default"
              :style="{ backgroundColor: state.fgColor }"
            />
            <span class="text-toned">Code</span>
            <span class="ms-auto font-mono text-xs text-muted uppercase">{{ state.fgColor }}</span>
          </button>
          <template #content>
            <div class="flex flex-col gap-3 p-3">
              <UColorPicker v-model="state.fgColor" />
              <div class="flex gap-2">
                <button
                  v-for="swatch in fgSwatches"
                  :key="swatch"
                  type="button"
                  class="size-6 rounded-full border border-default"
                  :style="{ backgroundColor: swatch }"
                  :aria-label="swatch"
                  @click="state.fgColor = swatch"
                />
              </div>
            </div>
          </template>
        </UPopover>
        <UPopover>
          <button
            type="button"
            class="flex min-h-11 w-full items-center gap-3 rounded-lg border border-default px-3 py-2.5 text-sm hover:bg-elevated transition-colors"
          >
            <span
              class="size-5 shrink-0 rounded-full border border-default"
              :style="{ backgroundColor: state.bgColor }"
            />
            <span class="text-toned">Background</span>
            <span class="ms-auto font-mono text-xs text-muted uppercase">{{ state.bgColor }}</span>
          </button>
          <template #content>
            <div class="flex flex-col gap-3 p-3">
              <UColorPicker v-model="state.bgColor" />
              <div class="flex gap-2">
                <button
                  v-for="swatch in bgSwatches"
                  :key="swatch"
                  type="button"
                  class="size-6 rounded-full border border-default"
                  :style="{ backgroundColor: swatch }"
                  :aria-label="swatch"
                  @click="state.bgColor = swatch"
                />
              </div>
            </div>
          </template>
        </UPopover>
      </div>
      <p v-if="lowContrast" class="flex items-center gap-1.5 text-xs text-warning">
        <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
        Low contrast — this code may be hard to scan
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
        Frame
      </h2>
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors"
          :class="state.frameStyle === 'none'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-default text-toned hover:bg-elevated'"
          @click="state.frameStyle = 'none'"
        >
          <UIcon name="i-lucide-circle-off" class="size-4 shrink-0" />
          None
        </button>
        <button
          type="button"
          class="flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors"
          :class="state.frameStyle === 'banner'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-default text-toned hover:bg-elevated'"
          @click="state.frameStyle = 'banner'"
        >
          <UIcon name="i-lucide-panel-bottom" class="size-4 shrink-0" />
          Scan me
        </button>
      </div>
      <template v-if="state.frameStyle === 'banner'">
        <UInput
          v-model="state.frameText"
          maxlength="20"
          size="lg"
          placeholder="SCAN ME"
          autocomplete="off"
          :ui="{ base: 'uppercase' }"
        />
        <UPopover>
          <button
            type="button"
            class="flex min-h-11 w-full items-center gap-3 rounded-lg border border-default px-3 py-2.5 text-sm hover:bg-elevated transition-colors"
          >
            <span
              class="size-5 shrink-0 rounded-full border border-default"
              :style="{ backgroundColor: state.frameColor }"
            />
            <span class="text-toned">Frame color</span>
            <span class="ms-auto font-mono text-xs text-muted uppercase">{{ state.frameColor }}</span>
          </button>
          <template #content>
            <div class="flex flex-col gap-3 p-3">
              <UColorPicker v-model="state.frameColor" />
              <div class="flex gap-2">
                <button
                  v-for="swatch in frameSwatches"
                  :key="swatch"
                  type="button"
                  class="size-6 rounded-full border border-default"
                  :style="{ backgroundColor: swatch }"
                  :aria-label="swatch"
                  @click="state.frameColor = swatch"
                />
              </div>
            </div>
          </template>
        </UPopover>
      </template>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted">
        Logo
      </h2>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onLogoPicked"
      >
      <div v-if="state.logo" class="flex items-center gap-3">
        <img
          :src="state.logo"
          alt="Logo preview"
          class="size-11 rounded-lg border border-default object-contain bg-elevated p-1"
        >
        <UButton
          label="Replace"
          color="neutral"
          variant="subtle"
          size="sm"
          @click="fileInput?.click()"
        />
        <UButton
          label="Remove"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="removeLogo"
        />
      </div>
      <UButton
        v-else
        label="Add a logo"
        icon="i-lucide-image-plus"
        color="neutral"
        variant="subtle"
        class="self-start"
        @click="fileInput?.click()"
      />
      <p class="text-xs text-muted">
        Optional — placed in the center. Keep it small and simple so the code stays easy to scan.
      </p>
    </section>
  </div>
</template>
