import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ExternalLink, CheckCircle2, AlertCircle, CreditCard, Lock } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'
import { api } from '@/lib/api'
import { isValidCrpFormat, getCrpRegion, openCfpVerification, formatCrpInput } from '@/lib/crp'
import { DEFAULT_PROFESSION, PROFESSIONS, PROFESSION_LABELS, councilLabel, requiresCrp, type Profession } from '@/lib/professions'
import { useTokenizeCard, useSubscribeTrial } from '@/hooks/api/billing'
import toast from 'react-hot-toast'
import { track, EVENTS, trackMetaConversion } from '@/lib/analytics'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'

// ── Step 1: dados da conta ─────────────────────────────────────────────────

const accountSchema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  profession: z.enum(PROFESSIONS).default(DEFAULT_PROFESSION),
  isStudent: z.boolean().optional(),
  crp: z.string().optional(),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 10 || v.length === 11, 'Telefone inválido. Use DDD + número.'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Precisa de ao menos uma letra minúscula')
    .regex(/\d/, 'Precisa de ao menos um número')
    .regex(/[@$!%*?&\-_#]/, 'Precisa de ao menos um símbolo (@$!%*?&-_#)'),
  crpConfirmed: z.boolean().optional(),
  terms: z.boolean().refine((v) => v, 'Você precisa aceitar os termos'),
}).superRefine((data, ctx) => {
  if (!requiresCrp(data.profession)) return
  if (data.isStudent) return
  if (!isValidCrpFormat(data.crp ?? '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['crp'], message: 'CRP inválido. Use uma região entre 01 e 24.' })
  }
  if (!data.crpConfirmed) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['crpConfirmed'], message: 'Confirme que seu CRP está ativo' })
  }
})

// ── Step 2: cartão de crédito ──────────────────────────────────────────────

const cardSchema = z.object({
  holderName: z.string().min(2, 'Nome obrigatório').max(120),
  number: z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length >= 13 && v.length <= 19, 'Número do cartão inválido'),
  expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, 'Mês inválido (01-12)'),
  expiryYear: z.string().regex(/^\d{2,4}$/, 'Ano inválido'),
  ccv: z.string().regex(/^\d{3,4}$/, 'CVV inválido'),
  cpfCnpj: z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length === 11 || v.length === 14, 'CPF (11 dígitos) ou CNPJ (14 dígitos)'),
  postalCode: z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length === 8, 'CEP deve ter 8 dígitos'),
  addressNumber: z.string().min(1, 'Número obrigatório').max(20),
})

type AccountData = z.infer<typeof accountSchema>
type CardData = z.infer<typeof cardSchema>

const TERMS_VERSION = '2026-05-02'

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const [crpValue, setCrpValue] = useState('')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [searchParams] = useSearchParams()
  const setAuth      = useAuthStore((s) => s.setAuth)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setSubscription = useSubscriptionStore((s) => s.setSubscription)
  const navigate = useNavigate()
  const tokenize = useTokenizeCard()
  const subscribe = useSubscribeTrial()

  useEffect(() => {
    const ref = searchParams.get('ref') || searchParams.get('referral')
    if (ref) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  // ── formulário step 1 ───────────────────────────────────────────────────
  const accountForm = useForm<AccountData>({
    resolver: zodResolver(accountSchema),
    defaultValues: { profession: DEFAULT_PROFESSION },
  })
  const { register, handleSubmit, setValue, watch, formState: { errors } } = accountForm

  const selectedProfession = watch('profession')
  const showCrp = requiresCrp(selectedProfession)

  useEffect(() => {
    setCrpValue('')
    setValue('crp', '', { shouldValidate: false })
  }, [showCrp, setValue])

  const crpValid = isValidCrpFormat(crpValue)
  const crpRegion = getCrpRegion(crpValue)

  function handleCrpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCrpInput(e.target.value)
    setCrpValue(formatted)
    setValue('crp', formatted, { shouldValidate: formatted.length >= 7 })
  }

  function handleIsStudentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked
    setIsStudent(checked)
    setValue('isStudent', checked)
    if (checked) {
      setCrpValue('')
      setValue('crp', '', { shouldValidate: false })
      setValue('crpConfirmed', false, { shouldValidate: false })
    }
  }

  async function onSubmitAccount(data: AccountData) {
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        termsAccepted: data.terms,
        termsVersion: TERMS_VERSION,
        profession: data.profession,
        ...(showCrp
          ? (isStudent ? { isStudent: true } : { crp: data.crp })
          : (crpValue.trim() ? { crp: crpValue.trim() } : {})),
        ...(referralCode ? { referralCode } : {}),
      })
      if (res.data.tokens) {
        const { setNativeTokens } = await import('@/lib/nativeAuth')
        await setNativeTokens(res.data.tokens)
      }
      setAuth(res.data.user)
      if (res.data.csrfToken) setCsrfToken(res.data.csrfToken)
      setAccountData(data)
      setStep(2)
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message
      if (status === 429) {
        toast.error('Muitas tentativas. Aguarde um minuto e tente novamente.')
      } else if (msg === 'E-mail já cadastrado') {
        toast.error('Este e-mail já está em uso. Tente fazer login.')
      } else {
        toast.error('Não foi possível criar a conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── formulário step 2 ───────────────────────────────────────────────────
  const cardForm = useForm<CardData>({ resolver: zodResolver(cardSchema) })
  const { register: regCard, handleSubmit: handleCard, formState: { errors: cardErrors } } = cardForm

  function formatCardNumber(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }

  async function onSubmitCard(data: CardData) {
    setLoading(true)
    try {
      const { creditCardToken } = await tokenize.mutateAsync({
        creditCard: {
          holderName: data.holderName,
          number: data.number,
          expiryMonth: data.expiryMonth,
          expiryYear: data.expiryYear,
          ccv: data.ccv,
        },
        creditCardHolderInfo: {
          name: data.holderName,
          cpfCnpj: data.cpfCnpj,
          postalCode: data.postalCode,
          addressNumber: data.addressNumber,
          phone: accountData!.phone.replace(/\D/g, ''),
        },
      })
      const billing = await subscribe.mutateAsync(creditCardToken)
      setSubscription(billing)

      track(EVENTS.REGISTER, {
        source: searchParams.get('utm_source') ?? (referralCode ? 'referral' : 'direct'),
        medium: searchParams.get('utm_medium') ?? 'none',
        campaign: searchParams.get('utm_campaign') ?? 'none',
        has_referral: Boolean(referralCode),
      })
      trackMetaConversion('CompleteRegistration')
      toast.success('Teste de 7 dias ativado! Seja bem-vindo(a) 🎉')
      const requestedPlan = searchParams.get('plano')
      navigate(requestedPlan === 'essencial' || requestedPlan === 'pro' ? '/planos?plano=pro' : '/')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? ''
      if (msg.toLowerCase().includes('cartao') || msg.toLowerCase().includes('card') || msg.toLowerCase().includes('invalido')) {
        toast.error('Dados do cartão inválidos. Verifique e tente novamente.')
      } else {
        toast.error('Não foi possível ativar o teste. Tente novamente ou entre em contato.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── render step 1 ───────────────────────────────────────────────────────
  if (step === 1) return (
    <div>
      <h2 className="font-display text-3xl font-light text-neutral-800 mb-1">
        Criar sua conta
      </h2>
      <p className="text-neutral-500 mb-6">7 dias grátis, sem cobrança agora</p>

      {referralCode && (
        <div className="mb-4 px-3 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm text-sage-700">
          Indicado por um colega — código <strong>{referralCode}</strong> aplicado.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmitAccount)} className="space-y-4">
        <div>
          <label htmlFor="register-name" className="label">Nome completo</label>
          <input
            id="register-name"
            {...register('name')}
            className="input-field"
            placeholder="Nome completo"
            autoComplete="name"
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="register-email" className="label">E-mail</label>
          <input
            id="register-email"
            {...register('email')}
            type="email"
            className="input-field"
            placeholder="seu@email.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="register-profession" className="label">Profissão</label>
          <select
            id="register-profession"
            {...register('profession')}
            className="input-field"
            aria-invalid={!!errors.profession}
          >
            {PROFESSIONS.map(item => (
              <option key={item} value={item}>{PROFESSION_LABELS[item as Profession]}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Define os termos usados no sistema e quais recursos aparecem para você.
          </p>
        </div>

        <div>
          <label htmlFor="register-phone" className="label">Telefone (WhatsApp)</label>
          <input
            id="register-phone"
            {...register('phone')}
            type="tel"
            className="input-field"
            placeholder="(00) 00000-0000"
            autoComplete="tel"
            inputMode="numeric"
            aria-invalid={!!errors.phone}
          />
          {errors.phone && <p className="text-rose-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>

        {!showCrp && (
          <div>
            <label htmlFor="register-council" className="label">
              {councilLabel(selectedProfession)} <span className="text-neutral-400 font-normal">(opcional)</span>
            </label>
            <input
              id="register-council"
              value={crpValue}
              onChange={e => setCrpValue(e.target.value.slice(0, 30))}
              className="input-field"
              placeholder="Ex: CRN-3 12345"
              maxLength={30}
              autoComplete="off"
            />
            <p className="text-xs text-neutral-400 mt-1">
              Aparece no seu link público de agendamento. Dá para preencher depois no perfil.
            </p>
          </div>
        )}

        {showCrp && (
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="isStudent"
              checked={isStudent}
              onChange={handleIsStudentChange}
              className="mt-0.5 accent-sage-500"
            />
            <label htmlFor="isStudent" className="text-sm text-neutral-500 cursor-pointer">
              Sou estudante, ainda não tenho CRP
            </label>
          </div>
        )}

        {showCrp && isStudent && (
          <p className="text-xs text-neutral-400 -mt-2">
            Sem CRP, você pode usar agenda, pacientes e financeiro normalmente, mas não poderá
            emitir documentos oficiais até adicionar seu CRP no perfil.
          </p>
        )}

        {showCrp && !isStudent && (
          <div>
            <label htmlFor="register-crp" className="label">CRP</label>
            <div className="relative">
              <input
                id="register-crp"
                value={crpValue}
                onChange={handleCrpChange}
                className={`input-field pr-10 ${
                  crpValue.length >= 7
                    ? crpValid
                      ? 'border-emerald-400 focus:ring-emerald-200'
                      : 'border-rose-400 focus:ring-rose-200'
                    : ''
                }`}
                placeholder="06/123456"
                maxLength={9}
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={!!errors.crp}
              />
              {crpValue.length >= 7 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {crpValid
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <AlertCircle className="w-4 h-4 text-rose-400" />}
                </span>
              )}
            </div>
            {crpValid && crpRegion && (
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Conselho Regional — {crpRegion}
                </p>
                <button
                  type="button"
                  onClick={openCfpVerification}
                  className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-1 hover:underline"
                >
                  Verificar no CFP
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
            {errors.crp && !crpValid && (
              <p className="text-rose-500 text-xs mt-1">{errors.crp.message}</p>
            )}
            {!crpValid && crpValue.length > 0 && crpValue.length < 7 && (
              <p className="text-neutral-400 text-xs mt-1">Formato: 00/000000 (região/número)</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="register-password" className="label">Senha</label>
          <input
            id="register-password"
            {...register('password')}
            type="password"
            className="input-field"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
          />
          {errors.password && <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {showCrp && !isStudent && (
          <div className="flex items-start gap-2 pt-1">
            <input
              {...register('crpConfirmed')}
              type="checkbox"
              id="crpConfirmed"
              className="mt-0.5 accent-sage-500"
            />
            <label htmlFor="crpConfirmed" className="text-sm text-neutral-500 cursor-pointer">
              Confirmo que meu CRP está <strong>ativo e regularizado</strong> junto ao CFP.{' '}
              <button type="button" onClick={openCfpVerification} className="text-sage-600 hover:underline inline">
                Verificar no site do CFP
              </button>
            </label>
          </div>
        )}
        {errors.crpConfirmed && <p className="text-rose-500 text-xs">{errors.crpConfirmed.message}</p>}

        <div className="flex items-start gap-2 pt-1">
          <input
            {...register('terms')}
            type="checkbox"
            id="terms"
            className="mt-0.5 accent-sage-500"
          />
          <label htmlFor="terms" className="text-sm text-neutral-500 cursor-pointer">
            Concordo com os{' '}
            <Link to="/termos" target="_blank" className="text-sage-600 hover:underline">Termos de Uso</Link>
          </label>
        </div>
        {errors.terms && <p className="text-rose-500 text-xs">{errors.terms.message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <UseCogniaIcon name="signup" size={24} />
          )}
          {loading ? 'Criando conta...' : 'Continuar'}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-6">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-sage-600 hover:text-sage-700 font-medium">
          Entrar
        </Link>
      </p>
    </div>
  )

  // ── render step 2: cartão ────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-5 h-5 text-sage-600" />
        <h2 className="font-display text-3xl font-light text-neutral-800">
          Dados do cartão
        </h2>
      </div>
      <p className="text-neutral-500 mb-2">
        Seu teste de <strong>7 dias grátis</strong> começa agora. Nenhuma cobrança hoje.
      </p>
      <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-6">
        <Lock className="w-3 h-3" />
        Dados criptografados e processados via Asaas
      </div>

      <form onSubmit={handleCard(onSubmitCard)} className="space-y-4">
        <div>
          <label className="label">Número do cartão</label>
          <input
            {...regCard('number')}
            className="input-field font-mono tracking-wider"
            placeholder="0000 0000 0000 0000"
            inputMode="numeric"
            maxLength={19}
            value={cardNumber}
            onChange={e => {
              const formatted = formatCardNumber(e.target.value)
              setCardNumber(formatted)
              cardForm.setValue('number', formatted, { shouldValidate: formatted.replace(/\s/g, '').length >= 13 })
            }}
            autoComplete="cc-number"
          />
          {cardErrors.number && <p className="text-rose-500 text-xs mt-1">{cardErrors.number.message}</p>}
        </div>

        <div>
          <label className="label">Nome no cartão</label>
          <input
            {...regCard('holderName')}
            className="input-field uppercase"
            placeholder="NOME COMO NO CARTÃO"
            autoComplete="cc-name"
          />
          {cardErrors.holderName && <p className="text-rose-500 text-xs mt-1">{cardErrors.holderName.message}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Mês</label>
            <input
              {...regCard('expiryMonth')}
              className="input-field"
              placeholder="MM"
              maxLength={2}
              inputMode="numeric"
              autoComplete="cc-exp-month"
            />
            {cardErrors.expiryMonth && <p className="text-rose-500 text-xs mt-1">{cardErrors.expiryMonth.message}</p>}
          </div>
          <div>
            <label className="label">Ano</label>
            <input
              {...regCard('expiryYear')}
              className="input-field"
              placeholder="AA"
              maxLength={4}
              inputMode="numeric"
              autoComplete="cc-exp-year"
            />
            {cardErrors.expiryYear && <p className="text-rose-500 text-xs mt-1">{cardErrors.expiryYear.message}</p>}
          </div>
          <div>
            <label className="label">CVV</label>
            <input
              {...regCard('ccv')}
              className="input-field"
              placeholder="000"
              maxLength={4}
              inputMode="numeric"
              autoComplete="cc-csc"
            />
            {cardErrors.ccv && <p className="text-rose-500 text-xs mt-1">{cardErrors.ccv.message}</p>}
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-400 mb-3">Dados do titular (para fatura)</p>

          <div className="space-y-3">
            <div>
              <label className="label">CPF / CNPJ</label>
              <input
                {...regCard('cpfCnpj')}
                className="input-field"
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={18}
              />
              {cardErrors.cpfCnpj && <p className="text-rose-500 text-xs mt-1">{cardErrors.cpfCnpj.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CEP</label>
                <input
                  {...regCard('postalCode')}
                  className="input-field"
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={9}
                />
                {cardErrors.postalCode && <p className="text-rose-500 text-xs mt-1">{cardErrors.postalCode.message}</p>}
              </div>
              <div>
                <label className="label">Número</label>
                <input
                  {...regCard('addressNumber')}
                  className="input-field"
                  placeholder="Ex: 42"
                  maxLength={20}
                />
                {cardErrors.addressNumber && <p className="text-rose-500 text-xs mt-1">{cardErrors.addressNumber.message}</p>}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          {loading ? 'Ativando teste...' : 'Ativar 7 dias grátis'}
        </button>

        <p className="text-center text-xs text-neutral-400">
          Após o teste, R$97,90/mês. Cancele a qualquer momento antes do vencimento.
        </p>
      </form>
    </div>
  )
}
