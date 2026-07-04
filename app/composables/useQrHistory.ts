import type { QrOptions } from './useQrState'

export interface QrHistoryEntry {
  id: string
  options: QrOptions
  createdAt: number
  thumb: string
}

const MAX_ENTRIES = 20

export function useQrHistory() {
  const entries = useLocalStorage<QrHistoryEntry[]>('qr-history', [])

  function add(options: QrOptions, thumb: string) {
    const copy: QrOptions = JSON.parse(JSON.stringify(options))
    const key = JSON.stringify(copy)
    entries.value = [
      { id: crypto.randomUUID(), options: copy, createdAt: Date.now(), thumb },
      ...entries.value.filter(e => JSON.stringify(e.options) !== key),
    ].slice(0, MAX_ENTRIES)
  }

  function remove(id: string) {
    entries.value = entries.value.filter(e => e.id !== id)
  }

  function clear() {
    entries.value = []
  }

  return { entries, add, remove, clear }
}
