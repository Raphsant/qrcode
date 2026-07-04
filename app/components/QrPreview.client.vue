<script setup lang="ts">
import QRCodeStyling, { type Options } from 'qr-code-styling'
import jsQR from 'jsqr'

const state = useQrState()

const container = ref<HTMLDivElement>()
let qr: QRCodeStyling | null = null

type VerifyStatus = 'idle' | 'checking' | 'pass' | 'fail'
const verifyStatus = ref<VerifyStatus>('idle')
let verifyRun = 0

const hasContent = computed(() => state.value.data.trim().length > 0)

function buildOptions(size: number): Options {
  return buildStylingOptions(state.value, size)
}

// Recreate the instance on each change instead of update(): update() merges
// options, so a removed logo would otherwise linger.
let renderRun = 0
const render = useDebounceFn(async () => {
  if (!container.value) return
  const run = ++renderRun
  if (!hasContent.value) {
    container.value.innerHTML = ''
    qr = null
    verifyStatus.value = 'idle'
    return
  }
  const instance = new QRCodeStyling(buildOptions(1024))
  if (state.value.frameStyle === 'banner') {
    const svg = await (await instance.getRawData('svg') as Blob).text()
    if (run !== renderRun || !container.value) return
    container.value.innerHTML = composeFramedSvg(svg, {
      qrSize: 1024,
      text: state.value.frameText,
      color: state.value.frameColor,
      bg: state.value.bgColor,
    })
    const el = container.value.querySelector('svg')
    if (el) {
      el.style.width = '100%'
      el.style.height = '100%'
    }
  }
  else {
    container.value.innerHTML = ''
    instance.append(container.value)
  }
  qr = instance
  verify()
}, 150)

// Round-trip check: rasterize the current options and decode them back,
// so a logo that is too big or colors that are too close get caught.
async function verify() {
  const run = ++verifyRun
  const expected = state.value.data.trim()
  verifyStatus.value = 'checking'
  try {
    const sample = new QRCodeStyling({ ...buildOptions(512), type: 'canvas' })
    const blob = await sample.getRawData('png')
    if (!blob) throw new Error('no raster data')
    const bitmap = await createImageBitmap(blob as Blob)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const decoded = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'attemptBoth',
    })
    if (run !== verifyRun) return
    verifyStatus.value = decoded?.data === expected ? 'pass' : 'fail'
  }
  catch {
    if (run !== verifyRun) return
    verifyStatus.value = 'fail'
  }
}

watch(state, render, { deep: true })
onMounted(render)

async function composedSvg(qrSize: number, instance: QRCodeStyling): Promise<string> {
  const svg = await (await instance.getRawData('svg') as Blob).text()
  return composeFramedSvg(svg, {
    qrSize,
    text: state.value.frameText,
    color: state.value.frameColor,
    bg: state.value.bgColor,
  })
}

async function getPngBlob(): Promise<{ blob: Blob, width: number, height: number } | null> {
  if (!qr) return null
  if (state.value.frameStyle === 'banner') {
    const svgStr = await composedSvg(1024, qr)
    const { width, height } = frameLayout(1024)
    return { blob: await svgToPngBlob(svgStr, width, height), width, height }
  }
  const blob = await qr.getRawData('png') as Blob | null
  return blob ? { blob, width: 1024, height: 1024 } : null
}

async function download(extension: 'png' | 'svg') {
  if (!qr) return
  if (extension === 'svg') {
    if (state.value.frameStyle === 'banner') {
      saveBlob(new Blob([await composedSvg(1024, qr)], { type: 'image/svg+xml' }), 'qr-code.svg')
    }
    else {
      await qr.download({ name: 'qr-code', extension })
    }
    return
  }
  const png = await getPngBlob()
  if (png) saveBlob(png.blob, 'qr-code.png')
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

async function getThumb(): Promise<string | null> {
  if (!hasContent.value) return null
  if (state.value.frameStyle === 'banner') {
    const small = new QRCodeStyling(buildOptions(240))
    const svgStr = await composedSvg(240, small)
    const { width, height } = frameLayout(240)
    return blobToDataUrl(await svgToPngBlob(svgStr, width, height))
  }
  const small = new QRCodeStyling({ ...buildOptions(120), type: 'canvas' })
  const blob = await small.getRawData('png')
  if (!blob) return null
  return blobToDataUrl(blob as Blob)
}

defineExpose({ download, getThumb, getPngBlob, hasContent })
</script>

<template>
  <div class="relative aspect-square w-full overflow-hidden rounded-lg">
    <div
      v-show="hasContent"
      ref="container"
      class="h-full w-full transition-opacity duration-200 [&>svg]:h-full [&>svg]:w-full"
    />
    <div
      v-if="!hasContent"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-dashed border-accented rounded-lg text-center"
    >
      <UIcon name="i-lucide-qr-code" class="size-10 text-dimmed" />
      <p class="max-w-48 text-sm text-muted">
        Your code appears here as you type
      </p>
    </div>
  </div>
  <div class="mt-3 flex min-h-5 items-center justify-center gap-1.5 text-xs">
    <template v-if="verifyStatus === 'pass'">
      <UIcon name="i-lucide-circle-check" class="size-3.5 shrink-0 text-success" />
      <span class="text-muted">Scans reliably — verified on your device</span>
    </template>
    <template v-else-if="verifyStatus === 'fail'">
      <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0 text-warning" />
      <span class="text-warning">Couldn't scan this — try a smaller logo or more contrast</span>
    </template>
  </div>
</template>
