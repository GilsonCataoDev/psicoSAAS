import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function NpsSurveyPage() {
  const { token } = useParams<{ token: string }>()
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data, isLoading } = useQuery<{ responded: boolean }>({
    queryKey: ['nps-survey', token],
    queryFn: () => api.get(`/nps/survey/${token}`).then(r => r.data),
    enabled: !!token,
    retry: false,
  })

  const submit = useMutation({
    mutationFn: () => api.post(`/nps/survey/${token}`, { score, comment }),
    onSuccess: () => setSubmitted(true),
  })

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-sage-200 border-t-sage-600" />
    </div>
  )

  if (data?.responded || submitted) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-3 max-w-sm">
        <p className="text-4xl">💙</p>
        <h1 className="text-xl font-bold text-neutral-800">Obrigado pelo seu feedback!</h1>
        <p className="text-sm text-neutral-500">Sua opinião nos ajuda a melhorar continuamente o atendimento.</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-neutral-500">Pesquisa não encontrada ou expirada.</p>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-neutral-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-3xl mb-3">✨</p>
          <h1 className="text-xl font-bold text-neutral-800">Como foi seu atendimento?</h1>
          <p className="text-sm text-neutral-500 mt-1">De 0 a 10, qual a probabilidade de você indicar este profissional?</p>
        </div>

        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              onClick={() => setScore(i)}
              className={`aspect-square rounded-xl text-sm font-semibold transition-all border ${
                score === i
                  ? 'bg-sage-500 text-white border-sage-500 scale-110'
                  : i <= 6
                    ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                    : i <= 8
                      ? 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-neutral-400 px-1">
          <span>Improvável</span><span>Muito provável</span>
        </div>

        {score !== null && (
          <div className="space-y-3 animate-slide-up">
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Quer deixar algum comentário? (opcional)"
              className="w-full rounded-2xl border border-neutral-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="w-full py-3 rounded-2xl bg-sage-500 text-white font-semibold text-sm hover:bg-sage-600 transition-colors disabled:opacity-60"
            >
              {submit.isPending ? 'Enviando…' : 'Enviar avaliação'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
