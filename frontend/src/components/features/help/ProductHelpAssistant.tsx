import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, HelpCircle, RotateCcw, Send, ShieldCheck, X } from 'lucide-react'
import { useProductHelp, type ConversationTurn } from '@/hooks/api/product-help'
import { useTerms } from '@/hooks/useTerms'
import type { Terms } from '@/lib/terms'

type Message = { role: 'user' | 'assistant'; text: string; path?: string; blocked?: boolean }

function buildSuggestions(t: Terms) {
  return [
    `Como cadastro um ${t.patient}?`,
    'Como crio um agendamento?',
    'Onde configuro os lembretes?',
  ]
}

export default function ProductHelpAssistant() {
  const t = useTerms()
  const SUGGESTIONS = buildSuggestions(t)
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const help = useProductHelp()

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, help.isPending])

  function buildHistory(): ConversationTurn[] {
    return messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: m.text,
    }))
  }

  async function submit(event?: FormEvent, suggestion?: string) {
    event?.preventDefault()
    const value = (suggestion ?? question).trim()
    if (value.length < 2 || help.isPending) return
    setQuestion('')
    setMessages(prev => [...prev, { role: 'user', text: value }])
    try {
      const response = await help.mutateAsync({ question: value, history: buildHistory() })
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: response.answer,
        path: response.path,
        blocked: response.blocked,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Não consegui responder agora. Tente novamente em alguns instantes ou fale com o suporte.',
        blocked: false,
      }])
    }
  }

  function reset() {
    setMessages([])
    setQuestion('')
    help.reset()
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="product-help-title"
          className="fixed inset-x-3 bottom-20 z-50 flex max-h-[min(620px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-sage-200 bg-white shadow-2xl dark:border-white/10 dark:bg-cognia-panel sm:left-auto sm:right-5 sm:w-[390px] lg:bottom-20"
        >
          <header className="flex items-start justify-between gap-4 border-b border-neutral-100 px-4 py-3 dark:border-white/10">
            <div>
              <h2 id="product-help-title" className="font-display text-base font-semibold text-neutral-900 dark:text-white">
                Ajuda do UseCognia
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-300">Dúvidas sobre como usar o sistema</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={reset}
                  aria-label="Nova conversa"
                  title="Nova conversa"
                  className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar ajuda"
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Não informe nomes, contatos ou conteúdo clínico de {t.patients}. Esta ajuda explica apenas o uso do sistema.</p>
            </div>

            {messages.length === 0 && (
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Você pode perguntar:</p>
                <div className="mt-2 flex flex-col gap-2">
                  {SUGGESTIONS.map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void submit(undefined, suggestion)}
                      className="rounded-xl border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-700 transition hover:border-sage-400 hover:bg-sage-50 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/5"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={msg.role === 'user'
                  ? 'ml-6 self-end rounded-2xl rounded-tr-sm bg-sage-700 px-3 py-2 text-sm text-white'
                  : 'mr-6 self-start rounded-2xl rounded-tl-sm bg-neutral-100 px-3 py-2 text-sm text-neutral-800 dark:bg-white/10 dark:text-neutral-100'}
              >
                <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                {msg.role === 'assistant' && msg.path && !msg.blocked && (
                  <Link
                    to={msg.path}
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sage-700 hover:underline dark:text-sage-300"
                  >
                    Abrir esta área <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}

            {help.isPending && (
              <div className="mr-6 flex items-center gap-2 self-start rounded-2xl rounded-tl-sm bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:bg-white/10 dark:text-neutral-400" role="status">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                Procurando...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={event => void submit(event)} className="mt-auto border-t border-neutral-100 p-3 dark:border-white/10">
            <label htmlFor="product-help-question" className="sr-only">Digite sua dúvida sobre o UseCognia</label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                id="product-help-question"
                value={question}
                onChange={event => setQuestion(event.target.value.slice(0, 300))}
                placeholder=""
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
              />
              <button
                type="submit"
                disabled={question.trim().length < 2 || help.isPending}
                aria-label="Enviar dúvida"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-700 text-white transition hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls="product-help-title"
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-sage-700 px-4 font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2 lg:bottom-6 lg:right-6"
      >
        <HelpCircle className="h-5 w-5" />
        <span>Ajuda</span>
      </button>
    </>
  )
}
