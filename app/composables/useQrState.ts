export type DotStyle = 'square' | 'rounded' | 'dots'
export type FrameStyle = 'none' | 'banner'

export interface QrOptions {
  data: string
  fgColor: string
  bgColor: string
  dotStyle: DotStyle
  logo: string | null
  frameStyle: FrameStyle
  frameText: string
  frameColor: string
}

export const defaultQrOptions = (): QrOptions => ({
  data: '',
  fgColor: '#18181b',
  bgColor: '#ffffff',
  dotStyle: 'rounded',
  logo: null,
  frameStyle: 'none',
  frameText: 'SCAN ME',
  frameColor: '#18181b',
})

export function useQrState() {
  return useState<QrOptions>('qr-options', defaultQrOptions)
}
