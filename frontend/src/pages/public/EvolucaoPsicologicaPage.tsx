import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Brain, ClipboardCopy, Check, ArrowRight, ShieldAlert,
  Sparkles, Lock, ChevronDown, X, Loader2, ExternalLink,
} from 'lucide-react'
import { track, EVENTS } from '@/lib/analytics'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Abordagem = 'tcc' | 'psicanalise' | 'humanismo' | 'fenomenologia' | 'outra'
type Ciclo = 'crianca' | 'adolescente' | 'adulto' | 'idoso'

interface FormData {
  abordagem: Abordagem | ''
  ciclo: Ciclo | ''
  resumo: string
}

const STORAGE_KEY = 'ecp_use_count'
const EMAIL_KEY   = 'ecp_email_captured'
const FREE_USES   = 2

// ─── Mock AI Engine ───────────────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  const matches: string[] = []
  const map: Record<string, string> = {
    ansiedade:    'ansiedade',
    angústia:     'angústia',
    'angustia':   'angústia',
    depressão:    'depressão',
    'depressao':  'depressão',
    medo:         'medo',
    fobia:        'fobia',
    pânico:       'pânico',
    'panico':     'pânico',
    conflito:     'conflito familiar',
    família:      'dinâmica familiar',
    'familia':    'dinâmica familiar',
    cônjuge:      'conflito conjugal',
    'conjuge':    'conflito conjugal',
    relacionamento: 'dificuldades nos relacionamentos',
    trabalho:     'estresse ocupacional',
    emprego:      'estresse ocupacional',
    trauma:       'conteúdo traumático',
    luto:         'processo de luto',
    perda:        'vivência de perda',
    sono:         'alterações do sono',
    alimentação:  'padrão alimentar',
    'alimentacao':'padrão alimentar',
    automutilação:'comportamento autolesivo',
    'automutilacao':'comportamento autolesivo',
    suicídio:     'ideação suicida',
    'suicidio':   'ideação suicida',
    raiva:        'regulação emocional da raiva',
    culpa:        'sentimentos de culpa',
    vergonha:     'sentimentos de vergonha',
    isolamento:   'isolamento social',
    melhora:      'evolução clínica positiva',
    piora:        'agravamento sintomático',
    recaída:      'recaída',
    'recaida':    'recaída',
    respiração:   'técnica de respiração diafragmática',
    'respiracao': 'técnica de respiração diafragmática',
    mindfulness:  'prática de mindfulness',
    meditação:    'prática meditativa',
    'meditacao':  'prática meditativa',
  }
  for (const [kw, label] of Object.entries(map)) {
    if (lower.includes(kw) && !matches.includes(label)) matches.push(label)
  }
  return matches
}

const CICLO_LABEL: Record<Ciclo, string> = {
  crianca:      'infância',
  adolescente:  'adolescência',
  adulto:       'fase adulta',
  idoso:        'terceira idade',
}

const CICLO_PRONOUN: Record<Ciclo, string> = {
  crianca:      'A criança',
  adolescente:  'O/A adolescente',
  adulto:       'O/A paciente',
  idoso:        'O/A paciente',
}

function buildOpening(abordagem: Abordagem, ciclo: Ciclo): string {
  const cicloLabel = CICLO_LABEL[ciclo]
  const openings: Record<Abordagem, string> = {
    tcc: `Sessão conduzida sob o referencial da Terapia Cognitivo-Comportamental (TCC), com foco na identificação e reestruturação de pensamentos automáticos disfuncionais e padrões cognitivos associados às queixas apresentadas durante a ${cicloLabel}. O setting terapêutico foi mantido com enquadramento estruturado, favorecendo a psicoeducação e o desenvolvimento de repertórios comportamentais adaptativos.`,
    psicanalise: `Sessão conduzida sob orientação psicanalítica, com escuta flutuante e atenção às formações do inconsciente manifestas no discurso. Durante a ${cicloLabel}, observa-se a emergência de material clinicamente relevante articulado aos complexos e às vicissitudes pulsionais características desta fase do desenvolvimento. A transferência foi acolhida e manejada conforme as demandas do processo.`,
    humanismo: `Sessão realizada dentro da perspectiva humanista-existencial com integração de técnicas da Gestalt-terapia. A abordagem privilegiou o contato genuíno, a escuta empática e o resgate da experiência vivida no aqui-e-agora. O trabalho na ${cicloLabel} foi orientado pela valorização da capacidade de auto-atualização e pelo fortalecimento do senso de responsabilidade pessoal.`,
    fenomenologia: `Sessão orientada pela perspectiva fenomenológico-existencial, com postura de epoché e atenção às estruturas de sentido emergentes na narrativa. A escuta foi direcionada às vivências e à intencionalidade presente no discurso, buscando compreender o horizonte de significados que organiza a experiência subjetiva na ${cicloLabel}.`,
    outra: `Sessão realizada conforme abordagem clínica adotada pelo terapeuta, com escuta qualificada e atenção às demandas apresentadas. O trabalho na ${cicloLabel} foi conduzido com rigor técnico e ética profissional, respeitando os princípios norteadores do referencial teórico utilizado.`,
  }
  return openings[abordagem]
}

function buildContent(abordagem: Abordagem, ciclo: Ciclo, keywords: string[]): string {
  const pronoun = CICLO_PRONOUN[ciclo]
  const hasKeywords = keywords.length > 0

  const kw1 = hasKeywords ? keywords[0] : 'sintomatologia apresentada'
  const kw2 = keywords.length > 1 ? keywords[1] : 'padrão de funcionamento psíquico'

  const contentMap: Record<Abordagem, string> = {
    tcc: `${pronoun} trouxe relatos pertinentes relacionados à ${kw1}, os quais foram explorados a partir do modelo cognitivo, evidenciando a relação entre pensamentos distorcidos, reações emocionais e comportamentos-problema. A análise funcional indicou a presença de ${kw2} como fator de manutenção do quadro. Foram aplicadas intervenções de reestruturação cognitiva, questionamento socrático e registro de pensamentos, visando ampliar a consciência metacognitiva. ${pronoun} demonstrou capacidade de insight e engajamento nas tarefas propostas.`,
    psicanalise: `Ao longo da sessão, ${pronoun.toLowerCase()} trouxe associações livres permeadas por referências à ${kw1}, nas quais foi possível identificar representações psíquicas ligadas a núcleos conflitivos não elaborados. O material relacionado à ${kw2} apontou para a presença de mecanismos de defesa como formação reativa e deslocamento, que merecem atenção continuada no processo. A escuta do analista favoreceu a circulação do discurso e a emergência de conteúdos latentes com potencial elaborativo.`,
    humanismo: `No espaço terapêutico, ${pronoun.toLowerCase()} entrou em contato com a experiência de ${kw1}, permitindo uma exploração mais aprofundada da ${kw2} como parte de seu campo de existência. O trabalho com a polaridade e com os bloqueios de contato revelou aspectos significativos da forma como ${pronoun.toLowerCase()} organiza sua experiência. A intervenção privilegiou a ampliação da consciência, o contato com o presente e a reconexão com potencialidades pessoais, com ênfase no processo de autoconhecimento e crescimento.`,
    fenomenologia: `A narrativa de ${pronoun.toLowerCase()} revelou, em sua estrutura intencional, uma experiência marcada pela vivência de ${kw1}. A análise hermenêutica do discurso evidenciou que a ${kw2} se configura como horizonte que condiciona a abertura ao mundo e às possibilidades de ser. O terapeuta adotou postura de redução fenomenológica, suspendendo pressupostos teóricos a fim de acolher a singularidade da experiência narrada, favorecendo a emergência de novos sentidos e a ampliação da compreensão de si.`,
    outra: `Ao longo da sessão, ${pronoun.toLowerCase()} abordou conteúdos relacionados à ${kw1} e à ${kw2}. O trabalho clínico foi orientado pela demanda apresentada, com intervenções técnicas adequadas ao contexto e à fase de desenvolvimento. ${pronoun} demonstrou disposição para a reflexão e para o processo terapêutico, sendo perceptível movimento de elaboração dos conteúdos trabalhados.`,
  }

  return contentMap[abordagem]
}

function buildClosing(abordagem: Abordagem, ciclo: Ciclo): string {
  const closings: Record<Abordagem, string> = {
    tcc: `Como encaminhamento terapêutico, foram acordadas tarefas de automonitoramento e registro de humor para a próxima sessão, com vistas ao fortalecimento das habilidades de enfrentamento e à generalização dos ganhos terapêuticos para o cotidiano. O plano terapêutico segue em conformidade com os objetivos estabelecidos inicialmente, com revisão periódica de metas.`,
    psicanalise: `Ao encerramento da sessão, foi observada a manutenção do vínculo transferencial de forma produtiva, constituindo base segura para o trabalho psíquico em curso. O processo segue seu desenvolvimento natural, com indicativos de mobilização das resistências e aprofundamento da capacidade elaborativa. A continuidade do trabalho analítico está indicada, mantendo a frequência das sessões.`,
    humanismo: `A sessão foi encerrada com devolutiva ao paciente acerca dos temas emergentes e dos avanços percebidos no processo de autoconhecimento. O vínculo terapêutico encontra-se consolidado, oferecendo suporte para a exploração de temas mais profundos nas próximas sessões. O processo terapêutico evolui de forma coerente com os objetivos elencados no contrato terapêutico.`,
    fenomenologia: `Ao findar a sessão, foi possível perceber uma abertura maior à reflexão sobre os sentidos construídos ao longo do encontro terapêutico. O diálogo fenomenológico propiciou novos horizontes de compreensão e indicou direções promissoras para as próximas sessões. O processo terapêutico encontra-se em fase de aprofundamento, com boa adesão e engajamento existencial.`,
    outra: `Ao encerrar a sessão, foram estabelecidos os próximos passos do processo terapêutico, em alinhamento com as metas traçadas conjuntamente. O paciente demonstrou boa adesão ao tratamento e o prognóstico é favorável dentro do esperado para esta fase do processo. A próxima sessão está agendada conforme combinado.`,
  }
  return closings[abordagem]
}

function generateEvolucao(form: FormData): string {
  if (!form.abordagem || !form.ciclo || !form.resumo.trim()) return ''

  const abordagem = form.abordagem as Abordagem
  const ciclo = form.ciclo as Ciclo
  const keywords = extractKeywords(form.resumo)

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  const opening = buildOpening(abordagem, ciclo)
  const content = buildContent(abordagem, ciclo, keywords)
  const closing = buildClosing(abordagem, ciclo)

  return `EVOLUÇÃO PSICOLÓGICA — ${today}

${opening}

${content}

${closing}`
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

function EmailModal({
  open, onCapture,
}: {
  open: boolean
  onCapture: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) { setError('E-mail inválido.'); return }
    setSubmitting(true)
    // [ANALYTICS] email_capture event
    track(EVENTS.TOOL_EMAIL_CAPTURE, { email_domain: email.split('@')[1] ?? '' })
    // Simula pequeno delay para feedback
    setTimeout(() => {
      localStorage.setItem(EMAIL_KEY, email)
      onCapture(email)
      setSubmitting(false)
    }, 600)
  }

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-100 bg-white p-6 shadow-2xl data-[state=open]:animate-pop"
        >
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-50">
            <Lock className="h-5 w-5 text-sage-600" />
          </div>

          <Dialog.Title className="text-center text-lg font-semibold text-neutral-900">
            Você atingiu o limite gratuito
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-center text-sm text-neutral-500">
            Informe seu e-mail para liberar mais usos e receber dicas clínicas exclusivas. Sem spam, prometemos.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div>
              <label className="sr-only">E-mail profissional</label>
              <input
                type="email"
                autoFocus
                placeholder="seu@email.com.br"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                className="input-field w-full"
              />
              {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={submitting || !email}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Liberando…</>
                : 'Liberar meu acesso gratuito →'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-neutral-400">
            Ao continuar, você concorda com nossa{' '}
            <Link to="/privacidade" target="_blank" className="underline hover:text-sage-600">
              política de privacidade
            </Link>.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
  const [useCount, setUseCount] = useState<number>(() => {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)
  })
  const [emailCaptured, setEmailCaptured] = useState<boolean>(() => {
    return !!localStorage.getItem(EMAIL_KEY)
  })
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [blurred, setBlurred] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  const isFormValid = form.abordagem && form.ciclo && form.resumo.trim().length >= 20

  // [ANALYTICS] tool_open — dispara ao montar
  useEffect(() => {
    track(EVENTS.TOOL_OPENED)
  }, [])

  function handleGenerate() {
    if (!isFormValid) return

    const nextCount = useCount + 1

    // [ANALYTICS] tool_generate — dispara em cada geração
    track(EVENTS.TOOL_GENERATED, {
      abordagem: form.abordagem,
      ciclo: form.ciclo,
      use_number: nextCount,
    })

    setLoading(true)
    setResult('')
    setBlurred(false)

    // Simula latência de uma IA real (800-1200ms)
    const delay = 800 + Math.random() * 400
    setTimeout(() => {
      const text = generateEvolucao(form)
      setResult(text)
      setUseCount(nextCount)
      localStorage.setItem(STORAGE_KEY, String(nextCount))

      // Paywall: a partir do 3º uso, blur + modal (a menos que já tenha email)
      if (nextCount > FREE_USES && !emailCaptured) {
        setBlurred(true)
        setShowEmailModal(true)
      }

      setLoading(false)

      // Scroll suave até o resultado
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }, delay)
  }

  function handleEmailCapture(_email: string) {
    setEmailCaptured(true)
    setShowEmailModal(false)
    setBlurred(false)
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
            100% gratuito · sem cadastro
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Gerador de Evolução<br className="sm:hidden" />{' '}
            <span className="text-sage-600">Psicológica</span>
          </h1>
          <p className="mx-auto max-w-lg text-base text-neutral-500">
            Insira o resumo da sessão e receba um texto técnico e formatado,
            pronto para o prontuário — adaptado à sua abordagem clínica.
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
            <p className={cn(
              'text-right text-xs transition-colors',
              form.resumo.length < 20 && form.resumo.length > 0
                ? 'text-amber-500'
                : 'text-neutral-300',
            )}>
              {form.resumo.length} caracteres {form.resumo.length < 20 && form.resumo.length > 0 && '(mínimo 20)'}
            </p>
          </div>

          {/* LGPD notice */}
          <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <span>
              <strong>Segurança e LGPD:</strong> Nunca insira nomes reais ou dados diretamente
              identificáveis do paciente. Utilize apenas o resumo clínico dos fatos.
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!isFormValid || loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Gerando evolução…</>
              : <><Sparkles className="h-5 w-5" /> Gerar evolução psicológica</>}
          </button>

          {!emailCaptured && useCount >= FREE_USES && (
            <p className="text-center text-xs text-neutral-400">
              {FREE_USES - useCount >= 0
                ? `${FREE_USES - useCount} uso${FREE_USES - useCount !== 1 ? 's' : ''} gratuito restante`
                : 'Acesso liberado via e-mail'}
            </p>
          )}
        </section>

        {/* Resultado */}
        {result && (
          <section ref={resultRef} className="animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-700">Evolução gerada</h2>
              {!blurred && <CopyButton text={result} />}
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-sm">
              <div className={cn(
                'p-6 transition-all duration-300',
                blurred && 'blur-sm select-none pointer-events-none',
              )}>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-neutral-700">
                  {result}
                </pre>
              </div>

              {/* Overlay quando blurred */}
              {blurred && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-50 shadow">
                    <Lock className="h-5 w-5 text-sage-600" />
                  </div>
                  <p className="text-sm font-semibold text-neutral-800">Texto bloqueado</p>
                  <p className="text-xs text-neutral-500">Informe seu e-mail para liberar</p>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(true)}
                    className="btn-primary text-sm px-5 py-2"
                  >
                    Liberar gratuitamente
                  </button>
                </div>
              )}
            </div>

            {/* CTA principal */}
            {!blurred && (
              <div className="rounded-2xl border border-sage-200 bg-gradient-to-br from-sage-50 to-mist-50/30 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-neutral-900">
                      Quer salvar isso direto no prontuário?
                    </p>
                    <p className="text-sm text-neutral-500">
                      No UseCognia, a evolução é gerada e salva automaticamente no prontuário do paciente — com histórico, assinatura digital e muito mais.
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
            )}
          </section>
        )}

        {/* Trust signals */}
        <footer className="border-t border-neutral-100 pt-8 pb-4">
          <div className="grid grid-cols-2 gap-4 text-center text-xs text-neutral-400 sm:grid-cols-4">
            {[
              { icon: '🔒', label: 'Dados não armazenados' },
              { icon: '🇧🇷', label: 'Desenvolvido no Brasil' },
              { icon: '⚕️', label: 'Para psicólogos' },
              { icon: '✅', label: 'Em conformidade com a LGPD' },
            ].map(t => (
              <div key={t.label} className="flex flex-col items-center gap-1">
                <span className="text-lg">{t.icon}</span>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-neutral-300">
            Esta ferramenta gera texto auxiliar para fins de documentação clínica.
            O psicólogo é integralmente responsável pelo conteúdo final do prontuário.{' '}
            <Link to="/privacidade" className="underline hover:text-neutral-400">Privacidade</Link>
          </p>
        </footer>
      </main>

      {/* Email modal */}
      <EmailModal open={showEmailModal} onCapture={handleEmailCapture} />
    </div>
  )
}
