import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePublicInstrument, useSubmitPublicInstrument } from '@/hooks/useApi'
import BrandLogo from '@/components/ui/BrandLogo'

type PublicInstrumentField = {
  id: string
  label: string
}

export default function InstrumentResponsePage() {
  const { token } = useParams()
  const { data, isLoading, isError } = usePublicInstrument(token)
  const submit = useSubmitPublicInstrument(token)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)

  const fields = useMemo<PublicInstrumentField[]>(() => data?.fields ?? [], [data])
  const hasAnyAnswer = fields.some(field => answers[field.id]?.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasAnyAnswer) {
      toast.error('Preencha pelo menos um campo antes de enviar.')
      return
    }
    try {
      await submit.mutateAsync(answers)
      setDone(true)
    } catch {
      toast.error('Nao foi possivel enviar agora. Tente novamente.')
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-4 py-6 text-neutral-800">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <BrandLogo />

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-soft">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-neutral-300" />
              <h1 className="mt-3 text-lg font-semibold text-neutral-800">Formulario indisponivel</h1>
              <p className="mt-1 text-sm text-neutral-500">O link pode ter expirado ou ja ter sido respondido.</p>
            </div>
          ) : done ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-sage-600" />
              <h1 className="mt-3 text-lg font-semibold text-neutral-800">Resposta enviada</h1>
              <p className="mt-1 text-sm text-neutral-500">Obrigado. As respostas foram encaminhadas com seguranca para a profissional.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="border-b border-neutral-100 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">Formulario clinico</p>
                <h1 className="mt-1 text-xl font-semibold text-neutral-900">{data.title}</h1>
                {data.description && <p className="mt-2 text-sm leading-relaxed text-neutral-500">{data.description}</p>}
                {data.patientName && <p className="mt-3 text-xs text-neutral-400">Paciente: {data.patientName}</p>}
              </div>

              <div className="space-y-4">
                {fields.map(field => (
                  <label key={field.id} className="block">
                    <span className="text-sm font-medium text-neutral-700">{field.label}</span>
                    <textarea
                      value={answers[field.id] ?? ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                      rows={3}
                      className="mt-1 input-field resize-y text-sm"
                      placeholder="Digite sua resposta"
                    />
                  </label>
                ))}
              </div>

              <div className="flex justify-end border-t border-neutral-100 pt-4">
                <button
                  type="submit"
                  disabled={submit.isPending || !hasAnyAnswer}
                  className="btn-primary min-w-32 text-sm"
                >
                  {submit.isPending ? 'Enviando...' : 'Enviar respostas'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
