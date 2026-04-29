import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: data.email })
      setSent(true)
    } catch {
      // Mesmo em caso de erro de rede, mostrar mensagem genérica
      toast.error('Não foi possível processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-sage-600" />
        </div>
        <h2 className="font-display text-2xl font-light text-neutral-800 mb-2">
          E-mail enviado!
        </h2>
        <p className="text-neutral-500 mb-6 leading-relaxed">
          Se este endereço estiver cadastrado, você receberá as instruções de recuperação em breve.
          Verifique também sua pasta de spam.
        </p>
        <p className="text-sm text-neutral-400 mb-8">
          O link é válido por <strong>2 horas</strong>.
        </p>
        <Link to="/login" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar ao login
      </Link>

      <h2 className="font-display text-3xl font-light text-neutral-800 mb-1">
        Recuperar senha
      </h2>
      <p className="text-neutral-500 mb-8">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">E-mail cadastrado</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              {...register('email')}
              type="email"
              placeholder="seu@email.com"
              className="input-field pl-10"
              autoComplete="email"
              autoFocus
            />
          </div>
          {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
          {loading ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
      </form>
    </div>
  )
}
