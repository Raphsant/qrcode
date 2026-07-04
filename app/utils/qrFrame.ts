export interface FrameLayout {
  width: number
  height: number
  padding: number
  banner: number
  qrSize: number
}

export function frameLayout(qrSize: number): FrameLayout {
  const padding = Math.round(qrSize * 0.055)
  const banner = Math.round(qrSize * 0.18)
  return {
    width: qrSize + padding * 2,
    height: padding + qrSize + banner,
    padding,
    banner,
    qrSize,
  }
}

function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' })[c]!)
}

export function composeFramedSvg(qrSvg: string, opts: { qrSize: number, text: string, color: string, bg: string }): string {
  const { width, height, padding, banner, qrSize } = frameLayout(opts.qrSize)
  const outerRadius = Math.round(opts.qrSize * 0.06)
  const innerRadius = Math.round(opts.qrSize * 0.03)
  // Inset the QR inside its card so the frame never eats the quiet zone —
  // a colored border flush against the code's thin margin breaks scanning.
  const inset = Math.round(opts.qrSize * 0.06)
  const innerSize = qrSize - inset * 2
  const text = escapeXml(opts.text.trim().toUpperCase() || 'SCAN ME')
  const textColor = luminance(opts.color) > 0.45 ? '#18181b' : '#ffffff'
  const fontSize = Math.round(Math.min(banner * 0.52, (width * 0.85) / Math.max(text.length, 1) * 1.6))
  // Embed the QR's own <svg> inside the frame; nested svg keeps its viewBox intact.
  // Strip any XML prolog/doctype first — they are invalid when nested and break
  // strict XML parsing (e.g. loading the composed SVG into an Image for PNG export).
  const positionedQr = qrSvg
    .replace(/<\?xml[^?]*\?>/, '')
    .replace(/<!DOCTYPE[^>]*>/, '')
    .replace(/<svg([^>]*?)>/, (_m, attrs: string) => {
      const scaled = attrs
        .replace(/\swidth="[^"]*"/, ` width="${innerSize}"`)
        .replace(/\sheight="[^"]*"/, ` height="${innerSize}"`)
      return `<svg x="${padding + inset}" y="${padding + inset}"${scaled}>`
    })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" rx="${outerRadius}" fill="${opts.color}"/>
<rect x="${padding}" y="${padding}" width="${qrSize}" height="${qrSize}" rx="${innerRadius}" fill="${opts.bg}"/>
${positionedQr}
<text x="${width / 2}" y="${padding + qrSize + banner / 2}" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="700" letter-spacing="${Math.round(fontSize * 0.08)}" font-size="${fontSize}" fill="${textColor}">${text}</text>
</svg>`
}

export async function svgToPngBlob(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
    return await new Promise((resolve, reject) =>
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png'))
  }
  finally {
    URL.revokeObjectURL(url)
  }
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
