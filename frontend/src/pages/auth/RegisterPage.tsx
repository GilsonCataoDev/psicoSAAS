import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useSubscriptionStore } from '@/store/subscription'
import { api } from '@/lib/api'
import { isValidCrpFormat, getCrpRegion, openCfpVerification, formatCrpInput } from '@/lib/crp'
import toast from 'react-hot-toast'
import { track, EVENTS } from '@/lib/analytics'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'

const schema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
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
  // Estudante sem CRP pula a validação de CRP/confirmação — completa depois no perfil.
  if (data.isStudent) return
  if (!isValidCrpFormat(data.crp ?? '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['crp'], message: 'CRP inválido. Use uma região entre 01 e 24.' })
  }
  if (!data.crpConfirmed) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['crpConfirmed'], message: 'Confirme que seu CRP está ativo' })
  }
})

type FormData = z.infer<typeof schema>

const TERMS_VERSION = '2026-05-02'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const [crpValue, setCrpValue] = useState('')
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const setAuth      = useAuthStore((s) => s.setAuth)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const setSubscription = useSubscriptionStore((s) => s.setSubscription)
  const navigate = useNavigate()

  useEffect(() => {
    const ref = searchParams.get('ref') || searchParams.get('referral')
    if (ref) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

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

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        termsAccepted: data.terms,
        termsVersion: TERMS_VERSION,
        ...(isStudent ? { isStudent: true } : { crp: data.crp }),
        ...(referralCode ? { referralCode } : {}),
      })
      if (res.data.tokens) {
        const { setNativeTokens } = await import('@/lib/nativeAuth')
        await setNativeTokens(res.data.tokens)
      }
      setAuth(res.data.user)
      if (res.data.csrfToken) setCsrfToken(res.data.csrfToken)

      let freePlanActivated = false
      try {
        const billing = await api.post('/billing/free')
        setSubscription(billing.data)
        freePlanActivated = true
      } catch {
        try {
          const { data: billing } = await api.get('/billing/me')
          if (billing?.status) {
            setSubscription(billing)
            freePlanActivated = true
          }
        } catch {
          // Se a ativacao do plano gratis falhar momentaneamente, o AppLayout tenta
          // carregar/gerar a assinatura gratuita ao entrar no painel.
        }
      }

      track(EVENTS.REGISTER, {
        source: searchParams.get('utm_source') ?? (referralCode ? 'referral' : 'direct'),
        medium: searchParams.get('utm_medium') ?? 'none',
        campaign: searchParams.get('utm_campaign') ?? 'none',
        has_referral: Boolean(referralCode),
      })
      toast.success(
        freePlanActivated
          ? 'Plano gratis liberado! Seja bem-vindo(a)'
          : 'Conta criada! Vamos terminar a ativacao do plano gratis no painel.',
      )
      const requestedPlan = searchParams.get('plano')
      navigate(requestedPlan === 'essencial' || requestedPlan === 'pro' ? `/planos?plano=${requestedPlan}` : '/')
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

  return (
    <div>
      <h2 className="font-display text-3xl font-light text-neutral-800 mb-1">
        Criar sua conta
      </h2>
      <p className="text-neutral-500 mb-6">É rápido, gratuito e sem burocracia</p>

      {referralCode && (
        <div className="mb-4 px-3 py-2 bg-sage-50 border border-sage-200 rounded-lg text-sm text-sage-700">
          Indicado por um colega — código <strong>{referralCode}</strong> aplicado.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        {isStudent && (
          <p className="text-xs text-neutral-400 -mt-2">
            Sem CRP, você pode usar agenda, pacientes e financeiro normalmente, mas não poderá
            emitir documentos oficiais (atestados, relatórios, recibos) até adicionar seu CRP no perfil.
          </p>
        )}

        {/* ── CRP com validação em tempo real ────────────────────────── */}
        {!isStudent && (
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

          {/* Feedback: região identificada */}
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

          {/* Erro de validação do schema */}
          {errors.crp && !crpValid && (
            <p className="text-rose-500 text-xs mt-1">{errors.crp.message}</p>
          )}

          {/* Dica de formato quando ainda incompleto */}
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

        {!isStudent && (
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
          {loading ? 'Criando conta...' : 'Criar conta gratuita'}
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
}
