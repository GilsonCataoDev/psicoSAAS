import { useState, useEffect } from 'react'
import { Copy, CheckCircle2, Gift } from 'lucide-react'
import { api, USE_MOCK } from '@/lib/api'
import { track, EVENTS } from '@/lib/analytics'
import toast from 'react-hot-toast'

interface ReferralStats {
  code: string
  totalInvited: number
  totalRewarded: number
}

const MOCK_STATS: ReferralStats = { code: 'CAROL3X7', totalInvited: 3, totalRewarded: 1 }

export default function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (USE_MOCK) { setStats(MOCK_STATS); return }
    api.get('/referral').then(r => setStats(r.data)).catch(() => setStats(MOCK_STATS))
  }, [])

  if (!stats) return null

  const referralUrl = `${window.location.origin}${import.meta.env.BASE_URL}cadastro?ref=${stats.code}`

  function copyCode() {
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    track(EVENTS.REFERRAL_COPIED)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Estou usando o UseCognia para gerenciar meu consultorio e adorando!\n\n` +
      `Experimente 7 dias gratis com meu link: ${referralUrl}`,
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener')
    track(EVENTS.REFERRAL_SHARED)
  }

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
          <button onClick={copyCode} className="shrink-0 p-1 hover:bg-white rounded-lg transition-colors">
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
