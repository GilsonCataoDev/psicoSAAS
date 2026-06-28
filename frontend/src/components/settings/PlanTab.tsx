import { ArrowRight, CheckCircle2, X, Zap } from 'lucide-react'
import ReferralCard from '@/components/features/referral/ReferralCard'
import { type Subscription } from '@/store/subscription'

const TRIAL_DAYS = 7

interface Plan {
  id: string
  name: string
  features: string[]
}

interface Props {
  subscription: Subscription
  currentPlan: Plan | undefined
  currentPlanId: string
  isTrialing: boolean
  daysLeft: number | null
  hasCancelablePlan: boolean
  cancelingPlan: boolean
  setConfirmCancelPlan: (v: boolean) => void
  navigate: (to: string) => void
}

export function PlanTab({
  subscription, currentPlan, currentPlanId, isTrialing, daysLeft,
  hasCancelablePlan, cancelingPlan, setConfirmCancelPlan, navigate,
}: Props) {
  return (
    <>
      <div className="space-y-5">
        <div className={`card ${isTrialing ? 'border-sage-200 bg-gradient-to-br from-sage-50 to-white' : ''}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-neutral-800">
                  Plano {currentPlan?.name ?? 'Gratuito'}
                  {isTrialing && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">em teste</span>}
                  {subscription.status === 'active' && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">ativo</span>}
                </p>
                {isTrialing && daysLeft !== null && (
                  <p className="text-sm text-neutral-500 mt-0.5">{daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''} no período grátis</p>
                )}
                {subscription.status === 'active' && subscription.currentPeriodEnd && (
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {subscription.cancelAtPeriodEnd ? 'Acesso ate ' : 'Renova em '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => navigate('/planos')} className="btn-primary text-sm flex items-center gap-1.5">
              {isTrialing ? 'Assinar agora' : 'Trocar plano'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {isTrialing && daysLeft !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Período de teste</span><span>{daysLeft} dias restantes</span>
              </div>
              <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full bg-sage-400 rounded-full transition-all"
                  style={{ width: `${Math.max(5, ((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="card space-y-3">
          <h2 className="section-title">O que está incluído</h2>
          <ul className="space-y-2">
            {currentPlan?.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                <CheckCircle2 className="w-4 h-4 text-sage-500 shrink-0" />{f}
              </li>
            ))}
          </ul>
        </div>
        {hasCancelablePlan && (
          <div className="card border-rose-100">
            <h2 className="section-title text-neutral-600">
              {subscription.cancelAtPeriodEnd ? 'Cancelamento agendado' : 'Cancelamento'}
            </h2>
            {subscription.cancelAtPeriodEnd ? (
              <p className="text-sm text-neutral-500 mt-1">
                Sua assinatura não será renovada. O acesso continua até{' '}
                {subscription.currentPeriodEnd
                  ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                  : 'o fim do periodo atual'}.
              </p>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mt-1">
                  {currentPlanId === 'free'
                    ? 'Ao sair do plano grátis, você volta para a tela de planos. Seus dados ficam seguros.'
                    : isTrialing
                      ? 'Ao cancelar o teste, a assinatura será encerrada e você volta para a tela de planos.'
                      : 'Ao cancelar, você continua com acesso até o fim do período pago. Seus dados ficam seguros por 90 dias.'}
                </p>
                <button
                  className="mt-3 text-sm text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors disabled:opacity-60"
                  onClick={() => setConfirmCancelPlan(true)}
                  disabled={cancelingPlan}
                >
                  <X className="w-3.5 h-3.5" />
                  {cancelingPlan ? 'Cancelando...' : 'Cancelar assinatura'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <ReferralCard />
    </>
  )
}
