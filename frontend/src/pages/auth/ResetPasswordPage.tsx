import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Precisa de ao menos uma letra minúscula')
    .regex(/\d/, 'Precisa de ao menos um número'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'As senhas não coincidem',
  path: ['confirm'],
})

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Token ausente na URL
  if (!token) {
    return (
      <div className="text-center">
        <h2 className="font-display text-2xl font-light text-neutral-800 mb-2">
          Link inválido
        </h2>
        <p className="text-neutral-500 mb-6">
          Este link de recuperação é inválido ou já foi utilizado.
        </p>
        <Link to="/esqueci-senha" className="btn-primary inline-flex items-center gap-2">
          Solicitar novo link
        </Link>
      </div>
    )
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: data.password })
      toast.success('Senha redefinida com sucesso!')
      navigate('/login')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(msg ?? 'Link inválido ou expirado. Solicite um novo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar ao login
      </Link>

      <h2 className="font-display text-3xl font-light text-neutral-800 mb-1">
        Nova senha
      </h2>
      <p className="text-neutral-500 mb-8">
        Escolha uma senha segura para sua conta.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nova senha</label>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              className="input-field pr-11"
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">Confirmar nova senha</label>
          <input
            {...register('confirm')}
            type={showPassword ? 'text' : 'password'}
            placeholder="Repita a senha"
            className="input-field"
            autoComplete="new-password"
          />
          {errors.confirm && <p className="text-rose-500 text-xs mt-1">{errors.confirm.message}</p>}
        </div>

        <div className="bg-sage-50 border border-sage-100 rounded-xl p-3">
          <p className="text-xs text-sage-700">
            A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>
    </div>
  )
}
