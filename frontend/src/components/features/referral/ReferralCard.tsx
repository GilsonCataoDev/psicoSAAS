import { Copy, CheckCircle2, Gift } from 'lucide-react'
import { useReferral } from './useReferral'

export default function ReferralCard() {
  const { stats, referralUrl, copied, copyLink, shareWhatsApp } = useReferral()

  if (!stats) return null

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-sage-100 rounded-xl flex items-center justify-center">
          <Gift className="w-4.5 h-4.5 text-sage-600" />
        </div>
        <div>
          <h2 className="section-title mb-0">Indique e ganhe</h2>
          <p className="text-xs text-neutral-400">1 mes gratis por cada colega que assinar</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-neutral-800">{stats.totalInvited}</p>
          <p className="text-xs text-neutral-400 mt-0.5">indicacoes feitas</p>
        </div>
        <div className="bg-sage-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-sage-700">{stats.totalRewarded}</p>
          <p className="text-xs text-sage-500 mt-0.5">meses gratuitos ganhos</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-neutral-500 mb-2">Seu link de indicacao</p>
        <div className="bg-neutral-50 rounded-xl flex items-center gap-2 px-3 py-2.5 border border-neutral-100">
          <p className="text-xs text-neutral-600 flex-1 truncate font-mono">{referralUrl}</p>
          <button onClick={copyLink} className="shrink-0 p-1 hover:bg-white rounded-lg transition-colors" aria-label="Copiar link de indicação">
            {copied
              ? <CheckCircle2 className="w-4 h-4 text-sage-500" />
              : <Copy className="w-4 h-4 text-neutral-400" />}
          </button>
        </div>
      </div>

      <button
        onClick={shareWhatsApp}
        className="w-full flex items-center justify-center gap-2 btn-primary text-sm py-2.5"
      >
        Compartilhar no WhatsApp
      </button>

      <p className="text-xs text-neutral-400 text-center">
        Valido quando a pessoa indicada assinar qualquer plano pago.
      </p>
    </div>
  )
}
