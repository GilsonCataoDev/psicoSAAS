import { useState, useEffect } from 'react'
import { Copy, CheckCircle2, Gift, Users, ExternalLink } from 'lucide-react'
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
      `Estou usando o PsicoSaaS para gerenciar meu consultório e adorando! 🌱\n\n` +
      `Experimente 7 dias gratis com meu link: ${referralUrl}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener')
    track(EVENTS.REFERRAL_SHARED)
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
          <Gift className="w-4.5 h-4.5 text-violet-600" />
        </div>
        <div>
          <h2 className="section-title mb-0">Indique e ganhe</h2>
          <p className="text-xs text-neutral-400">1 mês grátis por cada colega que assinar</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-neutral-800">{stats.totalInvited}</p>
          <p className="text-xs text-neutral-400 mt-0.5">indicações feitas</p>
        </div>
        <div className="bg-violet-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-violet-700">{stats.totalRewarded}</p>
          <p className="text-xs text-violet-500 mt-0.5">meses gratuitos ganhos</p>
        </div>
      </div>

      {/* Link de indicação */}
      <div>
        <p className="text-xs text-neutral-500 mb-2">Seu link de indicação</p>
        <div className="bg-neutral-50 rounded-xl flex items-center gap-2 px-3 py-2.5 border border-neutral-100">
          <p className="text-xs text-neutral-600 flex-1 truncate font-mono">{referralUrl}</p>
          <button onClick={copyCode} className="shrink-0 p-1 hover:bg-white rounded-lg transition-colors">
            {copied
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              : <Copy className="w-4 h-4 text-neutral-400" />}
          </button>
        </div>
      </div>

      {/* Compartilhar */}
      <button
        onClick={shareWhatsApp}
        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Compartilhar no WhatsApp
      </button>

      <p className="text-xs text-neutral-400 text-center">
        Válido quando a pessoa indicada assinar qualquer plano pago.
      </p>
    </div>
  )
}
