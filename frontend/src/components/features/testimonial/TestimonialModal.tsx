import { useState } from 'react'
import { CheckCircle2, Star } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useSubmitTestimonial, useDismissTestimonial } from '@/hooks/useApi'

interface Props {
  open: boolean
  onDone: () => void
}

export default function TestimonialModal({ open, onDone }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [publicConsent, setPublicConsent] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = useSubmitTestimonial()
  const dismiss = useDismissTestimonial()

  function handleClose() {
    if (submitted) { onDone(); return }
    dismiss.mutate(undefined, { onSettled: onDone })
  }

  function handleSubmit() {
    if (!rating) return
    submit.mutate(
      { rating, text: text.trim() || undefined, publicConsent },
      {
        onSuccess: () => {
          setSubmitted(true)
          setTimeout(onDone, 1800)
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Conte como está sendo a experiência"
      description="Sua resposta nos ajuda a melhorar o UseCognia."
      size="sm"
    >
      {submitted ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-sage-600" />
          <p className="font-medium text-neutral-800">Muito obrigado pelo depoimento!</p>
          <p className="text-sm text-neutral-500 mt-1">Isso significa muito para nós.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">
              Como a UseCognia ajudou sua rotina?
            </p>
            <textarea
              value={text}
              onChange={event => {
                setText(event.target.value)
                if (!event.target.value.trim()) setPublicConsent(false)
              }}
              placeholder="Ex: Reduzi as faltas, organizo melhor meu consultório..."
              rows={4}
              maxLength={1500}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sage-500 resize-none"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <input
              type="checkbox"
              checked={publicConsent}
              onChange={event => setPublicConsent(event.target.checked)}
              disabled={!text.trim()}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-sage-600 focus:ring-sage-500"
            />
            <span className="text-xs leading-5 text-neutral-600">
              Autorizo a publicação deste texto nos canais do UseCognia. A autorização é opcional e não inclui dados clínicos.
            </span>
          </label>

          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Sua nota (obrigatório)</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${n} estrela${n !== 1 ? 's' : ''}`}
                >
                  <Star
                    className="w-7 h-7 transition-colors"
                    fill={(hover || rating) >= n ? '#F59E0B' : 'transparent'}
                    stroke={(hover || rating) >= n ? '#F59E0B' : '#D1D5DB'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              Não desejo responder
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!rating || submit.isPending}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-sage-600 text-white hover:bg-sage-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submit.isPending ? 'Enviando...' : 'Enviar depoimento'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
