import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { PLANS, Plan, useSubscriptionStore } from '@/store/subscription'

function statusMessage(status: string) {
  if (status === 'pending') return 'Aguardando pagamento'
  if (status === 'trialing') return 'Você está em período de teste'
  if (status === 'past_due') return 'Seu teste terminou e o pagamento falhou.'
  if (status === 'active') return 'Acesso normal'
  return 'Escolha um plano para continuar'
}

export default function PricingPage() {
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
  const { subscription, setSubscription } = useSubscriptionStore()
  const currentPlanId = String(subscription.planId ?? subscription.plan ?? '')

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
    if (!isValidCardNumber(cardNumber)) return 'Número do cartão inválido.'
    if (cardName.trim().length < 3) return 'Informe o nome impresso no cartão.'
    if (!isValidExpiry(cardExpiry)) return 'Validade inválida.'
    if (!/^\d{3,4}$/.test(cardCvv)) return 'CVV inválido.'
    if (!/^\d{11}$|^\d{14}$/.test(cpfCnpj.replace(/\D/g, ''))) return 'CPF/CNPJ invalido.'
    if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ''))) return 'Telefone invalido.'
    if (!/^\d{8}$/.test(postalCode.replace(/\D/g, ''))) return 'CEP invalido.'
    if (!addressNumber.trim()) return 'Informe o numero do endereco.'
    return null
  }

  async function tokenizeCard() {
    const [expiryMonth, expiryYear] = cardExpiry.split('/')
    const { data } = await api.post('/billing/tokenize', {
      holderName: cardName.trim(),
      number: cardNumber.replace(/\D/g, ''),
      expiryMonth,
      expiryYear: expiryYear.length === 2 ? `20${expiryYear}` : expiryYear,
      ccv: cardCvv,
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      postalCode: postalCode.replace(/\D/g, ''),
      addressNumber: addressNumber.trim(),
      phone: phone.replace(/\D/g, ''),
    })

    const token = data?.creditCardToken
    if (!token) throw new Error('Não foi possível tokenizar o cartão.')
    return token
  }

  async function subscribe(plan: Plan) {
    if (plan.id === 'free') {
      setLoadingPlan(plan.id)
      try {
        const { data } = await api.post('/billing/free')
        setSubscription(data)
        toast.success('Plano Gratis ativado.')
      } catch (err: any) {
        toast.error(err?.response?.data?.message ?? 'Nao foi possivel ativar o plano gratis.')
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
        ? { creditCardToken }
        : { plan: plan.id, creditCardToken }

      const { data } = await api.post(endpoint, body)
      setSubscription(data)
      toast.success(
        subscription.status === 'past_due'
          ? 'Cartão atualizado. Tentaremos cobrar novamente.'
          : 'Teste iniciado! Você tem 7 dias grátis.',
      )
    } catch (err: any) {
      toast.error(
        err?.response?.data?.errors?.[0]?.description ??
        err?.response?.data?.message ??
        err?.message ??
        'Cartão inválido ou pagamento recusado.',
      )
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-sage-600">{statusMessage(subscription.status)}</p>
        <h1 className="font-display text-3xl font-light text-neutral-800">Planos</h1>
        {subscription.status === 'active' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
            <p className="font-semibold">Seu plano foi ativado 🎉</p>
            <Link to="/" className="mt-3 inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-white">
              Ir para dashboard
            </Link>
          </div>
        )}
        <p className="text-neutral-500">
          Comece gratis ou teste um plano pago por 7 dias. O Essencial organiza a rotina; o Pro libera pagamentos, mensagens e automacoes; o Clinica atende equipes.
        </p>
        {subscription.status === 'past_due' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Seu teste terminou e o pagamento falhou.</p>
            <p className="mt-1">Clique em Pagar agora e informe um novo cartão.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlanId === plan.id
          const isActivePaidPlan = subscription.status === 'active' && currentPlanId !== 'free'
          const isDisabled = loadingPlan !== null || isActivePaidPlan
          return (
          <section
            key={plan.id}
            className={cn(
              'relative bg-white border rounded-2xl p-6 flex flex-col gap-5 shadow-card',
              plan.highlight ? 'border-sage-300 ring-1 ring-sage-100' : 'border-neutral-100',
            )}
          >
            {plan.highlight && (
              <span className="absolute right-4 top-4 rounded-full bg-sage-100 px-2.5 py-1 text-xs font-medium text-sage-700">
                Recomendado para vender
              </span>
            )}
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">{plan.name}</h2>
              <p className="mt-1 min-h-10 text-sm text-neutral-500">{plan.audience}</p>
              <div className="mt-3 flex items-end gap-1">
                {plan.price === 0 ? (
                  <span className="text-3xl font-bold text-neutral-900">Gratis</span>
                ) : (
                  <>
                    <span className="text-sm text-neutral-400 mb-1">R$</span>
                    <span className="text-3xl font-bold text-neutral-900">{plan.price}</span>
                    <span className="text-sm text-neutral-400 mb-1">/mes</span>
                  </>
                )}
              </div>
              {plan.price > 0 ? (
                <p className="mt-1 text-xs text-neutral-400">
                  Anual: R$ {plan.priceYearly}/mes, cobrado por ano
                </p>
              ) : (
                <p className="mt-1 text-xs text-neutral-400">Sem cartao e sem prazo para expirar</p>
              )}
            </div>

            <ul className="space-y-2 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-neutral-600">
                  <Check className="w-4 h-4 text-sage-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => plan.id === 'free' ? subscribe(plan) : setSelectedPlan(plan)}
              disabled={isDisabled}
              className={cn(
                'h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                plan.highlight
                  ? 'bg-sage-600 text-white hover:bg-sage-700'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
                isDisabled && 'opacity-60 cursor-not-allowed',
              )}
            >
              {loadingPlan === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
              {isActivePaidPlan && isCurrentPlan
                ? 'Plano atual'
                : isActivePaidPlan
                  ? 'Troca pelo suporte'
                  : subscription.status === 'past_due'
                  ? 'Pagar agora'
                  : plan.id === 'free'
                    ? 'Comecar gratis'
                    : 'Testar 7 dias gratis'}
            </button>
          </section>
          )
        })}
      </div>

      {selectedPlan && (
        <section className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-card max-w-xl">
          <div className="mb-5">
            <h2 className="font-semibold text-neutral-800">Cartão de crédito</h2>
            <p className="text-sm text-neutral-500">
              Plano {selectedPlan.name}. Os dados do cartao sao enviados ao Asaas para tokenizacao.
              Voce nao sera cobrado agora. A cobranca sera feita apos 7 dias.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Número do cartão</label>
              <input
                className="input-field font-mono"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
              />
            </div>

            <div>
              <label className="label">Nome no cartão</label>
              <input
                className="input-field"
                autoComplete="cc-name"
                placeholder="NOME COMO NO CARTÃO"
                value={cardName}
                onChange={(event) => setCardName(event.target.value.toUpperCase())}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Validade</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/AA"
                  value={cardExpiry}
                  onChange={(event) => setCardExpiry(formatExpiry(event.target.value))}
                />
              </div>

              <div>
                <label className="label">CVV</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                  type="password"
                  value={cardCvv}
                  onChange={(event) => setCardCvv(event.target.value.replace(/\D/g, '').slice(0, 4))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CPF/CNPJ do titular</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="000.000.000-00"
                  value={cpfCnpj}
                  onChange={(event) => setCpfCnpj(formatCpfCnpj(event.target.value))}
                />
              </div>

              <div>
                <label className="label">Telefone</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(event) => setPhone(formatPhone(event.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CEP</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="00000-000"
                  value={postalCode}
                  onChange={(event) => setPostalCode(formatPostalCode(event.target.value))}
                />
              </div>

              <div>
                <label className="label">Numero</label>
                <input
                  className="input-field"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="123"
                  value={addressNumber}
                  onChange={(event) => setAddressNumber(event.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => subscribe(selectedPlan)}
              disabled={loadingPlan !== null}
              className="h-11 rounded-xl bg-sage-600 text-white hover:bg-sage-700 text-sm font-medium flex items-center justify-center gap-2 transition-colors w-full disabled:opacity-60"
            >
              {loadingPlan === selectedPlan.id && <Loader2 className="w-4 h-4 animate-spin" />}
              {subscription.status === 'past_due' ? 'Pagar agora' : 'Iniciar teste grátis'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
