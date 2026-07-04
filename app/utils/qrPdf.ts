import type { PDFPage, RGB } from 'pdf-lib'

export interface PrintPng {
  blob: Blob
  width: number
  height: number
}

const MM = 2.83465

const SIZES = [
  { mm: 80, use: 'Posters & signage', dist: 'scans from ~0.8 m' },
  { mm: 50, use: 'Table tents & menus', dist: 'scans from ~0.5 m' },
  { mm: 30, use: 'Business cards & packaging', dist: 'scans from ~0.3 m' },
  { mm: 20, use: 'Stickers & labels', dist: 'scans from ~0.2 m' },
]

function cropMarks(page: PDFPage, x: number, y: number, w: number, h: number, color: RGB) {
  const len = 4 * MM
  const off = 1.5 * MM
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color })
  for (const [cx, dx] of [[x, -1], [x + w, 1]] as const) {
    for (const [cy, dy] of [[y, -1], [y + h, 1]] as const) {
      line(cx + dx * off, cy, cx + dx * (off + len), cy)
      line(cx, cy + dy * off, cx, cy + dy * (off + len))
    }
  }
}

export async function buildPrintSheet(png: PrintPng, opts: { content: string, paper: 'a4' | 'letter' }): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const [pageW, pageH] = opts.paper === 'a4' ? [595.28, 841.89] : [612, 792]
  const doc = await PDFDocument.create()
  const page = doc.addPage([pageW, pageH])
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const image = await doc.embedPng(await png.blob.arrayBuffer())
  const aspect = png.height / png.width

  const margin = 15 * MM
  const dark = rgb(0.09, 0.09, 0.11)
  const gray = rgb(0.45, 0.45, 0.48)
  const light = rgb(0.75, 0.75, 0.78)

  // Helvetica is WinAnsi-only — drop anything it can't encode (emoji, CJK, …)
  let title = opts.content.replace(/[^\x20-\x7E\xA0-\xFF]/gu, '').trim()
  if (title.length > 60) title = `${title.slice(0, 57)}...`

  let y = pageH - margin
  page.drawText('Print sheet', { x: margin, y: y - 14, size: 14, font: bold, color: dark })
  y -= 20
  if (title) {
    page.drawText(title, { x: margin, y: y - 9, size: 9, font: regular, color: gray })
    y -= 13
  }
  page.drawText('Scan-verified - generated on your device - cut along the corner marks', {
    x: margin,
    y: y - 7.5,
    size: 7.5,
    font: regular,
    color: light,
  })
  y -= 12

  const gap = 8 * MM
  for (const s of SIZES) {
    const w = s.mm * MM
    const h = w * aspect
    y -= gap
    const boxY = y - h
    page.drawImage(image, { x: margin, y: boxY, width: w, height: h })
    cropMarks(page, margin, boxY, w, h, light)
    const tx = margin + 80 * MM + 12 * MM
    page.drawText(`${s.mm} mm`, { x: tx, y: y - 11, size: 11, font: bold, color: dark })
    page.drawText(s.use, { x: tx, y: y - 25, size: 9, font: regular, color: gray })
    page.drawText(s.dist, { x: tx, y: y - 37, size: 8, font: regular, color: light })
    y = boxY
  }

  const bytes = await doc.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}
