import { useState } from 'react'
import { X, CreditCard, Smartphone, Barcode, Lock, CheckCircle2, Copy, Zap } from 'lucide-react'
import { Plan, useSubscriptionStore } from '@/store/subscription'
import { useNotificationStore } from '@/store/notifications'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

type PaymentMethod = 'pix' | 'card' | 'boleto'
type Step = 'method' | 'pix' | 'card' | 'boleto' | 'success'

interface Props {
  plan: Plan
  yearly: boolean
  onClose: () => void
}

const MOCK_PIX_CODE = 'pix.psicosaas.com.br/pay/8F3A2B1C9D7E6F5A4B3C2D1E0F9A8B7C'
const MOCK_BOLETO_LINE = '34191.79001 01043.510047 91020.150008 8 93370000007900'

export default function CheckoutModal({ plan, yearly, onClose }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [step, setStep] = useState<Step>('method')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Card fields
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCvv] = useState('')
  const [installments, setInstallments] = useState(1)

  const price = yearly ? plan.priceYearly : plan.price
  const totalYearly = price * 12
  const navigate = useNavigate()

  function formatCard(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim()
  }
  function formatExpiry(v: string) {
    return v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2')
  }

  async function handlePay() {
    setLoading(true)
    await new Promise(r => setTimeout(r, method === 'pix' ? 800 : 1400))
    setLoading(false)

    if (method === 'pix') {
      setStep('pix')
    } else if (method === 'boleto') {
      setStep('boleto')
    } else {
      // Simula pagamento com cartão
      confirmSubscription()
    }
  }

  function confirmSubscription() {
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + (yearly ? 12 : 1))

    useSubscriptionStore.getState().setSubscription({
      planId: plan.id,
      status: 'active',
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
    })

    useNotificationStore.getState().addNotification({
      type: 'system',
      title: `Assinatura ${plan.name} ativada! 🎉`,
      body: `Seu plano ${plan.name} está ativo. Próxima cobrança em ${periodEnd.toLocaleDateString('pt-BR')}.`,
      link: '/configuracoes',
    })

    setStep('success')
  }

  function simulatePixPayment() {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      confirmSubscription()
    }, 1500)
  }

  function copyPix() {
    navigator.clipboard.writeText(MOCK_PIX_CODE)
    setCopied(true)
    toast.success('Código copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  function copyBoleto() {
    navigator.clipboard.writeText(MOCK_BOLETO_LINE)
    toast.success('Linha digitável copiada!')
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <div>
            <p className="font-semibold text-neutral-800">
              {step === 'success' ? 'Pagamento confirmado!' : `Assinar plano ${plan.name}`}
            </p>
            {step === 'method' && (
              <p className="text-xs text-neutral-400 mt-0.5">
                R$ {price}/mês{yearly ? ` · R$ ${totalYearly}/ano` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        <div className="p-6">

          {/* ── Sucesso ──────────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-20 h-20 bg-sage-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-sage-500" />
              </div>
              <div>
                <p className="font-semibold text-neutral-800 text-lg">Bem-vinda ao {plan.name}! 🌱</p>
                <p className="text-neutral-500 text-sm mt-1">
                  Sua assinatura está ativa. Aproveite todos os recursos!
                </p>
              </div>
              <button
                onClick={() => { onClose(); navigate('/') }}
                className="btn-primary w-full"
              >
                Ir para o dashboard
              </button>
            </div>
          )}

          {/* ── Escolher método ───────────────────────────────────────── */}
          {step === 'method' && (
            <div className="space-y-5">
              {/* Resumo do plano */}
              <div className="bg-sage-50 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sage-800 text-sm">Plano {plan.name}</p>
                  <p className="text-sage-600 text-xs">
                    R$ {price}/mês{yearly ? ` · R$ ${totalYearly} cobrado anualmente` : ' · Renovação mensal'}
                  </p>
                </div>
              </div>

              {/* Métodos de pagamento */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-3">Forma de pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'pix' as PaymentMethod, label: 'PIX', icon: <Smartphone className="w-5 h-5" />, badge: '5% off' },
                    { id: 'card' as PaymentMethod, label: 'Cartão', icon: <CreditCard className="w-5 h-5" /> },
                    { id: 'boleto' as PaymentMethod, label: 'Boleto', icon: <Barcode className="w-5 h-5" /> },
                  ] as const).map(({ id, label, icon, badge }) => (
                    <button
                      key={id}
                      onClick={() => setMethod(id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all relative',
                        method === id
                          ? 'border-sage-400 bg-sage-50 text-sage-700'
                          : 'border-neutral-200 text-neutral-500 hover:border-neutral-300',
                      )}
                    >
                      {badge && (
                        <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {badge}
                        </span>
                      )}
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cartão — campos */}
              {method === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="label">Número do cartão</label>
                    <input
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCard(e.target.value))}
                      className="input-field font-mono"
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <label className="label">Nome no cartão</label>
                    <input
                      value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      className="input-field"
                      placeholder="NOME COMO NO CARTÃO"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Validade</label>
                      <input
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        className="input-field"
                        placeholder="MM/AA"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="label">CVV</label>
                      <input
                        value={cardCvv}
                        onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="input-field"
                        placeholder="123"
                        maxLength={4}
                        type="password"
                      />
                    </div>
                  </div>
                  {!yearly && (
                    <div>
                      <label className="label">Parcelas</label>
                      <select
                        value={installments}
                        onChange={e => setInstallments(Number(e.target.value))}
                        className="input-field"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>
                            {n}x de R$ {(price / n).toFixed(2)}{n > 1 ? ' sem juros' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Lock className="w-4 h-4" />}
                {loading ? 'Processando...' : method === 'pix' ? 'Gerar QR Code PIX' : method === 'boleto' ? 'Gerar boleto' : 'Finalizar pagamento'}
              </button>

              <p className="text-center text-xs text-neutral-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Pagamento 100% seguro e criptografado
              </p>
            </div>
          )}

          {/* ── PIX ──────────────────────────────────────────────────── */}
          {step === 'pix' && (
            <div className="space-y-5 text-center">
              <p className="text-sm text-neutral-600">
                Escaneie o QR Code ou copie o código Pix para pagar
              </p>

              {/* QR Code simulado */}
              <div className="w-48 h-48 mx-auto bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-2">
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={cn('w-5 h-5 rounded-sm', i % 3 === 0 || i === 4 ? 'bg-neutral-800' : 'bg-neutral-200')} />
                  ))}
                </div>
                <p className="text-xs text-neutral-400 mt-1">QR Code PIX</p>
              </div>

              <div className="bg-neutral-50 rounded-xl p-3 flex items-center gap-2">
                <p className="text-xs text-neutral-500 font-mono flex-1 truncate">{MOCK_PIX_CODE}</p>
                <button onClick={copyPix} className="shrink-0 p-1.5 hover:bg-white rounded-lg transition-colors">
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-neutral-400" />}
                </button>
              </div>

              <div className="space-y-2 text-xs text-neutral-400">
                <p>⏱ Código válido por <strong>30 minutos</strong></p>
                <p>💰 Valor: <strong>R$ {(price * (yearly ? 12 : 1) * 0.95).toFixed(2)}</strong> (5% de desconto PIX)</p>
              </div>

              <button
                onClick={simulatePixPayment}
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verificando pagamento...</>
                  : '✅ Simular pagamento confirmado'
                }
              </button>
            </div>
          )}

          {/* ── Boleto ───────────────────────────────────────────────── */}
          {step === 'boleto' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
                ⚠️ O boleto pode levar até <strong>2 dias úteis</strong> para compensar. Seu plano será ativado após a confirmação.
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-700">Linha digitável</p>
                <div className="bg-neutral-50 rounded-xl p-3 flex items-center gap-2">
                  <p className="text-xs text-neutral-500 font-mono flex-1 break-all">{MOCK_BOLETO_LINE}</p>
                  <button onClick={copyBoleto} className="shrink-0 p-1.5 hover:bg-white rounded-lg">
                    <Copy className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-neutral-400 space-y-1">
                <p>📅 Vencimento: <strong>{new Date(Date.now() + 3 * 86400000).toLocaleDateString('pt-BR')}</strong></p>
                <p>💰 Valor: <strong>R$ {(price * (yearly ? 12 : 1)).toFixed(2)}</strong></p>
              </div>

              <button className="btn-primary w-full">
                📄 Baixar boleto PDF
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
