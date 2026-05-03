import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const setAuth      = useAuthStore((s) => s.setAuth)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email: data.email, password: data.password })
      setAuth(res.data.user)
      if (res.data.csrfToken) setCsrfToken(res.data.csrfToken)
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(msg === 'Unauthorized' ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-light text-neutral-800 mb-1">
        Bem-vinda de volta
      </h2>
      <p className="text-neutral-500 mb-8">Entre para acessar sua conta</p>

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

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
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
          🔒 Seus dados sensiveis sao protegidos com criptografia em repouso, controles de acesso e praticas alinhadas a LGPD.
        </p>
      </div>
    </div>
  )
}
