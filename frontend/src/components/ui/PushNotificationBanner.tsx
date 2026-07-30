import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { enableWebPush, getPushStatus, isPushSupported } from '@/lib/pushNotifications'
import { usePWA } from '@/hooks/usePWA'

const DISMISS_KEY = 'usecognia-push-banner-dismissed-at'
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000

export default function PushNotificationBanner() {
  const { isInstalled } = usePWA()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isInstalled || !isPushSupported() || Notification.permission === 'denied') return

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    if (Date.now() - dismissedAt < DISMISS_FOR_MS) return

    getPushStatus()
      .then(status => setVisible(status.configured && !status.subscribed))
      .catch(() => setVisible(false))
  }, [isInstalled])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function activate() {
    setBusy(true)
    try {
      await enableWebPush()
      setVisible(false)
      toast.success('Avisos do UseCognia ativados neste dispositivo.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel ativar os avisos.')
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-sage-100 bg-white p-4 shadow-lifted dark:border-sage-800 dark:bg-neutral-900 lg:bottom-5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-500">
        <BellRing className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Ativar avisos no dispositivo</p>
        <p className="mt-0.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          Receba lembretes de sessoes e avisos de agendamento, sem exibir conteudo clinico.
        </p>
        <button
          type="button"
          onClick={activate}
          disabled={busy}
          className="btn-primary mt-3 px-3 py-2 text-xs"
        >
          {busy ? 'Ativando...' : 'Ativar avisos'}
        </button>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Lembrar depois"
        className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
