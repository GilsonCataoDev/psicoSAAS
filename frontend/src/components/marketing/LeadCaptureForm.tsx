import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { track, trackMetaConversion } from '@/lib/analytics'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LeadProfession = 'psicologia' | 'fisioterapia' | 'nutricao' | 'outro'

const ALL_PROFESSION_OPTIONS: LeadProfession[] = [
  'psicologia',
  'fisioterapia',
  'nutricao',
  'outro',
]

const PROFESSION_LABELS: Record<LeadProfession, string> = {
  psicologia:   'Psicologia',
  fisioterapia: 'Fisioterapia',
  nutricao:     'Nutrição',
  outro:        'Outro',
}

export interface LeadCaptureFormProps {
  source?:            string
  title?:             string
  description?:       string
  ctaLabel?:          string
  professionOptions?: LeadProfession[]
  defaultProfession?: LeadProfession
  onSuccess?:         () => void
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  name:       z.string().min(1, 'Nome é obrigatório').max(200),
  email:      z.string().email('E-mail inválido').max(200),
  profession: z.enum(['psicologia', 'fisioterapia', 'nutricao', 'outro'] as const),
})

type FormValues = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadCaptureForm({
  source,
  title,
  description,
  ctaLabel         = 'Quero receber',
  professionOptions = ALL_PROFESSION_OPTIONS,
  defaultProfession = 'psicologia',
  onSuccess,
}: LeadCaptureFormProps) {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      profession: (professionOptions.includes(defaultProfession as LeadProfession)
        ? defaultProfession
        : professionOptions[0]) as LeadProfession,
    },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)

    try {
      const baseUrl = (import.meta as any).env?.VITE_API_URL ?? 'https://usecognia.com.br/api'
      const res = await fetch(`${baseUrl}/leads`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...values, source }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setServerError(data?.message ?? 'Ocorreu um erro. Tente novamente.')
        return
      }

      setSubmitted(true)
      track('lead_captured', { profession: values.profession, source: source ?? 'unknown' })
      trackMetaConversion('Lead')
      onSuccess?.()
    } catch {
      setServerError('Não foi possível conectar ao servidor. Verifique sua conexão.')
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-lg font-semibold text-green-800">
          Enviado! Verifique seu email.
        </p>
        <p className="mt-1 text-sm text-green-700">
          Em breve você receberá novidades da UseCognia.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {title && (
        <h2 className="mb-1 text-xl font-bold text-gray-900">{title}</h2>
      )}
      {description && (
        <p className="mb-4 text-sm text-gray-600">{description}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="lcf-name" className="mb-1 block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            id="lcf-name"
            type="text"
            autoComplete="name"
            placeholder="Seu nome completo"
            {...register('name')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="lcf-email" className="mb-1 block text-sm font-medium text-gray-700">
            E-mail
          </label>
          <input
            id="lcf-email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            {...register('email')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Profession */}
        <div>
          <label htmlFor="lcf-profession" className="mb-1 block text-sm font-medium text-gray-700">
            Profissão
          </label>
          <select
            id="lcf-profession"
            {...register('profession')}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
          >
            {professionOptions.map(p => (
              <option key={p} value={p}>
                {PROFESSION_LABELS[p]}
              </option>
            ))}
          </select>
          {errors.profession && (
            <p className="mt-1 text-xs text-red-600">{errors.profession.message}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
        )}

        {/* Aviso LGPD - exibido ANTES do botão de submit conforme art. 9° LGPD */}
        <p className="text-center text-xs leading-5 text-gray-500">
          Seus dados serão usados exclusivamente para contato sobre o UseCognia, conforme nossa{' '}
          <a href="/privacidade" className="underline hover:text-gray-700">Política de Privacidade</a>.
          Você pode solicitar exclusão a qualquer momento pelo e-mail{' '}
          <a href="mailto:privacidade@usecognia.com.br" className="underline hover:text-gray-700">privacidade@usecognia.com.br</a>.
        </p>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Enviando…' : ctaLabel}
        </button>
      </form>
    </div>
  )
}
