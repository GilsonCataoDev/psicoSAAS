import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'

type VerifyState = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState<VerifyState>('loading')
  const [message, setMessage] = useState('Verificando seu e-mail...')
  const updateUser = useAuthStore((s) => s.updateUser)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setState('error')
      setMessage('Link de verificação inválido.')
      return
    }

    api.get('/auth/verify-email', { params: { token } })
      .then((res) => {
        setState('success')
        setMessage(res.data?.message ?? 'E-mail verificado com sucesso.')
        if (isAuthenticated) updateUser({ emailVerified: true })
      })
      .catch((err) => {
        setState('error')
        setMessage(err?.response?.data?.message ?? 'Link expirado ou inválido. Solicite um novo link.')
      })
  }, [isAuthenticated, params, updateUser])

  const success = state === 'success'

  return (
    <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-card backdrop-blur-xl text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-50">
        {state === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-sage-600" />}
        {success && <UseCogniaIcon name="success" size={32} />}
        {state === 'error' && <UseCogniaIcon name="warning" size={32} />}
      </div>

      <h1 className="font-display text-2xl font-bold text-neutral-900">
        {state === 'loading' ? 'Verificando e-mail' : success ? 'E-mail confirmado' : 'Não foi possível confirmar'}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{message}</p>

      <Link to={isAuthenticated ? '/' : '/login'} className="btn-primary mt-6 inline-flex justify-center px-5 py-3">
        {isAuthenticated ? 'Ir para dashboard' : 'Entrar'}
      </Link>
    </div>
  )
}
