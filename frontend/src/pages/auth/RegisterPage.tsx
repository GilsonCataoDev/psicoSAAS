import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { isValidCrpFormat, getCrpRegion, openCfpVerification, formatCrpInput } from '@/lib/crp'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  crp: z
    .string()
    .regex(/^\d{2}\/\d{4,6}$/, 'Formato inválido. Use: 00/000000'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Precisa de ao menos uma letra minúscula')
    .regex(/\d/, 'Precisa de ao menos um número')
    .regex(/[@$!%*?&\-_#]/, 'Precisa de ao menos um símbolo (@$!%*?&-_#)'),
  terms: z.boolean().refine((v) => v, 'Você precisa aceitar os termos'),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [crpValue, setCrpValue] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

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

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 1000))
      setAuth({ id: '1', name: data.name, email: data.email, crp: data.crp })
      toast.success('Conta criada com sucesso! Seja bem-vinda 🌱')
      navigate('/')
    } catch {
      toast.error('Não foi possível criar a conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-light text-neutral-800 mb-1">
        Criar sua conta
      </h2>
      <p className="text-neutral-500 mb-8">É rápido, gratuito e sem burocracia</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nome completo</label>
          <input {...register('name')} className="input-field" placeholder="Dra. Carolina Mendes" />
          {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">E-mail</label>
          <input {...register('email')} type="email" className="input-field" placeholder="seu@email.com" />
          {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* ── CRP com validação em tempo real ────────────────────────── */}
        <div>
          <label className="label">CRP</label>
          <div className="relative">
            <input
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

        <div>
          <label className="label">Senha</label>
          <input {...register('password')} type="password" className="input-field" placeholder="Mínimo 8 caracteres" />
          {errors.password && <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            {...register('terms')}
            type="checkbox"
            id="terms"
            className="mt-0.5 accent-sage-500"
          />
          <label htmlFor="terms" className="text-sm text-neutral-500 cursor-pointer">
            Concordo com os{' '}
            <a href="#" className="text-sage-600 hover:underline">Termos de Uso</a>
            {' '}e{' '}
            <a href="#" className="text-sage-600 hover:underline">Política de Privacidade</a>
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
            <UserPlus className="w-4 h-4" />
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
