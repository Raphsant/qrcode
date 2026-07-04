<script setup lang="ts">
import type { QrHistoryEntry } from '~/composables/useQrHistory'

const siteUrl = useRuntimeConfig().public.siteUrl

useSeoMeta({
  title: 'Snuuy - QRMaker — free styled QR codes',
  description: 'Create styled QR codes from any link or text. Custom colors, shapes, logos and frames — scan-verified, generated on your device, free forever.',
  ogTitle: 'Snuuy - QRMaker',
  ogDescription: 'Styled QR codes, generated on your device. Free forever, no sign-up, scan-verified.',
  ogType: 'website',
  ogUrl: `${siteUrl}/`,
  ogImage: `${siteUrl}/og.png`,
  twitterCard: 'summary_large_image',
  twitterTitle: 'Snuuy - QRMaker',
  twitterDescription: 'Styled QR codes, generated on your device. Free forever, no sign-up, scan-verified.',
  twitterImage: `${siteUrl}/og.png`,
})

useHead({ link: [{ rel: 'canonical', href: `${siteUrl}/` }] })

const state = useQrState()
const history = useQrHistory()
const toast = useToast()
const { recordDownload } = useTipJar()

const previewRef = ref<{
  download: (extension: 'png' | 'svg') => Promise<void>
  getThumb: () => Promise<string | null>
  getPngBlob: () => Promise<{ blob: Blob, width: number, height: number } | null>
}>()

const hasContent = computed(() => state.value.data.trim().length > 0)
const historyOpen = ref(false)
const downloading = ref(false)

async function handleDownload(extension: 'png' | 'svg') {
  if (!previewRef.value || downloading.value) return
  downloading.value = true
  try {
    await previewRef.value.download(extension)
    const thumb = await previewRef.value.getThumb()
    if (thumb) history.add(state.value, thumb)
    toast.add({
      title: `Saved as ${extension.toUpperCase()}`,
      icon: 'i-lucide-circle-check',
      color: 'success',
      duration: 2500,
    })
    recordDownload()
  }
  finally {
    downloading.value = false
  }
}

const printing = ref(false)

const printItems = [
  { label: 'A4', icon: 'i-lucide-file', onSelect: () => handlePrintSheet('a4') },
  { label: 'US Letter', icon: 'i-lucide-file', onSelect: () => handlePrintSheet('letter') },
]

async function handlePrintSheet(paper: 'a4' | 'letter') {
  if (!previewRef.value || printing.value) return
  printing.value = true
  try {
    const png = await previewRef.value.getPngBlob()
    if (!png) return
    const pdf = await buildPrintSheet(png, { content: state.value.data.trim(), paper })
    saveBlob(pdf, 'qr-print-sheet.pdf')
    const thumb = await previewRef.value.getThumb()
    if (thumb) history.add(state.value, thumb)
    toast.add({
      title: 'Print sheet saved',
      icon: 'i-lucide-circle-check',
      color: 'success',
      duration: 2500,
    })
    recordDownload()
  }
  finally {
    printing.value = false
  }
}

function restore(entry: QrHistoryEntry) {
  state.value = { ...defaultQrOptions(), ...JSON.parse(JSON.stringify(entry.options)) }
  historyOpen.value = false
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-default">
    <AppHeader>
      <template #actions>
        <UButton
          icon="i-lucide-layers"
          label="Batch"
          color="neutral"
          variant="ghost"
          to="/batch"
        />
        <UButton
          icon="i-lucide-history"
          color="neutral"
          variant="ghost"
          aria-label="History"
          class="lg:hidden"
          @click="historyOpen = true"
        />
      </template>
    </AppHeader>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 lg:py-12">
      <div class="grid gap-8 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-14">
        <div class="lg:order-2">
          <div class="lg:sticky lg:top-8 flex flex-col gap-6">
            <div class="rounded-2xl border border-default p-5 sm:p-6">
              <div class="mx-auto max-w-xs lg:max-w-sm">
                <QrPreview ref="previewRef" />
              </div>
              <div class="mt-5 flex gap-2">
                <UButton
                  label="Download PNG"
                  icon="i-lucide-download"
                  size="lg"
                  block
                  class="flex-1"
                  :disabled="!hasContent"
                  :loading="downloading"
                  @click="handleDownload('png')"
                />
                <UButton
                  label="SVG"
                  color="neutral"
                  variant="subtle"
                  size="lg"
                  :disabled="!hasContent"
                  @click="handleDownload('svg')"
                />
              </div>
              <UDropdownMenu :items="printItems" class="mt-2 w-full">
                <UButton
                  label="Print sheet"
                  icon="i-lucide-printer"
                  color="neutral"
                  variant="subtle"
                  size="lg"
                  block
                  :disabled="!hasContent"
                  :loading="printing"
                />
              </UDropdownMenu>
            </div>

            <div class="hidden lg:block">
              <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                History
              </h2>
              <QrHistory @restore="restore" />
            </div>
          </div>
        </div>

        <div class="lg:order-1">
          <QrControls />
        </div>
      </div>
    </main>

    <AppFooter />

    <USlideover v-model:open="historyOpen" title="History">
      <template #body>
        <QrHistory @restore="restore" />
      </template>
    </USlideover>
  </div>
</template>
