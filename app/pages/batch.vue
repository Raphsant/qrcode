<script setup lang="ts">
import jsQR from 'jsqr'

const siteUrl = useRuntimeConfig().public.siteUrl

useSeoMeta({
  title: 'Batch QR codes — Snuuy QRMaker',
  description: 'Paste a list or drop a CSV and download a ZIP of styled, scan-verified QR codes — generated on your device, free.',
  ogTitle: 'Batch QR codes — Snuuy QRMaker',
  ogDescription: 'Turn a list of links into a ZIP of styled QR codes, right in your browser.',
  ogType: 'website',
  ogUrl: `${siteUrl}/batch`,
  ogImage: `${siteUrl}/og.png`,
  twitterCard: 'summary_large_image',
  twitterImage: `${siteUrl}/og.png`,
})

useHead({ link: [{ rel: 'canonical', href: `${siteUrl}/batch` }] })

const state = useQrState()
const { recordDownload } = useTipJar()

const MAX_ITEMS = 200
const MAX_LEN = 1500

interface BatchItem {
  name: string
  content: string
  line: number
}

const raw = ref('')
const fileInput = ref<HTMLInputElement>()

const parsed = computed(() => {
  const items: BatchItem[] = []
  let skippedLong = 0
  const lines = raw.value.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim()
    if (!line) continue
    let name = ''
    let content = line
    const commaIdx = line.indexOf(',')
    // "Name, content" — but a first field containing :// means the whole
    // line is content (protects URLs with commas in query strings)
    if (commaIdx !== -1 && !line.slice(0, commaIdx).includes('://')) {
      name = line.slice(0, commaIdx).trim()
      content = line.slice(commaIdx + 1).trim()
      if (!content) {
        content = name
        name = ''
      }
    }
    if (content.length > MAX_LEN) {
      skippedLong++
      continue
    }
    items.push({ name, content, line: i + 1 })
  }
  return {
    items: items.slice(0, MAX_ITEMS),
    total: items.length,
    capped: items.length > MAX_ITEMS,
    skippedLong,
  }
})

async function onFilePicked(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  raw.value = await file.text()
  ;(event.target as HTMLInputElement).value = ''
}

const generating = ref(false)
const progress = ref(0)
const summary = ref<{ count: number, failed: BatchItem[] } | null>(null)

// jsQR is stricter than real scanners about surrounding artwork, so for framed
// codes decode only the QR card region (its position is known from frameLayout).
async function decodesTo(blob: Blob, expected: string, crop?: { x: number, y: number, size: number }): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = crop?.size ?? bitmap.width
    canvas.height = crop?.size ?? bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, -(crop?.x ?? 0), -(crop?.y ?? 0))
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const decoded = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' })
    return decoded?.data === expected.trim()
  }
  catch {
    return false
  }
}

async function generate() {
  const items = parsed.value.items
  if (!items.length || generating.value) return
  generating.value = true
  summary.value = null
  progress.value = 0
  try {
    const [{ default: JSZip }, { default: QRCodeStyling }] = await Promise.all([
      import('jszip'),
      import('qr-code-styling'),
    ])
    const zip = new JSZip()
    const o = state.value
    const failed: BatchItem[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      const qr = new QRCodeStyling(buildStylingOptions(o, 1024, item.content))
      let blob: Blob
      let crop: { x: number, y: number, size: number } | undefined
      if (o.frameStyle === 'banner') {
        const svg = await (await qr.getRawData('svg') as Blob).text()
        const composed = composeFramedSvg(svg, { qrSize: 1024, text: o.frameText, color: o.frameColor, bg: o.bgColor })
        const layout = frameLayout(1024)
        blob = await svgToPngBlob(composed, layout.width, layout.height)
        crop = { x: layout.padding, y: layout.padding, size: layout.qrSize }
      }
      else {
        blob = await qr.getRawData('png') as Blob
      }
      if (!(await decodesTo(blob, item.content, crop))) failed.push(item)
      zip.file(`${String(i + 1).padStart(2, '0')}-${slugify(item.name || item.content)}.png`, blob)
      progress.value = i + 1
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveBlob(zipBlob, 'qr-codes.zip')
    summary.value = { count: items.length, failed }
    recordDownload()
  }
  finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-default">
    <AppHeader>
      <template #actions>
        <UButton
          icon="i-lucide-arrow-left"
          label="Single code"
          color="neutral"
          variant="ghost"
          to="/"
        />
      </template>
    </AppHeader>

    <main class="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 lg:py-12">
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-lg font-semibold text-highlighted">
            Batch codes
          </h1>
          <p class="mt-1 text-sm text-muted">
            One code per line — paste links or drop a CSV. Name a file with
            <span class="font-mono text-xs">Table 1, https://…</span>
          </p>
        </div>

        <section class="flex flex-col gap-3">
          <UTextarea
            v-model="raw"
            :rows="10"
            size="xl"
            placeholder="https://example.com/menu
Table 1, https://example.com/table/1
Table 2, https://example.com/table/2"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            :ui="{ base: 'font-mono text-sm' }"
          />
          <input
            ref="fileInput"
            type="file"
            accept=".txt,.csv,text/plain,text/csv"
            class="hidden"
            @change="onFilePicked"
          >
          <div class="flex flex-wrap items-center gap-3">
            <UButton
              label="Load .csv / .txt"
              icon="i-lucide-file-up"
              color="neutral"
              variant="subtle"
              size="sm"
              @click="fileInput?.click()"
            />
            <p v-if="parsed.items.length" class="text-xs text-muted">
              {{ parsed.items.length }} code{{ parsed.items.length === 1 ? '' : 's' }} ready
            </p>
          </div>
          <p v-if="parsed.capped" class="flex items-center gap-1.5 text-xs text-warning">
            <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
            Capped at {{ MAX_ITEMS }} codes per batch — {{ parsed.total - MAX_ITEMS }} lines beyond that are ignored
          </p>
          <p v-if="parsed.skippedLong" class="flex items-center gap-1.5 text-xs text-warning">
            <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0" />
            {{ parsed.skippedLong }} line{{ parsed.skippedLong === 1 ? '' : 's' }} skipped — over {{ MAX_LEN }} characters
          </p>
        </section>

        <section class="flex items-center gap-3 rounded-lg border border-default p-3">
          <span class="flex shrink-0 -space-x-1">
            <span class="size-4 rounded-full border border-default" :style="{ backgroundColor: state.fgColor }" />
            <span class="size-4 rounded-full border border-default" :style="{ backgroundColor: state.bgColor }" />
          </span>
          <p class="min-w-0 flex-1 text-xs text-muted">
            Uses your current style — {{ state.dotStyle }} dots{{ state.logo ? ', logo' : '' }}{{ state.frameStyle === 'banner' ? `, “${state.frameText}” frame` : '' }}
          </p>
          <UButton
            label="Edit style"
            color="neutral"
            variant="ghost"
            size="xs"
            trailing-icon="i-lucide-arrow-right"
            to="/"
          />
        </section>

        <section class="flex flex-col gap-3">
          <UButton
            :label="generating ? `Generating ${progress} / ${parsed.items.length}…` : 'Generate ZIP'"
            icon="i-lucide-package"
            size="lg"
            block
            :disabled="!parsed.items.length"
            :loading="generating"
            @click="generate"
          />
          <UProgress v-if="generating" :model-value="progress" :max="parsed.items.length" size="sm" />
          <div v-if="summary" class="rounded-lg border border-default p-3 text-sm">
            <p class="flex items-center gap-1.5 text-highlighted">
              <UIcon
                :name="summary.failed.length ? 'i-lucide-triangle-alert' : 'i-lucide-circle-check'"
                class="size-4 shrink-0"
                :class="summary.failed.length ? 'text-warning' : 'text-success'"
              />
              {{ summary.count }} code{{ summary.count === 1 ? '' : 's' }} generated ·
              {{ summary.failed.length ? `${summary.failed.length} failed verification` : 'all verified scannable' }}
            </p>
            <ul v-if="summary.failed.length" class="mt-2 flex flex-col gap-1 text-xs text-muted">
              <li v-for="item in summary.failed" :key="item.line" class="truncate">
                Line {{ item.line }}: {{ item.content }} — still in the ZIP, but check contrast and logo size
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>

    <AppFooter />
  </div>
</template>
