import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertTriangle, Copy, Lock, PlusCircle, RefreshCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import {
  useDeleteNeuropsychAiAnalysis, useGenerateNeuropsychAiAnalysis,
  useNeuropsychAiAnalyses, useNeuropsychAiUsage,
} from '@/hooks/useApi'
import { useHasPlan } from '@/store/subscription'
import { renderNeuropsychAiAnalysisAsText } from '@/lib/neuropsychAiText'
import Modal from '@/components/ui/Modal'
import { NeuropsychAiAnalysis, NeuropsychAiAnalysisField, NeuropsychAiClinicalPoint, NeuropsychAssessment } from '@/types'

const CONSENT_STORAGE_KEY = ['usecognia', 'neuropsych', 'copilot', 'consent', 'v1'].join('-')

function hasStoredConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const FIELD_OPTIONS: Array<{ id: NeuropsychAiAnalysisField; label: string }> = [
  { id: 'referralQuestion', label: 'Motivo e pergunta de encaminhamento' },
  { id: 'clinicalHistory', label: 'História clínica' },
  { id: 'clinicalHypotheses', label: 'Hipóteses clínicas provisórias' },
  { id: 'qualitativeObservations', label: 'Observações qualitativas gerais' },
  { id: 'batteryItems', label: 'Bateria de avaliação (resultados e observações)' },
]

const CERTAINTY_STYLE: Record<string, string> = {
  registered_data: 'border-sage-300 bg-sage-50 text-sage-800 dark:border-sage-800 dark:bg-sage-950/30 dark:text-sage-200',
  cautious_inference: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
  missing_information: 'border-neutral-300 bg-neutral-50 text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300',
}
const CERTAINTY_LABEL: Record<string, string> = {
  registered_data: 'dado registrado',
  cautious_inference: 'inferência cautelosa',
  missing_information: 'informação ausente',
}

type Props = {
  assessment: NeuropsychAssessment
  onAddToDraft: (text: string) => void
}

export default function NeuropsychCopilotPanel({ assessment, onAddToDraft }: Props) {
  const hasPro = useHasPlan('pro')
  const { data: usage } = useNeuropsychAiUsage(hasPro ? assessment.id : undefined)
  const { data: analyses = [], isLoading } = useNeuropsychAiAnalyses(hasPro ? assessment.id : undefined)
  const generate = useGenerateNeuropsychAiAnalysis(assessment.id)
  const deleteAnalysis = useDeleteNeuropsychAiAnalysis(assessment.id)
  const [selectedFields, setSelectedFields] = useState<NeuropsychAiAnalysisField[]>(['referralQuestion', 'clinicalHistory', 'clinicalHypotheses', 'batteryItems'])
  const [consentGiven, setConsentGiven] = useState(hasStoredConsent)
  const [showConsentModal, setShowConsentModal] = useState(false)
  // Guarda síncrona contra duplo clique: generate.isPending só reflete no próximo
  // render, então um segundo clique rápido pode disparar antes do React repintar.
  const submittingRef = useRef(false)

  if (!hasPro) {
    return (
      <section className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-neutral-400" />
          <h2 className="font-semibold text-neutral-900 dark:text-white">Copiloto clínico (IA)</h2>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          O Copiloto de Raciocínio Clínico ajuda a organizar convergências, divergências e hipóteses a partir dos registros da avaliação, disponível no plano Pro.
        </p>
        <Link to="/planos" className="btn-primary inline-flex w-fit items-center gap-2">
          <Sparkles className="h-4 w-4" /> Conhecer o plano Pro
        </Link>
      </section>
    )
  }

  const atLimit = !!usage && usage.limit > 0 && usage.used >= usage.limit
  const latest = analyses[0]

  function toggleField(field: NeuropsychAiAnalysisField) {
    setSelectedFields(current => current.includes(field) ? current.filter(f => f !== field) : [...current, field])
  }

  function requestAnalyze() {
    if (selectedFields.length === 0) return toast.error('Selecione ao menos uma informação para incluir na análise')
    if (!consentGiven) { setShowConsentModal(true); return }
    void analyze()
  }

  function confirmConsentAndAnalyze() {
    try { localStorage.setItem(CONSENT_STORAGE_KEY, '1') } catch { /* modo privado: consentimento vale só para esta sessão */ }
    setConsentGiven(true)
    setShowConsentModal(false)
    void analyze()
  }

  async function analyze() {
    if (submittingRef.current || generate.isPending) return
    if (analyses.length > 0 && !window.confirm('Uma nova análise será gerada e adicionada ao histórico. Continuar?')) return
    submittingRef.current = true
    try {
      await generate.mutateAsync(selectedFields)
      toast.success('Análise gerada. Revise antes de usar.')
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Não foi possível gerar a análise agora')
    } finally {
      submittingRef.current = false
    }
  }

  function copyAnalysis(analysis: NeuropsychAiAnalysis) {
    navigator.clipboard.writeText(renderNeuropsychAiAnalysisAsText(analysis.result))
    toast.success('Copiado para a área de transferência')
  }

  function addToDraft(analysis: NeuropsychAiAnalysis) {
    if (!window.confirm('Isso vai adicionar a sugestão da IA ao final do rascunho de integração. Você poderá editar livremente antes de salvar. Continuar?')) return
    onAddToDraft(renderNeuropsychAiAnalysisAsText(analysis.result))
    toast.success('Adicionado ao rascunho de integração')
  }

  async function removeAnalysis(analysisId: string) {
    if (!window.confirm('Excluir esta análise permanentemente?')) return
    try {
      await deleteAnalysis.mutateAsync(analysisId)
      toast.success('Análise excluída')
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Não foi possível excluir')
    }
  }

  return (
    <section className="card space-y-5 p-5" aria-busy={generate.isPending}>
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-violet-600" /> Copiloto clínico (IA)
        </h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Apoia o raciocínio clínico a partir dos registros selecionados. Não corrige testes, não recebe itens ou tabelas normativas e não substitui o julgamento profissional.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-xs text-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>O nome, CPF, telefone, e-mail e endereço da pessoa nunca são enviados. Apenas os campos que você selecionar abaixo são processados, pelo servidor, sem armazenar o texto enviado. A resposta é uma sugestão — cabe a você validar clinicamente.</p>
      </div>

      {usage && (
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {usage.used} de {usage.limit} análises utilizadas neste mês
        </p>
      )}

      <div>
        <p className="label">Informações a incluir na análise</p>
        <div className="flex flex-wrap gap-2">
          {FIELD_OPTIONS.map(option => (
            <button
              key={option.id}
              type="button"
              aria-pressed={selectedFields.includes(option.id)}
              onClick={() => toggleField(option.id)}
              disabled={generate.isPending}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${selectedFields.includes(option.id)
                ? 'border-violet-400 bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-100'
                : 'border-neutral-200 text-neutral-500 hover:border-violet-300 dark:border-white/10 dark:text-neutral-300'} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {atLimit ? (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Limite mensal de análises do Copiloto atingido. O contador é reiniciado no próximo mês.</p>
        </div>
      ) : (
        <button onClick={requestAnalyze} disabled={generate.isPending} className="btn-primary flex w-fit items-center gap-2">
          {generate.isPending
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Analisando...</>
            : <><Sparkles className="h-4 w-4" /> {analyses.length > 0 ? 'Gerar nova análise' : 'Analisar com IA'}</>}
        </button>
      )}

      {generate.isPending && (
        <div
          role="status"
          aria-live="polite"
          aria-label="Análise clínica em andamento"
          className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 text-violet-900 dark:border-violet-700/60 dark:bg-violet-950/30 dark:text-violet-100"
        >
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 shrink-0 animate-spin" />
            <div>
              <p className="text-sm font-semibold">Organizando as informações selecionadas</p>
              <p className="mt-0.5 text-xs text-violet-700 dark:text-violet-200">
                A análise pode levar de 15 a 30 segundos. Aguarde nesta página; o resultado aparecerá automaticamente.
              </p>
            </div>
          </div>
          <div
            role="progressbar"
            aria-label="Progresso da análise"
            aria-valuetext="Processando a análise"
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-violet-200 dark:bg-violet-900"
          >
            <div className="h-full w-2/3 animate-pulse rounded-full bg-violet-600 dark:bg-violet-400" />
          </div>
        </div>
      )}

      <Modal
        open={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        title="Processamento por IA externa"
        description="Confirme antes do primeiro uso do Copiloto clínico"
      >
        <div className="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
          <p>
            Ao usar o Copiloto, os campos clínicos que você selecionar são enviados a um provedor externo de
            inteligência artificial (Anthropic/Claude) para gerar a sugestão. Antes do envio, o nome do paciente e
            padrões como CPF, telefone, e-mail, CEP, endereço e data de nascimento são reduzidos automaticamente —
            isso é uma <strong>redução de identificadores diretos</strong>, não uma anonimização garantida.
          </p>
          <p>
            O provedor processa o texto para gerar a resposta e não o mantém retido para treinamento. A resposta
            fica sob sua responsabilidade profissional de revisão antes de qualquer uso clínico.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowConsentModal(false)} className="btn-secondary">Cancelar</button>
            <button onClick={confirmConsentAndAnalyze} className="btn-primary">Entendi e concordo</button>
          </div>
        </div>
      </Modal>

      {isLoading ? <div className="h-24 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" /> : latest && (
        <div className="space-y-4">
          <AnalysisResultView analysis={latest} onCopy={() => copyAnalysis(latest)} onAddToDraft={() => addToDraft(latest)} onDelete={() => removeAnalysis(latest.id)} />
          {analyses.length > 1 && (
            <details className="text-xs text-neutral-500 dark:text-neutral-400">
              <summary className="cursor-pointer font-medium">Ver {analyses.length - 1} análise(s) anterior(es)</summary>
              <div className="mt-3 space-y-4">
                {analyses.slice(1).map(analysis => (
                  <AnalysisResultView key={analysis.id} analysis={analysis} onCopy={() => copyAnalysis(analysis)} onAddToDraft={() => addToDraft(analysis)} onDelete={() => removeAnalysis(analysis.id)} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  )
}

function AnalysisResultView({ analysis, onCopy, onAddToDraft, onDelete }: {
  analysis: NeuropsychAiAnalysis
  onCopy: () => void
  onAddToDraft: () => void
  onDelete: () => void
}) {
  const { result } = analysis
  return (
    <article className="space-y-4 rounded-2xl border border-neutral-100 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-neutral-400">{new Date(analysis.createdAt).toLocaleString('pt-BR')}</p>
        <div className="flex gap-2">
          <button onClick={onCopy} className="btn-secondary flex items-center gap-1.5 text-xs"><Copy className="h-3.5 w-3.5" />Copiar</button>
          <button onClick={onAddToDraft} className="btn-secondary flex items-center gap-1.5 text-xs"><PlusCircle className="h-3.5 w-3.5" />Adicionar ao rascunho</button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Excluir análise"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <PointSection title="Síntese do caso" points={result.caseSynthesis} />
      <PointSection title="Convergências" points={result.convergences} />
      <PointSection title="Divergências / inconsistências" points={result.divergences} />
      <PointSection title="Funções possivelmente preservadas" points={result.possiblyPreservedFunctions} />
      <PointSection title="Funções com possíveis fragilidades" points={result.possibleFragilities} />
      <PointSection title="Hipóteses clínicas alternativas" points={result.alternativeHypotheses} />
      <ListSection title="Informações ausentes ou insuficientes" items={result.missingInformation} />
      <ListSection title="Perguntas para entrevista complementar" items={result.followUpQuestions} />
      <ListSection title="Pontos que exigem verificação clínica" items={result.verificationPoints} />
      <ListSection title="Sugestão de estrutura para integração" items={result.suggestedIntegrationStructure} />

      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        {result.disclaimers.map((disclaimer, index) => <p key={index}>{disclaimer}</p>)}
      </div>
    </article>
  )
}

function PointSection({ title, points }: { title: string; points: NeuropsychAiClinicalPoint[] }) {
  if (!points.length) return null
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</p>
      <div className="space-y-1.5">
        {points.map((point, index) => (
          <div key={index} className={`rounded-lg border px-3 py-2 text-sm ${CERTAINTY_STYLE[point.certainty]}`}>
            <p>{point.text}</p>
            <p className="mt-1 text-[11px] opacity-80">
              {CERTAINTY_LABEL[point.certainty]}{point.basis.length ? ` · fonte: ${point.basis.join('; ')}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{title}</p>
      <ul className="list-inside list-disc space-y-1 text-sm text-neutral-700 dark:text-neutral-300">
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  )
}
