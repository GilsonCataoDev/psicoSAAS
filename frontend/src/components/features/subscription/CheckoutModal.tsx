import { useState } from 'react'
import { X, CreditCard, Smartphone, Barcode, Lock, CheckCircle2, Copy, Zap, AlertCircle } from 'lucide-react'
import { Plan, useSubscriptionStore } from '@/store/subscription'
import { api, USE_MOCK } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

type PaymentMethod = 'pix' | 'card' | 'boleto'
type Step = 'method' | 'pix' | 'boleto' | 'success'

interface Props {
  plan: Plan
  yearly: boolean
  onClose: () => void
}

export default function CheckoutModal({ plan, yearly, onClose }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const [step, setStep] = useState<Step>('method')
  const [loading, setLoading] = useState(false)

  // Campos do cartão
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCvv] = useState('')
  const [installments, setInstallments] = useState(1)

  // Dados do titular (necessário pelo Asaas)
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [cep, setCep] = useState('')
  const [addressNumber, setAddressNumber] = useState('')

  // Dados retornados pelo backend para PIX/Boleto
  const [pixCode, setPixCode] = useState('')
  const [pixQrCode, setPixQrCode] = useState('')
  const [boletoUrl, setBoletoUrl] = useState('')
  const [boletoLine, setBoletoLine] = useState('')
  const [copied, setCopied] = useState(false)

  const price = yearly ? plan.priceYearly : plan.price
  const navigate = useNavigate()

  function formatCard(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')
  }
  function formatExpiry(v: string) {
    return v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2')
  }
  function formatCpf(v: string) {
    return v.replace(/\D/g, '').slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  function formatPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
  }
  function formatCep(v: string) {
    return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
  }

  function confirmSubscriptionLocally(periodEnd: Date) {
    useSubscriptionStore.getState().setSubscription({
      planId: plan.id,
      status: 'active',
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
    })
  }

  async function handlePay() {
    // ── Validação básica ──────────────────────────────────────────────────
    if (cpf.replace(/\D/g, '').length !== 11) { toast.error('CPF invalido'); return }

    if (method === 'card') {
      const digits = cardNumber.replace(/\s/g, '')
      if (digits.length < 13) { toast.error('Número do cartão inválido'); return }
      if (!cardName.trim()) { toast.error('Informe o nome do titular'); return }
      if (cardExpiry.length < 5) { toast.error('Validade inválida'); return }
      if (cardCvv.length < 3) { toast.error('CVV inválido'); return }
      if (cpf.replace(/\D/g, '').length !== 11) { toast.error('CPF inválido'); return }
      if (phone.replace(/\D/g, '').length < 10) { toast.error('Telefone inválido'); return }
      if (cep.replace(/\D/g, '').length !== 8) { toast.error('CEP inválido'); return }
      if (!addressNumber.trim()) { toast.error('Informe o número do endereço'); return }
    }

    setLoading(true)
    try {
      if (USE_MOCK) {
        // ── Modo mock (sem backend) ────────────────────────────────────────
        await new Promise(r => setTimeout(r, 1200))

        if (method === 'card') {
          const periodEnd = new Date()
          yearly ? periodEnd.setFullYear(periodEnd.getFullYear() + 1) : periodEnd.setMonth(periodEnd.getMonth() + 1)
          confirmSubscriptionLocally(periodEnd)
          setStep('success')
        } else if (method === 'pix') {
          setPixCode('00020126580014br.gov.bcb.pix0136f9e72e21-5c72-4e2c-a0d4-8e7d3f2b1c5a5204000053039865802BR5925USECOGNIA TECNOLOGIA LT6009SAO PAULO62070503***6304B14F')
          setPixQrCode('')
          setStep('pix')
        } else {
          setBoletoLine('34191.79001 01043.510047 91020.150008 8 93370000007900')
          setBoletoUrl('#')
          setStep('boleto')
        }
        return
      }

      // ── Chamada real ao backend ────────────────────────────────────────
      const billingType = method === 'pix' ? 'PIX' : method === 'boleto' ? 'BOLETO' : 'CREDIT_CARD'

      const payload: any = {
        planId: plan.id,
        billingType,
        yearly,
        cpfCnpj: cpf.replace(/\D/g, ''),
      }

      if (method === 'card') {
        const [expiryMonth, expiryYear] = cardExpiry.split('/')
        payload.creditCard = {
          holderName: cardName,
          number: cardNumber.replace(/\s/g, ''),
          expiryMonth,
          expiryYear: expiryYear?.length === 2 ? `20${expiryYear}` : expiryYear,
          ccv: cardCvv,
        }
        payload.creditCardHolderInfo = {
          name: cardName,
          email: '',       // preenchido pelo backend via user.email
          cpfCnpj: cpf.replace(/\D/g, ''),
          postalCode: cep.replace(/\D/g, ''),
          addressNumber,
          phone: phone.replace(/\D/g, ''),
        }
      }

      const { data } = await api.post('/subscriptions', payload)

      if (method === 'card') {
        const periodEnd = new Date()
        yearly ? periodEnd.setFullYear(periodEnd.getFullYear() + 1) : periodEnd.setMonth(periodEnd.getMonth() + 1)
        confirmSubscriptionLocally(periodEnd)
        setStep('success')
      } else if (method === 'pix' && data.pixCode) {
        setPixCode(data.pixCode)
        setPixQrCode(data.pixQrCode ?? '')
        setStep('pix')
      } else if (method === 'boleto' && data.boletoLine) {
        setBoletoLine(data.boletoLine)
        setBoletoUrl(data.boletoUrl ?? '')
        setStep('boleto')
      } else {
        // PIX/Boleto gerado mas sem link ainda (Asaas pode demorar)
        setStep(method === 'pix' ? 'pix' : 'boleto')
        toast('Aguardando geração do código de pagamento...')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao processar pagamento. Tente novamente.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function copyCode(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md my-4 overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
          <div>
            <p className="font-semibold text-neutral-800">
              {step === 'success' ? 'Pagamento confirmado!' : `Assinar plano ${plan.name}`}
            </p>
            {step === 'method' && (
              <p className="text-xs text-neutral-400 mt-0.5">
                R$ {price}/mês{yearly ? ` · cobrado anualmente R$ ${price * 12}` : ''}
                {USE_MOCK && <span className="ml-2 bg-amber-100 text-amber-600 px-1.5 rounded text-[10px] font-medium">SANDBOX</span>}
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
                <p className="text-neutral-500 text-sm mt-1">Sua assinatura está ativa. Aproveite!</p>
              </div>
              <button onClick={() => { onClose(); navigate('/') }} className="btn-primary w-full">
                Ir para o dashboard
              </button>
            </div>
          )}

          {/* ── Método de pagamento ───────────────────────────────────── */}
          {step === 'method' && (
            <div className="space-y-5">
              {/* Resumo */}
              <div className="bg-sage-50 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sage-800 text-sm">Plano {plan.name}</p>
                  <p className="text-sage-600 text-xs">
                    R$ {price}/mês{yearly ? ` · R$ ${price * 12} cobrado anualmente` : ' · Renovação mensal'}
                  </p>
                </div>
              </div>

              {/* Seleção de método */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-3">Forma de pagamento</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'pix' as PaymentMethod, label: 'PIX', icon: <Smartphone className="w-5 h-5" />, badge: '5% off' },
                    { id: 'card' as PaymentMethod, label: 'Cartão', icon: <CreditCard className="w-5 h-5" /> },
                    { id: 'boleto' as PaymentMethod, label: 'Boleto', icon: <Barcode className="w-5 h-5" /> },
                  ]).map(({ id, label, icon, badge }) => (
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

              {/* ── Campos do cartão ─────────────────────────────────── */}
              <div>
                <label className="label">CPF do titular</label>
                <input
                  value={cpf}
                  onChange={e => setCpf(formatCpf(e.target.value))}
                  className="input-field"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  inputMode="numeric"
                />
              </div>

              {method === 'card' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex gap-2 text-xs text-amber-700">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Dados enviados diretamente ao Asaas (PCI-DSS Nível 1) — nunca armazenamos seu cartão.
                  </div>

                  <div>
                    <label className="label">Número do cartão</label>
                    <input
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCard(e.target.value))}
                      className="input-field font-mono"
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label className="label">Nome no cartão</label>
                    <input
                      value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      className="input-field"
                      placeholder="NOME COMO ESTÁ NO CARTÃO"
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
                        inputMode="numeric"
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
                        inputMode="numeric"
                        type="password"
                      />
                    </div>
                  </div>

                  {/* Dados do titular — obrigatório Asaas */}
                  <p className="text-xs font-medium text-neutral-500 pt-1 border-t border-neutral-100">
                    Dados do titular (obrigatório pelo emissor)
                  </p>
                  <div>
                    <label className="label">Telefone</label>
                    <input
                      value={phone}
                      onChange={e => setPhone(formatPhone(e.target.value))}
                      className="input-field"
                      placeholder="(11) 99999-9999"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">CEP</label>
                      <input
                        value={cep}
                        onChange={e => setCep(formatCep(e.target.value))}
                        className="input-field"
                        placeholder="00000-000"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="label">Número</label>
                      <input
                        value={addressNumber}
                        onChange={e => setAddressNumber(e.target.value)}
                        className="input-field"
                        placeholder="123"
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
                        {[1, 2, 3, 6, 12].map(n => (
                          <option key={n} value={n}>
                            {n}x de R$ {(price / n).toFixed(2).replace('.', ',')} sem juros
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
                {loading
                  ? 'Processando...'
                  : method === 'pix' ? 'Gerar QR Code PIX'
                  : method === 'boleto' ? 'Gerar boleto'
                  : 'Finalizar pagamento'}
              </button>

              <p className="text-center text-xs text-neutral-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Pagamento processado pelo Asaas · PCI-DSS Nível 1
              </p>
            </div>
          )}

          {/* ── PIX ──────────────────────────────────────────────────── */}
          {step === 'pix' && (
            <div className="space-y-5 text-center">
              <p className="text-sm text-neutral-600">Copie o código Pix ou escaneie o QR Code</p>

              {/* QR Code — imagem real do Asaas ou placeholder */}
              <div className="w-48 h-48 mx-auto rounded-2xl border-2 border-neutral-100 overflow-hidden flex items-center justify-center bg-white">
                {pixQrCode ? (
                  <img src={`data:image/png;base64,${pixQrCode}`} alt="QR Code PIX" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4">
                    <Smartphone className="w-12 h-12 text-neutral-200 mx-auto mb-2" />
                    <p className="text-xs text-neutral-400">QR Code gerado pelo banco</p>
                  </div>
                )}
              </div>

              {pixCode && (
                <div className="bg-neutral-50 rounded-xl p-3 flex items-center gap-2 text-left">
                  <p className="text-xs text-neutral-500 font-mono flex-1 break-all line-clamp-3">{pixCode}</p>
                  <button onClick={() => copyCode(pixCode)} className="shrink-0 p-1.5 hover:bg-white rounded-lg">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-neutral-400" />}
                  </button>
                </div>
              )}

              <div className="text-xs text-neutral-400 space-y-1">
                <p>⏱ Código válido por <strong>30 minutos</strong></p>
                <p>💰 Valor: <strong>R$ {(price * (yearly ? 12 : 1) * 0.95).toFixed(2).replace('.', ',')}</strong> (5% desc. PIX)</p>
                <p>✅ Plano ativado <strong>automaticamente</strong> após confirmação</p>
              </div>
            </div>
          )}

          {/* ── Boleto ───────────────────────────────────────────────── */}
          {step === 'boleto' && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
                ⚠️ O boleto pode levar até <strong>2 dias úteis</strong> para compensar. Seu plano será ativado após a confirmação.
              </div>

              {boletoLine && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-neutral-700">Linha digitável</p>
                  <div className="bg-neutral-50 rounded-xl p-3 flex items-center gap-2">
                    <p className="text-xs text-neutral-500 font-mono flex-1 break-all">{boletoLine}</p>
                    <button onClick={() => copyCode(boletoLine)} className="shrink-0 p-1.5">
                      <Copy className="w-4 h-4 text-neutral-400" />
                    </button>
                  </div>
                </div>
              )}

              {boletoUrl && boletoUrl !== '#' && (
                <a href={boletoUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full flex items-center justify-center gap-2">
                  <Barcode className="w-4 h-4" />
                  Baixar boleto PDF
                </a>
              )}

              <div className="text-xs text-neutral-400 space-y-1">
                <p>📅 Vencimento: <strong>{new Date(Date.now() + 3 * 86400000).toLocaleDateString('pt-BR')}</strong></p>
                <p>💰 Valor: <strong>R$ {(price * (yearly ? 12 : 1)).toFixed(2).replace('.', ',')}</strong></p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
