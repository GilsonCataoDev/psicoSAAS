import { useEffect, useRef, useState } from 'react'
import { BadgeDollarSign, CheckCircle2, Clock3, CreditCard, Loader2, Target, TrendingUp, XCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { PLANS, Plan, useSubscriptionStore } from '@/store/subscription'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import BrandLogo from '@/components/ui/BrandLogo'
import Modal from '@/components/ui/Modal'
import { PRICING_COMPARISON, PRICING_FAQ, PRICING_HERO, PRICING_PLANS, PricingPlan, PricingRoiItem } from '@/data/pricingPlans'
import { userSafeError } from '@/lib/userSafeError'
import { track, EVENTS } from '@/lib/analytics'

function statusMessage(status: string) {
  if (status === 'pending') return 'Aguardando pagamento'
  if (status === 'trialing') return 'Voce esta em periodo de teste'
  if (status === 'past_due') return 'Seu teste terminou e o pagamento falhou.'
  if (status === 'active') return 'Acesso normal'
  return 'Escolha um plano para continuar'
}

export default function PricingPage({ publicView = false }: { publicView?: boolean }) {
  if (!publicView) return <PaidPricingPage />

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-sage-100 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link to="/plataforma" aria-label="Voltar para a página inicial">
            <BrandLogo className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-sage-700 hover:text-sage-900">
              Entrar
            </Link>
            <Link to="/cadastro" className="rounded-xl bg-sage-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sage-700">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8">
        <PaidPricingPage publicView />
      </div>
    </main>
  )
}

function PaidPricingPage({ publicView = false }: { publicView?: boolean }) {

  const checkoutRef = useRef<HTMLElement | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [planChangeTarget, setPlanChangeTarget] = useState<Plan | null>(null)
  const [confirmCancelToFree, setConfirmCancelToFree] = useState(false)
  const { subscription, setSubscription } = useSubscriptionStore()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const navigate = useNavigate()
  const currentPlanId = String(subscription.planId ?? subscription.plan ?? '')
  const currentPlan = PLANS.find(plan => plan.id === currentPlanId)

  useEffect(() => { track(EVENTS.PLAN_PAGE_VIEWED) }, [])

  useEffect(() => {
    if (!selectedPlan) return
    window.setTimeout(() => {
      checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [selectedPlan])

  function formatCardNumber(value: string) {
    return value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')
  }

  function formatExpiry(value: string) {
    return value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2')
  }

  function formatCpfCnpj(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    if (digits.length > 11) {
      return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    }

    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
  }

  function formatPostalCode(value: string) {
    return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
  }

  function isValidCardNumber(value: string) {
    const digits = value.replace(/\D/g, '')
    if (digits.length < 13) return false

    let sum = 0
    let doubleDigit = false
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = Number(digits[i])
      if (doubleDigit) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      doubleDigit = !doubleDigit
    }

    return sum % 10 === 0
  }

  function isValidExpiry(value: string) {
    const [month, year] = value.split('/').map(Number)
    if (!month || !year || month < 1 || month > 12) return false

    const fullYear = 2000 + year
    const expiresAt = new Date(fullYear, month)
    return expiresAt > new Date()
  }

  function validateCard() {
    if (!isValidCardNumber(cardNumber)) return 'Numero do cartao invalido.'
    if (cardName.trim().length < 3) return 'Informe o nome impresso no cartao.'
    if (!isValidExpiry(cardExpiry)) return 'Validade invalida.'
    if (!/^\d{3,4}$/.test(cardCvv)) return 'CVV invalido.'
    if (!/^\d{11}$|^\d{14}$/.test(cpfCnpj.replace(/\D/g, ''))) return 'CPF/CNPJ invalido.'
    if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ''))) return 'Telefone invalido.'
    if (!/^\d{8}$/.test(postalCode.replace(/\D/g, ''))) return 'CEP invalido.'
    if (!addressNumber.trim()) return 'Informe o numero do endereco.'
    return null
  }

  async function tokenizeCard() {
    const [expiryMonth, expiryYear] = cardExpiry.split('/')
    const { data } = await api.post('/billing/tokenize', {
      creditCard: {
        holderName: cardName.trim(),
        number: cardNumber.replace(/\D/g, ''),
        expiryMonth,
        expiryYear: expiryYear.length === 2 ? `20${expiryYear}` : expiryYear,
        ccv: cardCvv,
      },
      creditCardHolderInfo: {
        name: cardName.trim(),
        cpfCnpj: cpfCnpj.replace(/\D/g, ''),
        postalCode: postalCode.replace(/\D/g, ''),
        addressNumber: addressNumber.trim(),
        phone: phone.replace(/\D/g, ''),
      },
    })

    const token = data?.creditCardToken
    if (!token) throw new Error('Nao foi possivel tokenizar o cartao.')
    return token
  }

  async function subscribe(plan: Plan) {
    if (plan.id === 'free') {
      setLoadingPlan(plan.id)
      try {
        const { data } = await api.post('/billing/free')
        setSubscription(data)
        toast.success('Plano Grátis ativado.')
      } catch (err: any) {
        toast.error(userSafeError(err, 'Nao foi possivel ativar o plano gratis.'))
      } finally {
        setLoadingPlan(null)
      }
      return
    }

    const validationError = validateCard()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoadingPlan(plan.id)
    try {
      const creditCardToken = await tokenizeCard()
      const endpoint = subscription.status === 'past_due' ? '/billing/update-card' : '/billing/subscribe'
      const body = subscription.status === 'past_due'
        ? { plan: plan.id, creditCardToken }
        : { plan: plan.id, creditCardToken }

      const { data } = await api.post(endpoint, body)
      setSubscription(data)
      track(EVENTS.SUBSCRIPTION_ACTIVE, { plan: plan.id })
      toast.success(
        subscription.status === 'past_due'
          ? `Cartao atualizado. Tentaremos cobrar no plano ${plan.name}.`
          : data.status === 'trialing'
            ? 'Teste iniciado! Voce tem 7 dias gratis.'
            : `Plano ${plan.name} ativado. A cobranca seguira o vencimento informado.`,
      )
    } catch (err: any) {
      toast.error(userSafeError(err, 'Cartao invalido ou pagamento recusado.'))
    } finally {
      setLoadingPlan(null)
    }
  }

  async function changePlan(plan: Plan) {
    setLoadingPlan(plan.id)
    try {
      const { data } = await api.post('/billing/change-plan', { plan: plan.id })
      setSubscription(data)
      setSelectedPlan(null)
      setPlanChangeTarget(null)
      toast.success(`Plano alterado para ${plan.name}.`)
    } catch (err: any) {
      toast.error(userSafeError(err, 'Nao foi possivel trocar o plano.'))
    } finally {
      setLoadingPlan(null)
    }
  }

  async function cancelSubscription() {
    setLoadingPlan('free')
    try {
      const { data } = await api.post('/billing/cancel')
      setSubscription(data)
      setSelectedPlan(null)
      setConfirmCancelToFree(false)
      toast.success(data.cancelAtPeriodEnd ? 'Cancelamento agendado para o fim do período.' : 'Plano cancelado.')
    } catch (err: any) {
      toast.error(userSafeError(err, 'Nao foi possivel cancelar o plano.'))
    } finally {
      setLoadingPlan(null)
    }
  }

  function handlePlanClick(plan: PricingPlan) {
    if (publicView) {
      navigate(isAuthenticated ? '/planos' : `/cadastro?plano=${plan.id}`)
      return
    }

    const billingPlan = PLANS.find(candidate => candidate.id === plan.id)
    if (!billingPlan) return
    const hasActivePlan = ['active', 'trialing'].includes(subscription.status)
    const isCurrentPlan = hasActivePlan && currentPlanId === plan.id
    const hasPaidPlan = hasActivePlan && currentPlanId !== 'free'

    if (isCurrentPlan) return
    if (plan.id === 'free') {
      if (hasPaidPlan) setConfirmCancelToFree(true)
      else subscribe(billingPlan)
      return
    }
    if (hasPaidPlan) {
      setPlanChangeTarget(billingPlan)
      return
    }
    track(EVENTS.CHECKOUT_STARTED, { plan: plan.id })
    setSelectedPlan(billingPlan)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-12">
      <PricingHero subscriptionStatus={subscription.status} />

      {subscription.status === 'active' && (
        <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="flex items-center gap-2 font-semibold">
            <UseCogniaIcon name="plan-professional" size={24} />
            Seu plano foi ativado
          </p>
          <Link to="/" className="mt-3 inline-flex h-10 items-center rounded-lg bg-sage-500 px-4 text-white transition-colors hover:bg-sage-600">
            Ir para dashboard
          </Link>
        </div>
      )}

      {subscription.status === 'past_due' && (
        <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Seu teste terminou e o pagamento falhou.</p>
          <p className="mt-1">Clique em Pagar agora e informe um novo cartao.</p>
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 px-1 md:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            currentPlanId={currentPlanId}
            loadingPlan={loadingPlan}
            hasActivePlan={['active', 'trialing'].includes(subscription.status)}
            hasPaidPlan={['active', 'trialing'].includes(subscription.status) && currentPlanId !== 'free'}
            isPastDue={subscription.status === 'past_due'}
            onClick={() => handlePlanClick(plan)}
          />
        ))}
      </section>

      <aside className="mx-auto max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
        <p>WhatsApp, pagamentos e IA dependem da configuração e disponibilidade dos respectivos provedores externos.</p>
        <p className="mt-1">A IA é um apoio opcional e pode ficar indisponível quando o provedor não estiver configurado.</p>
      </aside>

      {selectedPlan && (
        <CheckoutForm
          checkoutRef={checkoutRef}
          selectedPlan={selectedPlan}
          subscriptionStatus={subscription.status}
          loadingPlan={loadingPlan}
          cardNumber={cardNumber}
          cardName={cardName}
          cardExpiry={cardExpiry}
          cardCvv={cardCvv}
          cpfCnpj={cpfCnpj}
          phone={phone}
          postalCode={postalCode}
          addressNumber={addressNumber}
          setCardNumber={(value) => setCardNumber(formatCardNumber(value))}
          setCardName={(value) => setCardName(value.toUpperCase())}
          setCardExpiry={(value) => setCardExpiry(formatExpiry(value))}
          setCardCvv={(value) => setCardCvv(value.replace(/\D/g, '').slice(0, 4))}
          setCpfCnpj={(value) => setCpfCnpj(formatCpfCnpj(value))}
          setPhone={(value) => setPhone(formatPhone(value))}
          setPostalCode={(value) => setPostalCode(formatPostalCode(value))}
          setAddressNumber={(value) => setAddressNumber(value.replace(/\D/g, '').slice(0, 8))}
          onCancel={() => setSelectedPlan(null)}
          onSubmit={() => subscribe(selectedPlan)}
        />
      )}

      <PlanChangeDialog
        open={!!planChangeTarget}
        currentPlan={currentPlan}
        targetPlan={planChangeTarget}
        loading={!!planChangeTarget && loadingPlan === planChangeTarget.id}
        onClose={() => setPlanChangeTarget(null)}
        onConfirm={() => planChangeTarget && changePlan(planChangeTarget)}
      />

      <PlanCancelDialog
        open={confirmCancelToFree}
        currentPlan={currentPlan}
        loading={loadingPlan === 'free'}
        onClose={() => setConfirmCancelToFree(false)}
        onConfirm={cancelSubscription}
      />

      <PricingComparison />
      <PricingFAQ />
    </div>
  )
}

function PricingHero({ subscriptionStatus }: { subscriptionStatus: string }) {
  return (
    <section className="rounded-[2rem] border border-sage-100 bg-white px-5 py-12 text-center shadow-card dark:border-white/10 dark:bg-cognia-panel sm:px-8 lg:py-16">
      <p className="text-sm font-medium text-sage-600 dark:text-sage-300">{statusMessage(subscriptionStatus)}</p>
      <h1 className="mx-auto mt-3 max-w-4xl font-display text-3xl font-semibold leading-tight text-neutral-900 dark:text-white sm:text-5xl">
        {PRICING_HERO.title}
      </h1>
      <p className="mx-auto mt-5 max-w-3xl text-lg text-neutral-600 dark:text-neutral-300">
        {PRICING_HERO.subtitle}
      </p>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        {PRICING_HERO.context}
      </p>
      <div className="mt-8 inline-block rounded-2xl border border-sage-200 bg-sage-50 px-5 py-4 text-left dark:border-sage-400/30 dark:bg-sage-500/10">
        <p className="font-semibold text-sage-900 dark:text-sage-100">{PRICING_HERO.trialCta}</p>
        <p className="mt-1 text-sm text-sage-700 dark:text-sage-200">{PRICING_HERO.trialSubtext}</p>
      </div>
    </section>
  )
}

function PricingCard({
  plan,
  currentPlanId,
  loadingPlan,
  hasActivePlan,
  hasPaidPlan,
  isPastDue,
  onClick,
}: {
  plan: PricingPlan
  currentPlanId: string
  loadingPlan: string | null
  hasActivePlan: boolean
  hasPaidPlan: boolean
  isPastDue: boolean
  onClick: () => void
}) {
  const isCurrentPlan = hasActivePlan && currentPlanId === plan.id
  const isDisabled = loadingPlan !== null || isCurrentPlan
  const ctaLabel = isCurrentPlan
    ? 'Plano atual'
    : hasPaidPlan && plan.id === 'free'
      ? 'Cancelar e ir para Grátis'
      : hasPaidPlan
        ? `Trocar para ${plan.name}`
        : isPastDue
          ? 'Pagar agora'
          : plan.cta

  return (
    <section
      className={cn(
        'relative flex flex-col rounded-3xl border bg-white p-6 shadow-card transition dark:bg-cognia-panel',
        plan.featured
          ? 'border-purple-500 ring-4 ring-purple-100 md:-mt-4 md:pb-8'
          : 'border-neutral-100 dark:border-white/10',
      )}
    >
      {plan.badge && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-purple-700 px-4 py-1 text-xs font-bold text-white shadow-soft">
          {plan.badge}
        </span>
      )}

      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{plan.name}</h2>
        <p className="mt-2 min-h-12 text-sm font-semibold text-neutral-600 dark:text-neutral-300">{plan.description}</p>
        <div className="mt-5">
          {plan.id === 'free' ? (
            <span className="text-4xl font-bold text-neutral-900 dark:text-white">Grátis</span>
          ) : (
            <>
              <span className="text-sm text-neutral-400">R$ </span>
              <span className="text-4xl font-bold text-neutral-900 dark:text-white">{plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="ml-1 text-sm text-neutral-500 dark:text-neutral-400">{plan.pricePeriod}</span>
            </>
          )}
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          {plan.id === 'free' ? plan.pricePeriod : 'Cobrança mensal'}
        </p>
      </div>

      {plan.roi && (
        <div className="mt-5 rounded-2xl border-l-4 border-purple-600 bg-purple-50 p-4 dark:bg-purple-500/10">
          {plan.roi.items.map((item) => (
            <p key={item.text} className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              <RoiIcon type={item.type} />
              <span>{item.text}</span>
            </p>
          ))}
          <p className="text-xs italic text-neutral-600 dark:text-neutral-300">{plan.roi.note}</p>
        </div>
      )}

      <div className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <div key={`${feature.title}-${feature.subtitle}`} className="flex items-start gap-3">
            {feature.type === 'included' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />
            )}
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{feature.title}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{feature.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className={cn(
          'mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
          plan.featured ? 'bg-purple-700 text-white hover:bg-purple-800' : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200',
        )}
      >
        {loadingPlan === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
        {ctaLabel}
      </button>
      <p className="mt-2 whitespace-pre-line text-center text-xs text-neutral-500 dark:text-neutral-400">{plan.ctaSubtext}</p>
    </section>
  )
}

function PlanChangeDialog({
  open,
  currentPlan,
  targetPlan,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean
  currentPlan?: Plan
  targetPlan: Plan | null
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  if (!targetPlan) return null

  return (
    <Modal open={open} onClose={onClose} title="Confirmar troca de plano" size="sm">
      <div className="space-y-5">
        <div className="rounded-2xl border border-sage-100 bg-sage-50 p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-sage-600" />
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                {currentPlan ? `Plano ${currentPlan.name}` : 'Plano atual'} para {targetPlan.name}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                Os recursos passam a seguir o plano {targetPlan.name} agora. A diferença de valor entra na próxima fatura.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PlanMiniCard label="Atual" plan={currentPlan} muted />
          <PlanMiniCard label="Novo plano" plan={targetPlan} />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary text-sm">
            Manter plano atual
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sage-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar troca
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PlanCancelDialog({
  open,
  currentPlan,
  loading,
  onClose,
  onConfirm,
}: {
  open: boolean
  currentPlan?: Plan
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Ir para o plano Grátis" size="sm">
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-neutral-800">
            Cancelar {currentPlan ? `o plano ${currentPlan.name}` : 'o plano pago'}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            Você volta para os limites do plano Grátis. Seus dados continuam salvos, mas recursos pagos deixam de ficar disponíveis.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PlanMiniCard label="Atual" plan={currentPlan} muted />
          <PlanMiniCard label="Destino" plan={PLANS.find(plan => plan.id === 'free')} />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={loading} className="btn-secondary text-sm">
            Manter assinatura
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar mudança
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PlanMiniCard({ label, plan, muted = false }: { label: string; plan?: Plan; muted?: boolean }) {
  return (
    <div className={cn(
      'rounded-2xl border p-3',
      muted ? 'border-neutral-100 bg-neutral-50' : 'border-sage-200 bg-white',
    )}>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-800">{plan?.name ?? 'Sem plano'}</p>
      <p className="mt-1 text-xs text-neutral-500">
        {plan ? (plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês`) : 'Sem cobrança ativa'}
      </p>
    </div>
  )
}

function RoiIcon({ type }: { type: PricingRoiItem['type'] }) {
  const className = 'h-4 w-4 shrink-0 text-purple-700 dark:text-purple-200'
  if (type === 'time') return <Clock3 className={className} />
  if (type === 'attendance') return <Target className={className} />
  if (type === 'revenue') return <BadgeDollarSign className={className} />
  return <TrendingUp className={className} />
}

function PricingComparison() {
  return (
    <section className="mx-auto max-w-5xl px-1">
      <h2 className="mb-8 text-center text-3xl font-bold text-neutral-900 dark:text-white">{PRICING_COMPARISON.title}</h2>

      {/* Tabela em telas médias+; cards empilhados em mobile pra não espremer 4 colunas numa tela estreita */}
      <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 shadow-card dark:border-white/10 sm:block">
        <table className="w-full border-collapse bg-white text-left dark:bg-cognia-panel">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-white/10">
              <th className="w-40 px-5 py-4 text-sm font-semibold text-neutral-500 dark:text-neutral-400">Recurso</th>
              <th className="px-5 py-4 text-sm font-bold text-neutral-700 dark:text-neutral-200">Grátis</th>
              <th className="bg-purple-50 px-5 py-4 text-sm font-bold text-purple-700 dark:bg-purple-500/10 dark:text-purple-200">Pro</th>
            </tr>
          </thead>
          <tbody>
            {PRICING_COMPARISON.sections.map((row, index) => (
              <tr
                key={row.title}
                className={cn(
                  'border-b border-neutral-100 last:border-0 dark:border-white/5',
                  index % 2 === 1 && 'bg-neutral-50/60 dark:bg-white/[0.02]',
                )}
              >
                <td className="px-5 py-4 text-sm font-semibold text-neutral-800 dark:text-neutral-100">{row.title}</td>
                <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-300">{row.free}</td>
                <td className="bg-purple-50/40 px-5 py-4 text-sm text-neutral-700 dark:bg-purple-500/5 dark:text-neutral-300">{row.pro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 sm:hidden">
        {PRICING_COMPARISON.sections.map((row) => (
          <div key={row.title} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card dark:border-white/10 dark:bg-cognia-panel">
            <h3 className="mb-4 text-lg font-bold text-neutral-900 dark:text-white">{row.title}</h3>
            <div className="space-y-3">
              <div className="rounded-xl bg-neutral-50 p-4 dark:bg-white/5">
                <p className="mb-1 font-semibold text-neutral-600 dark:text-neutral-300">Grátis</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{row.free}</p>
              </div>
              <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-500/10">
                <p className="mb-1 font-semibold text-purple-700 dark:text-purple-200">Pro</p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{row.pro}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PricingFAQ() {
  return (
    <section className="mx-auto max-w-3xl px-1">
      <h2 className="mb-8 text-center text-3xl font-bold text-neutral-900 dark:text-white">Duvidas frequentes</h2>
      <div className="space-y-3">
        {PRICING_FAQ.map((item) => <PricingFAQItem key={item.question} item={item} />)}
      </div>
    </section>
  )
}

function PricingFAQItem({ item }: { item: typeof PRICING_FAQ[number] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card dark:border-white/10 dark:bg-cognia-panel">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-neutral-900 hover:bg-neutral-50 dark:text-white dark:hover:bg-white/5"
      >
        {item.question}
        <span className="text-lg text-sage-600">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t border-neutral-100 px-5 py-4 text-sm leading-6 text-neutral-600 dark:border-white/10 dark:text-neutral-300">{item.answer}</div>}
    </div>
  )
}

function CheckoutForm({
  checkoutRef,
  selectedPlan,
  subscriptionStatus,
  loadingPlan,
  cardNumber,
  cardName,
  cardExpiry,
  cardCvv,
  cpfCnpj,
  phone,
  postalCode,
  addressNumber,
  setCardNumber,
  setCardName,
  setCardExpiry,
  setCardCvv,
  setCpfCnpj,
  setPhone,
  setPostalCode,
  setAddressNumber,
  onCancel,
  onSubmit,
}: {
  checkoutRef?: React.Ref<HTMLElement>
  selectedPlan: Plan
  subscriptionStatus: string
  loadingPlan: string | null
  cardNumber: string
  cardName: string
  cardExpiry: string
  cardCvv: string
  cpfCnpj: string
  phone: string
  postalCode: string
  addressNumber: string
  setCardNumber: (value: string) => void
  setCardName: (value: string) => void
  setCardExpiry: (value: string) => void
  setCardCvv: (value: string) => void
  setCpfCnpj: (value: string) => void
  setPhone: (value: string) => void
  setPostalCode: (value: string) => void
  setAddressNumber: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  return (
    <section ref={checkoutRef} className="scroll-mt-4 mx-auto max-w-xl rounded-2xl border border-neutral-100 bg-white p-5 shadow-card dark:border-white/10 dark:bg-cognia-panel sm:p-6">
      <div className="mb-5">
        <h2 className="font-semibold text-neutral-800 dark:text-white">Cartao de credito</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-300">
          Plano {selectedPlan.name}. Os dados do cartao sao enviados ao Asaas para tokenizacao. Voce nao sera cobrado agora.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Numero do cartao</label>
          <input className="input-field font-mono" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} />
        </div>

        <div>
          <label className="label">Nome no cartao</label>
          <input className="input-field" autoComplete="cc-name" placeholder="NOME COMO NO CARTAO" value={cardName} onChange={(event) => setCardName(event.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Validade</label>
            <input className="input-field" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={cardExpiry} onChange={(event) => setCardExpiry(event.target.value)} />
          </div>
          <div>
            <label className="label">CVV</label>
            <input className="input-field" inputMode="numeric" autoComplete="cc-csc" placeholder="123" type="password" value={cardCvv} onChange={(event) => setCardCvv(event.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">CPF/CNPJ do titular</label>
            <input className="input-field" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={cpfCnpj} onChange={(event) => setCpfCnpj(event.target.value)} />
          </div>
          <div>
            <label className="label">Telefone</label>
            <input className="input-field" inputMode="numeric" autoComplete="tel" placeholder="(11) 99999-9999" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">CEP</label>
            <input className="input-field" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
          </div>
          <div>
            <label className="label">Numero</label>
            <input className="input-field" inputMode="numeric" autoComplete="off" placeholder="123" value={addressNumber} onChange={(event) => setAddressNumber(event.target.value)} />
          </div>
        </div>

        <button type="button" onClick={onSubmit} disabled={loadingPlan !== null} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-sage-600 text-sm font-medium text-white transition-colors hover:bg-sage-700 disabled:opacity-60">
          {loadingPlan === selectedPlan.id && <Loader2 className="h-4 w-4 animate-spin" />}
          {subscriptionStatus === 'past_due' ? 'Pagar agora' : 'Iniciar teste gratis'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loadingPlan !== null}
          className="flex h-10 w-full items-center justify-center rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-60 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
        >
          Escolher outro plano
        </button>
      </div>
    </section>
  )
}
