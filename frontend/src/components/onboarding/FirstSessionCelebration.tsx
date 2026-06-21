import { CalendarPlus, CheckCircle2, Copy, FileText, Gift, MessageSquareText, Sparkles, TimerReset, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReferral } from '@/components/features/referral/useReferral'

export default function FirstSessionCelebration() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { stats, referralUrl, copied, copyLink, shareWhatsApp } = useReferral(open)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('usecognia:first-session-created', handler)
    return () => window.removeEventListener('usecognia:first-session-created', handler)
  }, [])

  if (!open) return null

  function close() {
    setOpen(false)
  }

  function goDashboard() {
    close()
    navigate('/')
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/15 bg-white p-6 shadow-2xl dark:bg-cognia-panel dark:text-white">
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Fechar">
          <X size={18} />
        </button>

        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-sage-100 text-sage-700 dark:bg-sage-500/20 dark:text-sage-200">
          <Sparkles size={30} />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage-600 dark:text-sage-300">
          Primeira sessao registrada
        </p>
        <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          Agora o UseCognia comecou a trabalhar por voce.
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Voce economizou cerca de 15 minutos de digitacao manual e ja tem registro salvo com auditoria.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-sage-50 p-4 dark:bg-white/5">
            <TimerReset className="mb-2 h-5 w-5 text-sage-700 dark:text-sage-200" />
            <p className="text-lg font-bold">15 min</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">menos retrabalho</p>
          </div>
          <div className="rounded-2xl bg-mist-50 p-4 dark:bg-white/5">
            <MessageSquareText className="mb-2 h-5 w-5 text-mist-700 dark:text-mist-200" />
            <p className="text-lg font-bold">1 passo</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">para WhatsApp automatico</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 dark:bg-white/5">
            <FileText className="mb-2 h-5 w-5 text-amber-700 dark:text-amber-200" />
            <p className="text-lg font-bold">Seguro</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">dados organizados</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-sage-100 p-4 dark:border-white/10">
          <p className="text-sm font-semibold">Proximos passos</p>
          <div className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-300">
            <button type="button" onClick={() => navigate('/pacientes')} className="flex items-center gap-2 text-left hover:text-sage-700">
              <CalendarPlus size={16} /> Importar mais 4 pacientes
            </button>
            <button type="button" onClick={() => navigate('/configuracoes?tab=messages')} className="flex items-center gap-2 text-left hover:text-sage-700">
              <MessageSquareText size={16} /> Ativar WhatsApp automatico
            </button>
            <button type="button" onClick={() => navigate('/documentos')} className="flex items-center gap-2 text-left hover:text-sage-700">
              <FileText size={16} /> Gerar seu primeiro recibo
            </button>
          </div>
        </div>

        {stats && (
          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-sage-700 dark:bg-sage-500/20 dark:text-sage-200">
                <Gift size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Indique e ganhe</p>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-300">
                  Conhece outro psicólogo que também perde tempo com faltas? Indique e ganhe 1 mês grátis.
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
              <p className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-600 dark:text-gray-300">
                {referralUrl}
              </p>
              <button
                type="button"
                onClick={copyLink}
                className="shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-sage-700 dark:hover:bg-white/10"
                aria-label="Copiar link de indicação"
              >
                {copied ? <CheckCircle2 size={17} className="text-sage-600" /> : <Copy size={17} />}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={copyLink}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 hover:border-sage-300 hover:text-sage-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
              >
                {copied ? 'Link copiado' : 'Copiar link'}
              </button>
              <button
                type="button"
                onClick={shareWhatsApp}
                className="h-10 rounded-xl bg-sage-600 px-3 text-sm font-semibold text-white hover:bg-sage-700"
              >
                Compartilhar no WhatsApp
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={close} className="h-11 rounded-xl px-4 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-300">
            Fechar
          </button>
          <button type="button" onClick={goDashboard} className="h-11 rounded-xl bg-sage-600 px-5 text-sm font-semibold text-white hover:bg-sage-700">
            Ver dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
