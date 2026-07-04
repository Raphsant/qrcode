export const TIP_URL = 'https://ko-fi.com/sunnysnuuy'

const ASK_AFTER_DOWNLOADS = 10

export function useTipJar() {
  const downloads = useLocalStorage('qr-download-count', 0)
  const asked = useLocalStorage('qr-tip-asked', false)
  const toast = useToast()

  // One gentle ask after the Nth download, then never again.
  function recordDownload() {
    downloads.value++
    if (downloads.value < ASK_AFTER_DOWNLOADS || asked.value) return
    asked.value = true
    toast.add({
      title: 'Enjoying QRMaker?',
      description: 'It’s free forever — tips keep it that way.',
      icon: 'i-lucide-coffee',
      duration: 10000,
      actions: [{
        label: 'Leave a tip',
        color: 'neutral',
        variant: 'outline',
        onClick: () => window.open(TIP_URL, '_blank', 'noopener'),
      }],
    })
  }

  return { recordDownload }
}
