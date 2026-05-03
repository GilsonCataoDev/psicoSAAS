import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Zap, Star, Sparkles, ArrowRight, Shield, HelpCircle } from 'lucide-react'
import { PLANS, Plan, PlanId, useSubscriptionStore } from '@/store/subscription'
import { cn } from '@/lib/utils'
import CheckoutModal from '@/components/features/subscription/CheckoutModal'
import toast from 'react-hot-toast'

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  free:      <Shield className="w-5 h-5" />,
  essencial: <Zap className="w-5 h-5" />,
  pro:       <Star className="w-5 h-5" />,
}

const FAQ = [
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. Você pode cancelar quando quiser e continua com acesso até o fim do período pago. Sem multas ou taxas.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Totalmente. Todos os prontuários são criptografados com AES-256 e operamos em conformidade com a LGPD.',
  },
  {
    q: 'O que acontece quando meu período grátis acabar?',
    a: 'Você recebe um aviso 3 dias antes. Pode assinar um plano ou migrar para o Gratuito sem perder nenhum dado.',
  },
  {
    q: 'Quais formas de pagamento são aceitas?',
    a: 'PIX (com desconto de 5%), cartão de crédito em até 12x, boleto bancário e débito em conta.',
  },
  {
    q: 'Existe contrato de fidelidade?',
    a: 'Não. Todos os planos são mensais (ou anuais com desconto). Sem fidelidade mínima.',
  },
]

export default function PlansPage() {
  const [yearly, setYearly] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { subscription } = useSubscriptionStore()
  const navigate = useNavigate()

  function handleSelectPlan(plan: Plan) {
    if (plan.id === 'free') {
      useSubscriptionStore.getState().setSubscription({ planId: 'free', status: 'active' })
      toast.success('Migrado para o plano Gratuito.')
      navigate('/configuracoes')
      return
    }
    if (plan.id === subscription.planId && subscription.status === 'active') {
      toast('Você já está neste plano! 🎉')
      return
    }
    setSelectedPlan(plan)
  }

  const daysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="animate-slide-up max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-sage-50 text-sage-700 px-3 py-1.5 rounded-full text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          Escolha o plano ideal para você
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-light text-neutral-800">
          Invista no seu consultório
        </h1>
        <p className="text-neutral-500 max-w-md mx-auto">
          Simples, transparente e sem surpresas. Cancele quando quiser.
        </p>
      </div>

      {/* Trial banner */}
      {subscription.status === 'trialing' && daysLeft !== null && (
        <div className="bg-gradient-to-r from-sage-500 to-sage-600 text-white rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-medium text-sm">
                Período de teste — {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
              </p>
              <p className="text-sage-100 text-xs mt-0.5">
                Você está usando o plano <strong>Essencial</strong> gratuitamente. Assine para continuar.
              </p>
            </div>
          </div>
          <div className="text-xs text-sage-200">
            Vence em {subscription.trialEndsAt
              ? new Date(subscription.trialEndsAt).toLocaleDateString('pt-BR')
              : '—'}
          </div>
        </div>
      )}

      {/* Toggle mensal / anual */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn('text-sm', !yearly ? 'text-neutral-800 font-medium' : 'text-neutral-400')}>Mensal</span>
        <button
          onClick={() => setYearly(v => !v)}
          className={cn(
            'w-12 h-6 rounded-full relative transition-colors',
            yearly ? 'bg-sage-500' : 'bg-neutral-200',
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            yearly ? 'translate-x-6' : 'translate-x-0.5',
          )} />
        </button>
        <span className={cn('text-sm', yearly ? 'text-neutral-800 font-medium' : 'text-neutral-400')}>
          Anual
          <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
            até 20% off
          </span>
        </span>
      </div>

      {/* Cards de planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const isCurrentPlan = subscription.planId === plan.id
          const price = yearly ? plan.priceYearly : plan.price

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-3xl border flex flex-col transition-all',
                plan.highlight
                  ? 'border-sage-300 shadow-lg shadow-sage-100'
                  : 'border-neutral-200 shadow-card',
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-sage-500 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                    ⭐ Mais popular
                  </span>
                </div>
              )}

              <div className={cn(
                'p-6 rounded-t-3xl',
                plan.highlight ? 'bg-gradient-to-br from-sage-50 to-white' : 'bg-white',
              )}>
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center mb-4',
                  plan.highlight ? 'bg-sage-500 text-white' : 'bg-neutral-100 text-neutral-500',
                )}>
                  {PLAN_ICONS[plan.id]}
                </div>

                <h2 className="font-semibold text-neutral-800 text-lg">{plan.name}</h2>

                <div className="mt-3 flex items-end gap-1">
                  {price === 0 ? (
                    <span className="text-3xl font-bold text-neutral-800">Grátis</span>
                  ) : (
                    <>
                      <span className="text-xs text-neutral-400 mb-1">R$</span>
                      <span className="text-3xl font-bold text-neutral-800">{price}</span>
                      <span className="text-neutral-400 text-sm mb-1">/mês</span>
                    </>
                  )}
                </div>
                {yearly && plan.price > 0 && (
                  <p className="text-xs text-neutral-400 mt-1">
                    Cobrado R$ {plan.priceYearly * 12}/ano
                    <span className="text-emerald-600 ml-1 font-medium">
                      (economia de R$ {(plan.price - plan.priceYearly) * 12}/ano)
                    </span>
                  </p>
                )}
              </div>

              <div className="px-6 py-4 flex-1 bg-white">
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-neutral-600">
                      <Check className="w-4 h-4 text-sage-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-6 pb-6 bg-white rounded-b-3xl">
                {isCurrentPlan ? (
                  <div className="w-full py-2.5 rounded-xl bg-sage-50 text-sage-700 text-sm font-medium text-center border border-sage-200">
                    {subscription.status === 'trialing' ? 'Em teste' : 'Plano atual ✓'}
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={cn(
                      'w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all',
                      plan.highlight
                        ? 'bg-sage-500 hover:bg-sage-600 text-white shadow-sm'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700',
                    )}
                  >
                    {plan.id === 'free' ? 'Usar gratuito' : `Assinar ${plan.name}`}
                    {plan.id !== 'free' && <ArrowRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Garantia */}
      <div className="flex items-center justify-center gap-3 text-sm text-neutral-500">
        <Shield className="w-4 h-4 text-sage-400" />
        <span>7 dias de teste gratis · Cancele a qualquer momento · Cartao usado so apos o teste</span>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sage-500" />
          <h2 className="font-medium text-neutral-800">Perguntas frequentes</h2>
        </div>
        <div className="divide-y divide-neutral-50">
          {FAQ.map((item, i) => (
            <div key={i} className="px-6 py-4">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left flex items-center justify-between gap-4 group"
              >
                <p className="text-sm font-medium text-neutral-700 group-hover:text-sage-600 transition-colors">
                  {item.q}
                </p>
                <span className={cn(
                  'w-5 h-5 text-neutral-400 shrink-0 transition-transform',
                  openFaq === i ? 'rotate-180' : '',
                )}>
                  ▾
                </span>
              </button>
              {openFaq === i && (
                <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          yearly={yearly}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  )
}
