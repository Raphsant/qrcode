import type { Options } from 'qr-code-styling'
import type { QrOptions } from '~/composables/useQrState'

const DOT_TYPE = { square: 'square', rounded: 'extra-rounded', dots: 'dots' } as const
const CORNER_TYPE = { square: 'square', rounded: 'extra-rounded', dots: 'dot' } as const

export function buildStylingOptions(o: QrOptions, size: number, data?: string): Options {
  return {
    width: size,
    height: size,
    type: 'svg',
    data: (data ?? o.data).trim(),
    margin: Math.round(size / 32),
    qrOptions: { errorCorrectionLevel: o.logo ? 'H' : 'M' },
    image: o.logo ?? undefined,
    imageOptions: { crossOrigin: 'anonymous', margin: Math.round(size / 48), imageSize: 0.35 },
    dotsOptions: { color: o.fgColor, type: DOT_TYPE[o.dotStyle] },
    cornersSquareOptions: { color: o.fgColor, type: CORNER_TYPE[o.dotStyle] },
    cornersDotOptions: { color: o.fgColor, type: o.dotStyle === 'square' ? 'square' : 'dot' },
    backgroundOptions: { color: o.bgColor },
  } as Options
}

export function slugify(text: string, max = 40): string {
  return text
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '') || 'qr-code'
}
