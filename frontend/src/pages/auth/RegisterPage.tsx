import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  crp: z.string().min(5, 'CRP inválido'),
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
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

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

        <div>
          <label className="label">CRP</label>
          <input {...register('crp')} className="input-field" placeholder="06/123456" />
          {errors.crp && <p className="text-rose-500 text-xs mt-1">{errors.crp.message}</p>}
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
