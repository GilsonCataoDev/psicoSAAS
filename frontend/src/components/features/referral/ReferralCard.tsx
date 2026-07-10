import { Copy, CheckCircle2, Gift, UserPlus, ClipboardList, MailCheck } from 'lucide-react'
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
          <p className="text-xs text-neutral-400">Você e seu colega ganham {stats.rewardLabel ?? '30 dias de beneficio'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-neutral-800">{stats.totalInvited}</p>
          <p className="text-xs text-neutral-400 mt-0.5">indicacoes feitas</p>
        </div>
        <div className="bg-sage-50 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-sage-700">{stats.totalRewarded}</p>
          <p className="text-xs text-sage-500 mt-0.5">bonus liberados</p>
        </div>
      </div>

      <div className="rounded-2xl border border-sage-100 bg-sage-50 p-3">
        <p className="mb-2 text-xs font-semibold text-sage-800">Seu colega ganha 30 dias de Pro assim que se cadastra pelo link.</p>
        <p className="mb-2 text-xs font-semibold text-sage-800">Seu bônus libera quando o colega:</p>
        <div className="grid gap-2 text-xs text-sage-700 sm:grid-cols-3">
          <span className="flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" />3 pacientes</span>
          <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />2 sessões</span>
          <span className="flex items-center gap-1.5"><MailCheck className="h-3.5 w-3.5" />e-mail + 3 dias</span>
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
        Seu bônus libera quando o colega usar o produto de verdade.
      </p>

      {(stats.invited?.length ?? 0) > 0 && (
        <div className="space-y-2 border-t border-neutral-100 pt-3">
          <p className="text-xs font-semibold text-neutral-500">Ultimas indicações</p>
          {stats.invited!.slice(0, 3).map(item => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-neutral-700">{item.name}</p>
                <p className="text-[11px] text-neutral-400">
                  {item.progress.patients}/3 pacientes · {item.progress.sessions}/2 sessões · {item.progress.daysActive}/3 dias
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                item.rewardGranted
                  ? 'bg-sage-100 text-sage-700'
                  : item.progress.qualified
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-neutral-100 text-neutral-500'
              }`}>
                {item.rewardGranted ? 'liberado' : item.progress.qualified ? 'validando' : 'em progresso'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
