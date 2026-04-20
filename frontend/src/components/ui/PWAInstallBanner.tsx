import { useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { usePWA } from '@/hooks/usePWA'

export default function PWAInstallBanner() {
  const { canInstall, isIOS, isInstalled, install } = usePWA()
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('pwa-banner-dismissed') === 'true',
  )

  if (isInstalled || dismissed) return null
  if (!canInstall && !isIOS) return null

  function dismiss() {
    localStorage.setItem('pwa-banner-dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="lg:hidden fixed bottom-20 inset-x-3 z-50 bg-white rounded-2xl shadow-lifted
                    border border-sage-100 p-4 flex items-center gap-3 animate-slide-up">
      <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center shrink-0">
        <span className="text-white text-xl">🌿</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800">Instalar PsicoSaaS</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {isIOS
            ? 'Toque em compartilhar e "Adicionar à Tela Inicial"'
            : 'Acesse mais rápido direto da tela inicial'}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isIOS && (
          <button onClick={install} className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />Instalar
          </button>
        )}
        {isIOS && (
          <Share className="w-5 h-5 text-sage-500" />
        )}
        <button onClick={dismiss} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
