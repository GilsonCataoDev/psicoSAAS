import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain, ClipboardCopy, Check, ArrowRight, ShieldAlert,
  Sparkles, ChevronDown, Loader2,
} from 'lucide-react'
import { track, EVENTS } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { buildSafeEvolutionDraft } from '@/lib/safe-evolution-draft'

// ─── Types ────────────────────────────────────────────────────────────────────

type Abordagem = 'tcc' | 'psicanalise' | 'humanismo' | 'fenomenologia' | 'outra'
type Ciclo = 'crianca' | 'adolescente' | 'adulto' | 'idoso'

interface FormData {
  abordagem: Abordagem | ''
  ciclo: Ciclo | ''
  resumo: string
}

const ABORDAGEM_LABEL: Record<Abordagem, string> = {
  tcc: 'TCC — Terapia Cognitivo-Comportamental',
  psicanalise: 'Psicanálise',
  humanismo: 'Humanismo / Gestalt',
  fenomenologia: 'Fenomenologia / Existencial',
  outra: 'Outra abordagem',
}

const CICLO_LABEL: Record<Ciclo, string> = {
  crianca: 'Criança (0–11 anos)',
  adolescente: 'Adolescente (12–17 anos)',
  adulto: 'Adulto (18–59 anos)',
  idoso: 'Idoso (60+ anos)',
}

function generateEvolucao(form: FormData): string {
  if (!form.abordagem || !form.ciclo || !form.resumo.trim()) return ''
  return buildSafeEvolutionDraft({
    approachLabel: ABORDAGEM_LABEL[form.abordagem],
    lifeCycleLabel: CICLO_LABEL[form.ciclo],
    sessionSummary: form.resumo,
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectField({
  label, value, onChange, options, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'input-field w-full appearance-none pr-9',
            !value && 'text-neutral-400',
          )}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-sage-300 hover:text-sage-700',
      )}
    >
      {copied
        ? <><Check className="h-3.5 w-3.5" /> Copiado!</>
        : <><ClipboardCopy className="h-3.5 w-3.5" /> Copiar texto</>}
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EvolucaoPsicologicaPage() {
  const [form, setForm] = useState<FormData>({ abordagem: '', ciclo: '', resumo: '' })
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  // Força modo claro — esta é uma página pública de marketing
  useEffect(() => {
    const html = document.documentElement
    const wasDark = html.classList.contains('dark')
    html.classList.remove('dark')
    return () => { if (wasDark) html.classList.add('dark') }
  }, [])

  // Validação: mínimo de 5 palavras distintas com > 2 letras (evita "aaaaaaa")
  const isResumoMeaningful = (() => {
    const words = form.resumo.trim().split(/\s+/).filter(w => w.length > 2)
    const unique = new Set(words.map(w => w.toLowerCase()))
    return unique.size >= 5
  })()

  const isFormValid = form.abordagem && form.ciclo && isResumoMeaningful

  // [ANALYTICS] tool_open — dispara ao montar
  useEffect(() => {
    track(EVENTS.TOOL_OPENED)
  }, [])

  function handleGenerate() {
    if (!isFormValid) return

    track(EVENTS.TOOL_GENERATED, {
      abordagem: form.abordagem,
      ciclo: form.ciclo,
    })

    setLoading(true)
    setResult('')
    setTimeout(() => {
      setResult(generateEvolucao(form))
      setLoading(false)
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }, 150)
  }

  const ABORDAGEM_OPTIONS = [
    { value: 'tcc',          label: 'TCC — Terapia Cognitivo-Comportamental' },
    { value: 'psicanalise',  label: 'Psicanálise' },
    { value: 'humanismo',    label: 'Humanismo / Gestalt' },
    { value: 'fenomenologia',label: 'Fenomenologia / Existencial' },
    { value: 'outra',        label: 'Outra abordagem' },
  ]

  const CICLO_OPTIONS = [
    { value: 'crianca',     label: 'Criança (0–11 anos)' },
    { value: 'adolescente', label: 'Adolescente (12–17 anos)' },
    { value: 'adulto',      label: 'Adulto (18–59 anos)' },
    { value: 'idoso',       label: 'Idoso (60+ anos)' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sage-50/30">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/plataforma" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage-600 shadow-sm">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-neutral-800 group-hover:text-sage-700 transition-colors">
              UseCognia
            </span>
            <span className="hidden sm:inline text-xs text-neutral-400 border-l border-neutral-200 pl-2 ml-0.5">
              Ferramenta gratuita
            </span>
          </Link>
          <Link
            to="/cadastro"
            onClick={() => track(EVENTS.TOOL_CTA_CLICKED, { location: 'header' })}
            className="btn-primary text-sm px-4 py-2"
          >
            Criar conta gratuita
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700">
            <Sparkles className="h-3.5 w-3.5" />
            Gratuito · sem cadastro · processado no navegador
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Organizador de Evolução<br className="sm:hidden" />{' '}
            <span className="text-sage-600">Psicológica</span>
          </h1>
          <p className="mx-auto max-w-lg text-base text-neutral-500">
            Transforme suas próprias anotações em um rascunho estruturado para revisar.
            A ferramenta não inventa intervenções, respostas ou conclusões clínicas.
          </p>
        </div>

        {/* Formulário */}
        <section className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Abordagem clínica"
              value={form.abordagem}
              onChange={v => setForm(f => ({ ...f, abordagem: v as Abordagem }))}
              options={ABORDAGEM_OPTIONS}
              placeholder="Selecione a abordagem…"
            />
            <SelectField
              label="Ciclo de vida do paciente"
              value={form.ciclo}
              onChange={v => setForm(f => ({ ...f, ciclo: v as Ciclo }))}
              options={CICLO_OPTIONS}
              placeholder="Selecione o ciclo…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Resumo da sessão
            </label>
            <textarea
              rows={5}
              value={form.resumo}
              onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))}
              placeholder="Paciente relatou melhora na ansiedade ao aplicar a técnica de respiração diafragmática exposta na sessão anterior, porém trouxe demandas de conflito familiar com o cônjuge, com relatos de desgaste emocional e dificuldade de comunicação…"
              className="input-field resize-none"
            />
            {form.resumo.length > 0 && !isResumoMeaningful && (
              <p className="text-xs text-amber-500 mt-1">
                Descreva a sessão com ao menos 5 palavras diferentes para gerar a evolução.
              </p>
            )}
          </div>

          {/* LGPD notice */}
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <span>
              <strong>Privacidade:</strong> o texto é organizado somente neste navegador e não é enviado
              ao UseCognia. Mesmo assim, evite nomes ou dados diretamente identificáveis do paciente.
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!isFormValid || loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Organizando rascunho…</>
              : <><Sparkles className="h-5 w-5" /> Organizar meu rascunho</>}
          </button>
        </section>

        {/* Resultado */}
        {result && (
          <section ref={resultRef} className="animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-700">Rascunho organizado</h2>
              <CopyButton text={result} />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-sm">
              <div className="p-6">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700">
                  {result}
                </pre>
              </div>

            </div>

            {/* CTA principal */}
            <div className="rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 to-mist-50/30 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-neutral-900">
                      Quer salvar isso direto no prontuário?
                    </p>
                    <p className="text-sm text-neutral-500">
                      No UseCognia, você revisa o rascunho e salva a versão final no prontuário do paciente, mantendo histórico e documentos organizados.
                    </p>
                  </div>
                  <Link
                    to="/cadastro"
                    onClick={() => track(EVENTS.TOOL_CTA_CLICKED, { location: 'result_cta' })}
                    className="btn-primary shrink-0 flex items-center gap-2 whitespace-nowrap"
                  >
                    Salvar no prontuário do UseCognia
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
          </section>
        )}

        {/* Trust signals */}
        <footer className="border-t border-neutral-100 pt-8 pb-4">
          <div className="grid grid-cols-2 gap-4 text-center text-xs text-neutral-400 sm:grid-cols-4">
            {[
              { icon: '🔒', label: 'Processado no navegador' },
              { icon: '🇧🇷', label: 'Desenvolvido no Brasil' },
              { icon: '⚕️', label: 'Para psicólogos e terapeutas' },
              { icon: '✅', label: 'Revisão profissional obrigatória' },
            ].map(t => (
              <div key={t.label} className="flex flex-col items-center gap-1">
                <span className="text-lg">{t.icon}</span>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-neutral-300">
            Esta ferramenta organiza o texto informado para auxiliar a documentação clínica.
            O psicólogo é integralmente responsável pelo conteúdo final do prontuário.{' '}
            <Link to="/privacidade" className="underline hover:text-neutral-400">Privacidade</Link>
          </p>
        </footer>
      </main>
    </div>
  )
}
