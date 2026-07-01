import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { track, EVENTS } from '@/lib/analytics'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const setAuth      = useAuthStore((s) => s.setAuth)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const logout       = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setErrorMessage(null)
    let loginAccepted = false
    try {
      const res = await api.post('/auth/login', { email: data.email, password: data.password })
      loginAccepted = true
      if (res.data.tokens) {
        const { setNativeTokens } = await import('@/lib/nativeAuth')
        await setNativeTokens(res.data.tokens)
      }
      setAuth(res.data.user)
      if (res.data.csrfToken) setCsrfToken(res.data.csrfToken)
      track(EVENTS.LOGIN)
      navigate('/')
    } catch (err: any) {
      logout()
      const msg = err?.response?.data?.message
      const safeMessage =
        err?.response?.status === 401 || msg === 'Unauthorized'
          ? loginAccepted
            ? 'Não foi possível manter sua sessão. Verifique se os cookies do navegador estão habilitados.'
            : 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar. Tente novamente.'
      setErrorMessage(safeMessage)
      toast.error(safeMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-bold text-neutral-900 mb-1">
        Acesse a UseCognia
      </h2>
      <p className="text-neutral-500 mb-8">Organize agenda, pacientes e financeiro em poucos cliques.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">E-mail</label>
          <input
            {...register('email')}
            type="email"
            placeholder="seu@email.com"
            className="input-field"
            autoComplete="email"
          />
          {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0">Senha</label>
            <Link to="/esqueci-senha" className="text-xs text-sage-600 hover:text-sage-700">Esqueci a senha</Link>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="input-field pr-11"
              autoComplete="current-password"
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

        {errorMessage && (
          <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-6">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="text-sage-600 hover:text-sage-700 font-medium">
          Criar conta gratuita
        </Link>
      </p>

      <div className="mt-8 p-4 bg-sage-50 rounded-2xl border border-sage-100">
        <p className="text-xs text-sage-700 text-center">
          <ShieldCheck className="mr-1 inline-block h-5 w-5 align-middle" />
          Seus dados sensiveis sao protegidos com criptografia em repouso e controles de acesso.
        </p>
      </div>
    </div>
  )
}
