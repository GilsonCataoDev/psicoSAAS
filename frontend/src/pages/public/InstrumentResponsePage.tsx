import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePublicInstrument, useSubmitPublicInstrument, type InstrumentField } from '@/hooks/useApi'
import BrandLogo from '@/components/ui/BrandLogo'
import { SCALE_CONFIGS, calcScaleScore, getThresholdLevel } from '@/lib/scale-scoring'

// ── Likert radio group ───────────────────────────────────────────────────────

function LikertItem({
  index,
  label,
  options,
  value,
  onChange,
}: {
  index: number
  label: string
  options: Array<{ value: number; label: string }>
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
      <p className="mb-3 text-sm font-medium text-neutral-800">
        <span className="mr-2 text-xs font-semibold text-sage-600">{index + 1}.</span>
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map(opt => {
          const selected = value === String(opt.value)
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-2 text-center text-xs transition-all ${
                selected
                  ? 'border-sage-500 bg-sage-50 font-semibold text-sage-700'
                  : 'border-neutral-200 bg-white text-neutral-500 hover:border-sage-300'
              }`}
            >
              <input
                type="radio"
                name={`item-${index}`}
                value={String(opt.value)}
                checked={selected}
                onChange={() => onChange(String(opt.value))}
                className="sr-only"
              />
              <span className="text-base font-bold">{opt.value}</span>
              <span className="leading-tight">{opt.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ── Score result card ────────────────────────────────────────────────────────

function ScoreResult({ instrumentId, score, scoreDetails }: { instrumentId: string; score: number; scoreDetails?: string | null }) {
  const config = SCALE_CONFIGS[instrumentId]
  if (!config) return null

  if (config.subscales && scoreDetails) {
    let details: Record<string, number> = {}
    try { details = JSON.parse(scoreDetails) } catch { /* ignore */ }
    return (
      <div className="mt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Seu resultado</p>
        {config.subscales.map(sub => {
          const subScore = details[sub.id] ?? 0
          const level = getThresholdLevel(subScore, sub.thresholds)
          return (
            <div key={sub.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white px-4 py-3">
              <span className="text-sm font-medium text-neutral-700">{sub.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-800">{subScore}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${level.color}`}>{level.label}</span>
              </div>
            </div>
          )
        })}
        <p className="text-xs text-neutral-400">Estes resultados serão analisados pela profissional responsável.</p>
      </div>
    )
  }

  if (!config.thresholds) return null
  const level = getThresholdLevel(score, config.thresholds)
  return (
    <div className="mt-6 rounded-xl border border-neutral-100 bg-white p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Seu resultado</p>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl font-bold text-neutral-800">
          {score}
        </div>
        <div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${level.color}`}>{level.label}</span>
          {config.note && <p className="mt-2 text-xs text-neutral-500">{config.note}</p>}
        </div>
      </div>
      <p className="mt-3 text-xs text-neutral-400">Este resultado será analisado pela profissional responsável.</p>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type SubmitResult = { score: number | null; scoreDetails: string | null }

export default function InstrumentResponsePage() {
  const { token } = useParams()
  const { data, isLoading, isError } = usePublicInstrument(token)
  const submit = useSubmitPublicInstrument(token)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<SubmitResult | null>(null)

  const instrumentId = data?.instrumentId ?? ''
  const scaleConfig = SCALE_CONFIGS[instrumentId]
  const isScale = !!scaleConfig
  const genericFields: InstrumentField[] = data?.fields ?? []

  const allAnswered = isScale
    ? scaleConfig.items.every(item => answers[item.id] !== undefined && answers[item.id] !== '')
    : genericFields.some(f => answers[f.id]?.trim())

  function setAnswer(id: string, value: string) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  function setGenericAnswer(field: InstrumentField, value: string) {
    setAnswers(prev => {
      const next = { ...prev, [field.id]: value }
      if (field.type === 'date' && field.label.toLowerCase().includes('nascimento') && value) {
        const ageField = genericFields.find(item => item.label.toLowerCase() === 'idade')
        if (ageField) {
          const birth = new Date(`${value}T12:00:00`)
          const now = new Date()
          let age = now.getFullYear() - birth.getFullYear()
          if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age--
          next[ageField.id] = String(Math.max(0, age))
        }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allAnswered && !isScale) {
      toast.error('Preencha pelo menos um campo antes de enviar.')
      return
    }
    const { score, scoreDetails } = isScale ? calcScaleScore(instrumentId, answers) : { score: null, scoreDetails: null }
    try {
      await submit.mutateAsync({ answers, score, scoreDetails })
      setResult({ score, scoreDetails })
    } catch {
      toast.error('Não foi possível enviar agora. Tente novamente.')
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
              <h1 className="mt-3 text-lg font-semibold text-neutral-800">Formulário indisponível</h1>
              <p className="mt-1 text-sm text-neutral-500">O link pode ter expirado ou já ter sido respondido.</p>
            </div>
          ) : result !== null ? (
            <div className="py-8">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-sage-600" />
                <h1 className="mt-3 text-lg font-semibold text-neutral-800">Resposta enviada</h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Obrigado. As respostas foram encaminhadas com segurança para a profissional.
                </p>
              </div>
              {result.score != null && (
                <ScoreResult
                  instrumentId={instrumentId}
                  score={result.score}
                  scoreDetails={result.scoreDetails}
                />
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Header */}
              <div className="border-b border-neutral-100 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">
                  {isScale ? 'Escala clínica' : 'Formulário clínico'}
                </p>
                <h1 className="mt-1 text-xl font-semibold text-neutral-900">{data?.title}</h1>
                {data?.description && (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">{data.description}</p>
                )}
                {data?.patientName && (
                  <p className="mt-3 text-xs text-neutral-400">Paciente: {data.patientName}</p>
                )}
                {isScale && (
                  <p className="mt-3 text-xs text-neutral-500">
                    Opções: {scaleConfig.options.map(o => `${o.value} = ${o.label}`).join(' | ')}
                  </p>
                )}
              </div>

              {/* Scale: Likert items */}
              {isScale ? (
                <div className="space-y-3">
                  {scaleConfig.items.map((item, i) => (
                    <LikertItem
                      key={item.id}
                      index={i}
                      label={item.label}
                      options={scaleConfig.options}
                      value={answers[item.id] ?? ''}
                      onChange={v => setAnswer(item.id, v)}
                    />
                  ))}
                </div>
              ) : (
                /* Generic form fields */
                <div className="space-y-4">
                  {genericFields.map(field => {
                    const value = answers[field.id] ?? ''
                    return (
                      <label key={field.id} className="block">
                        <span className="text-sm font-medium text-neutral-700">{field.label}</span>
                        {field.type === 'textarea' ? (
                          <textarea value={value} onChange={e => setGenericAnswer(field, e.target.value)} rows={3}
                            className="mt-1 input-field resize-y text-sm" placeholder="Digite sua resposta" />
                        ) : field.type === 'select' ? (
                          <select value={value} onChange={e => setGenericAnswer(field, e.target.value)} className="mt-1 input-field text-sm">
                            <option value="">Selecione</option>
                            {field.options?.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input type={field.type} value={value} onChange={e => setGenericAnswer(field, e.target.value)}
                            className="mt-1 input-field text-sm"
                            placeholder={field.type === 'date' ? undefined : 'Digite sua resposta'} />
                        )}
                      </label>
                    )
                  })}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                {isScale && (
                  <p className="text-xs text-neutral-400">
                    {Object.keys(answers).length}/{scaleConfig.items.length} respondidas
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submit.isPending || (isScale ? !allAnswered : !allAnswered)}
                  className="btn-primary ml-auto min-w-32 text-sm"
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
