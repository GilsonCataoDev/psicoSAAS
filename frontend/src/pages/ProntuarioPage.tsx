import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, Lock, Save, FileText, Pencil, X, Sparkles, Send, Search, History, PlusCircle, Trash2, MessageSquarePlus } from 'lucide-react'
import {
  useAcceptAiConsent, useAiConsent, usePatient, useUpdatePatient,
  useSessions, useCreateSession, useUpdateSession, useExportProntuario, useGenerateProntuarioDraft, useGenerateSessionPlan,
  useSessionHistory, useAddAddendum, useSnippets, useCreateSnippet, useDeleteSnippet,
} from '@/hooks/useApi'
import { TAG_LABELS } from '@/types'
import { Prontuario } from '@/types/prontuario'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import DictationButton from '@/components/ui/DictationButton'
import RecordingPanel from '@/components/ui/RecordingPanel'
import { useHasPlan } from '@/store/subscription'
import { useAuthStore } from '@/store/auth'
import { hasPhysiotherapyModules } from '@/lib/professions'
import PatientRecordDeliveryModal from '@/components/features/patients/PatientRecordDeliveryModal'
import { useTerms } from '@/hooks/useTerms'

const TABS = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'anamnese',      label: 'Anamnese'      },
  { id: 'plano',         label: 'Plano terapêutico' },
  { id: 'evolucao',      label: 'Evolução'      },
] as const

type Tab = typeof TABS[number]['id']
type AiProntuarioMode = 'resumo' | 'evolucao' | 'organizar'

const MOOD_LABELS: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Neutro',
  4: 'Bom',
  5: 'Muito bom',
}

/** Sessões com mais de 7 dias não podem mais ter a evolução original editada — só complementada. Mantido em sincronia com EDIT_LOCK_DAYS no backend (sessions.service.ts). */
function isPastEditLock(date: string): boolean {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  return date < cutoff.toISOString().slice(0, 10)
}

function SnippetPicker({ onInsert }: { onInsert: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const { data: snippets = [] } = useSnippets()
  const createSnippet = useCreateSnippet()
  const deleteSnippet = useDeleteSnippet()

  async function handleCreate() {
    if (!newLabel.trim() || !newContent.trim()) return
    try {
      await createSnippet.mutateAsync({ label: newLabel.trim(), content: newContent.trim() })
      setNewLabel('')
      setNewContent('')
      setAdding(false)
      toast.success('Modelo salvo')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao salvar modelo.')
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="btn-secondary flex items-center gap-1.5 text-xs"
      >
        <FileText className="h-3.5 w-3.5" />Meus modelos
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-neutral-900">
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {snippets.length === 0 && !adding && (
              <p className="px-2 py-3 text-center text-xs text-neutral-400">Nenhum modelo salvo ainda.</p>
            )}
            {snippets.map(sn => (
              <div key={sn.id} className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-white/5">
                <button
                  type="button"
                  onClick={() => { onInsert(sn.content); setOpen(false) }}
                  className="flex-1 truncate text-left text-xs text-neutral-700 dark:text-neutral-100"
                  title={sn.content}
                >
                  {sn.label}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSnippet.mutate(sn.id)}
                  className="shrink-0 rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                  title="Excluir modelo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-white/10">
            {adding ? (
              <div className="space-y-1.5">
                <input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="Nome do modelo (ex: Sem risco)"
                  className="input-field h-8 text-xs"
                  maxLength={60}
                />
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Texto a inserir..."
                  rows={3}
                  className="input-field resize-none text-xs"
                  maxLength={2000}
                />
                <div className="flex justify-end gap-1.5">
                  <button type="button" onClick={() => setAdding(false)} className="btn-secondary h-7 px-2 text-xs">Cancelar</button>
                  <button type="button" onClick={handleCreate} disabled={createSnippet.isPending} className="btn-primary h-7 px-2 text-xs">Salvar</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-sage-700 hover:bg-sage-50 dark:text-sage-300 dark:hover:bg-sage-500/10"
              >
                <PlusCircle className="h-3.5 w-3.5" />Novo modelo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const FIELD = ({
  label, value, onChange, rows, placeholder, readOnly, dictation,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  rows?: number
  placeholder?: string
  readOnly?: boolean
  dictation?: boolean
}) => (
  <div>
    <div className="mb-1 flex items-center justify-between gap-2">
      <label className="label mb-0">{label}</label>
      {rows && dictation && onChange && !readOnly && (
        <DictationButton value={value} onChange={onChange} />
      )}
    </div>
    {rows ? (
      <textarea rows={rows} value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="input-field resize-none text-sm" />
    ) : (
      <input value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="input-field text-sm" />
    )}
  </div>
)

export default function ProntuarioPage() {
  const t = useTerms()
  const isFisio = hasPhysiotherapyModules(useAuthStore(s => s.user?.profession))
  const { id } = useParams()
  const { data: patient, isLoading: patientLoading } = usePatient(id ?? '')
  const [tab, setTab] = useState<Tab>('identificacao')
  const { data: sessions = [] } = useSessions({
    patientId: id,
    includeClinical: true,
    enabled: tab === 'evolucao',
  })
  const createSession = useCreateSession()
  const updateSession = useUpdateSession()
  const updatePatient = useUpdatePatient()
  const exportProntuario = useExportProntuario(id ?? '')
  const generateProntuarioDraft = useGenerateProntuarioDraft()
  const generateSessionPlan = useGenerateSessionPlan()
  const hasPro = useHasPlan('pro')
  const [evolText, setEvolText] = useState('')
  const [evolDate, setEvolDate] = useState(new Date().toISOString().split('T')[0])
  const [aiMode, setAiMode] = useState<AiProntuarioMode>('organizar')
  const [aiDraft, setAiDraft] = useState('')
  const [generatedAiDraftId, setGeneratedAiDraftId] = useState('')
  const [acceptedAiDraftId, setAcceptedAiDraftId] = useState('')
  const [sessionPlan, setSessionPlan] = useState('')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editEvolDate, setEditEvolDate] = useState('')
  const [editEvolText, setEditEvolText] = useState('')
  const [editLocked, setEditLocked] = useState(false)
  const [addendumText, setAddendumText] = useState('')
  const [addendumTargetId, setAddendumTargetId] = useState<string | null>(null)
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null)
  const [evolSearch, setEvolSearch] = useState('')
  const [form, setForm] = useState<Partial<Prontuario>>({})
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const addAddendum = useAddAddendum()
  const { data: historyEntries = [], isLoading: historyLoading } = useSessionHistory(historyOpenId ?? undefined)
  const filteredSessions = (() => {
    const needle = evolSearch.trim().toLowerCase()
    if (!needle) return sessions
    return sessions.filter(s =>
      s.summary?.toLowerCase().includes(needle)
      || s.privateNotes?.toLowerCase().includes(needle)
      || s.nextSteps?.toLowerCase().includes(needle)
      || s.tags?.some(tag => TAG_LABELS[tag]?.toLowerCase().includes(needle)),
    )
  })()
  const { data: clinicalAiConsent } = useAiConsent('clinical_ai_processing', undefined, hasPro)
  const acceptClinicalAiConsent = useAcceptAiConsent('clinical_ai_processing')

  async function ensureClinicalAiConsent(): Promise<boolean> {
    if (clinicalAiConsent?.active) return true
    // Texto canônico vem do backend; sem ele o aceite seria recusado no servidor.
    if (!clinicalAiConsent?.text) {
      toast.error('Não foi possível carregar o termo de consentimento. Tente novamente.')
      return false
    }
    if (!window.confirm(`${clinicalAiConsent.text}\n\nDeseja ativar agora?`)) return false
    await acceptClinicalAiConsent.mutateAsync()
    return true
  }

  // Inicializa form quando o paciente carregar
  useEffect(() => {
    if (patient?.prontuario) {
      setForm(patient.prontuario as Partial<Prontuario>)
    }
  }, [patient?.id])

  function set(field: keyof Prontuario, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toDateInputValue(date: string) {
    return date?.slice(0, 10) ?? ''
  }

  function startEditingSession(sessionId: string, date: string, summary?: string) {
    setEditingSessionId(sessionId)
    setEditEvolDate(toDateInputValue(date))
    setEditEvolText(summary ?? '')
    setEditLocked(isPastEditLock(date))
  }

  function cancelEditingSession() {
    setEditingSessionId(null)
    setEditEvolDate('')
    setEditEvolText('')
    setEditLocked(false)
  }

  async function saveEditedSession() {
    if (!editingSessionId || !editEvolDate || !editEvolText.trim()) return
    try {
      await updateSession.mutateAsync({
        id: editingSessionId,
        data: {
          date: editEvolDate,
          summary: editEvolText.trim(),
        },
      })
      cancelEditingSession()
      toast.success('Evolucao atualizada')
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setEditLocked(true)
        toast.error(`${t.sessionCapitalized} bloqueada para edição direta — use "Adicionar complemento".`)
        return
      }
      toast.error('Erro ao atualizar evolução.')
    }
  }

  function startAddendum(sessionId: string) {
    setAddendumTargetId(sessionId)
    setAddendumText('')
  }

  async function saveAddendum() {
    if (!addendumTargetId || !addendumText.trim()) return
    try {
      await addAddendum.mutateAsync({ id: addendumTargetId, text: addendumText.trim() })
      setAddendumTargetId(null)
      setAddendumText('')
      cancelEditingSession()
      toast.success('Complemento adicionado')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao adicionar complemento.')
    }
  }

  async function save() {
    if (!id) return
    try {
      await updatePatient.mutateAsync({ id, data: { prontuario: form } })
      toast.success('Prontuario salvo com seguranca')
    } catch {
      toast.error(`Erro ao salvar ${t.record}.`)
    }
  }

  async function generateAiDraft() {
    if (!hasPro) {
      toast.error('IA disponivel a partir do plano Pro.')
      return
    }
    if (!evolText.trim()) {
      toast.error('Escreva a evolucao ou cole anotacoes antes de usar IA.')
      return
    }
    try {
      if (!await ensureClinicalAiConsent()) return
      const { draft, draftId } = await generateProntuarioDraft.mutateAsync({
        input: evolText,
        mode: aiMode,
        patientId: id!,
      })
      setAiDraft(draft)
      setGeneratedAiDraftId(draftId)
      setAcceptedAiDraftId('')
      toast.success('Rascunho gerado. Revise antes de salvar.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Nao foi possivel gerar o rascunho.')
    }
  }

  async function suggestFromLastSession() {
    if (!hasPro) { toast.error('IA disponivel a partir do plano Pro.'); return }
    const last = sessions[0]
    if (!last?.summary?.trim()) {
      toast.error('Nenhuma evolução anterior encontrada para basear a sugestão.')
      return
    }
    setEvolText(last.summary)
    setAiMode('evolucao')
    try {
      if (!await ensureClinicalAiConsent()) return
      const { draft, draftId } = await generateProntuarioDraft.mutateAsync({
        input: last.summary,
        mode: 'evolucao',
        patientId: id!,
      })
      setAiDraft(draft)
      setGeneratedAiDraftId(draftId)
      setAcceptedAiDraftId('')
      toast.success('Rascunho gerado baseado na última evolução. Revise antes de salvar.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Não foi possível gerar o rascunho.')
    }
  }

  async function planNextSession() {
    if (!hasPro) {
      toast.error('IA disponivel a partir do plano Pro.')
      return
    }
    if (sessions.length === 0) {
      toast.error('Ainda nao ha sessoes registradas para basear o planejamento.')
      return
    }
    const clinicalContext = sessions
      .slice(0, 5)
      .map(s => `Sessao de ${formatDate(s.date)}:\nResumo: ${s.summary ?? '(sem resumo)'}\nProximos passos: ${s.nextSteps ?? '(nao registrado)'}`)
      .join('\n\n')
    try {
      if (!await ensureClinicalAiConsent()) return
      const { draft } = await generateSessionPlan.mutateAsync({ clinicalContext, patientId: id! })
      setSessionPlan(draft)
      toast.success('Sugestao de planejamento gerada. Revise antes de usar.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Nao foi possivel gerar a sugestao de planejamento.')
    }
  }

  if (patientLoading) return (
    <div className="animate-pulse space-y-4 max-w-4xl">
      <div className="h-8 bg-neutral-100 rounded-xl w-48" />
      <div className="h-12 bg-neutral-100 rounded-2xl" />
      <div className="h-64 bg-neutral-100 rounded-2xl" />
    </div>
  )

  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-neutral-500">Pessoa não encontrada.</p>
      <Link to="/pacientes" className="btn-secondary mt-4 inline-flex">Voltar</Link>
    </div>
  )

  return (
    <div className="animate-slide-up space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/pacientes/${id}`}
          className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title">{t.recordCapitalized}</h1>
          <p className="page-subtitle truncate">{patient.name}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => exportProntuario.mutate({ audience: 'professional' })}
            disabled={exportProntuario.isPending}
            className="btn-secondary flex items-center gap-2 text-sm hidden sm:flex disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportProntuario.isPending ? 'Gerando…' : 'Backup profissional'}
          </button>

          <button
            onClick={() => setDeliveryOpen(true)}
            className="btn-secondary flex items-center gap-2 text-sm hidden sm:flex"
          >
            <Send className="w-4 h-4" />Entrega ao {t.patient}
          </button>

          <Link to={`/documentos?patient=${id}`}
            className="btn-secondary flex items-center gap-2 text-sm hidden sm:flex">
            <FileText className="w-4 h-4" />Documentos
          </Link>
          <button onClick={save} className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Salvar</span>
          </button>
        </div>
      </div>

      {/* Security banner */}
      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700">
        <Lock className="w-4 h-4 shrink-0" />
        <span>{t.recordCapitalized} protegido por criptografia AES-256 · Acesso exclusivo do profissional responsável · CFP Res. 001/2009</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
        {TABS.map(tabItem => (
          <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
            className={`flex-none sm:flex-1 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              tab === tabItem.id
                ? 'bg-white text-neutral-800 shadow-sm font-medium'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}>
            {tabItem.id === 'anamnese' ? t.intakeCapitalized : tabItem.label}
          </button>
        ))}
      </div>

      {/* ── Identificação ── */}
      {tab === 'identificacao' && (
        <div className="space-y-5">
          <div className="card space-y-4">
            <h2 className="section-title">Dados pessoais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FIELD label="Nome completo" value={patient.name} readOnly />
              <FIELD label="Data de nascimento" value={patient.birthDate ? formatDate(patient.birthDate) : '—'} readOnly />
              <FIELD label="Pronomes" value={patient.pronouns ?? '—'} readOnly />
              <FIELD label="E-mail" value={patient.email ?? '—'} readOnly />
              <FIELD label="Telefone" value={patient.phone ?? '—'} readOnly />
              <FIELD label="Escolaridade"
                value={form.escolaridade ?? ''}
                onChange={v => set('escolaridade', v)}
                placeholder="Ex: Superior completo" />
              <FIELD label="Profissão"
                value={form.profissao ?? ''}
                onChange={v => set('profissao', v)}
                placeholder="Ex: Designer" />
              <FIELD label="Estado civil"
                value={form.estadoCivil ?? ''}
                onChange={v => set('estadoCivil', v)}
                placeholder="Ex: Solteira(o)" />
              <FIELD label="Religião / espiritualidade"
                value={form.religiao ?? ''}
                onChange={v => set('religiao', v)}
                placeholder="Opcional" />
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="section-title">Contato de emergência</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FIELD label="Nome"
                value={form.contatoEmergenciaNome ?? ''}
                onChange={v => set('contatoEmergenciaNome', v)}
                placeholder="Nome completo" />
              <FIELD label="Telefone"
                value={form.contatoEmergenciaPhone ?? ''}
                onChange={v => set('contatoEmergenciaPhone', v)}
                placeholder="(11) 99999-0000" />
              <FIELD label="Relação"
                value={form.contatoEmergenciaRelacao ?? ''}
                onChange={v => set('contatoEmergenciaRelacao', v)}
                placeholder="Ex: Mãe, cônjuge..." />
            </div>
          </div>
        </div>
      )}

      {/* ── Anamnese ── */}
      {tab === 'anamnese' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="section-title">Queixa e histórico</h2>
            <FIELD label="Queixa principal" rows={3}
              value={form.queixaPrincipal ?? ''}
              onChange={v => set('queixaPrincipal', v)}
              dictation
              placeholder="Motivo que trouxe a pessoa ao atendimento..." />
            <FIELD label="História da doença / situação atual" rows={4}
              value={form.historicoDoenca ?? ''}
              onChange={v => set('historicoDoenca', v)}
              dictation
              placeholder="Evolução dos sintomas, contexto de surgimento..." />
          </div>

          {isFisio && (
            <div className="card space-y-4">
              <h2 className="section-title">Exame físico</h2>
              <FIELD label="Exame físico (semiologia fisioterapêutica)" rows={5}
                value={form.exameFisico ?? ''}
                onChange={v => set('exameFisico', v)}
                dictation
                placeholder="Inspeção, palpação, amplitude de movimento, força muscular, testes especiais, marcha..." />
            </div>
          )}

          <div className="card space-y-4">
            <h2 className="section-title">Antecedentes</h2>
            <FIELD label={isFisio ? 'Antecedentes pessoais' : 'Antecedentes pessoais (saúde mental)'} rows={3}
              value={form.antecedentesPessoais ?? ''}
              onChange={v => set('antecedentesPessoais', v)}
              dictation
              placeholder={isFisio
                ? 'Cirurgias, lesões prévias, tratamentos anteriores, comorbidades...'
                : 'Histórico de tratamentos anteriores, hospitalizações...'} />
            <FIELD label="Histórico familiar" rows={3}
              value={form.historicoFamiliar ?? ''}
              onChange={v => set('historicoFamiliar', v)}
              dictation
              placeholder="Doenças mentais na família, dinâmicas relevantes..." />
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="section-title mb-0">Saúde física</h2>
              <Lock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <FIELD label="Medicamentos em uso" rows={2}
              value={form.medicamentos ?? ''}
              onChange={v => set('medicamentos', v)}
              dictation
              placeholder="Nome, dosagem, prescritor..." />
            <FIELD label="Condições médicas / diagnósticos" rows={2}
              value={form.condicoesMedicas ?? ''}
              onChange={v => set('condicoesMedicas', v)}
              dictation
              placeholder="Doenças crónicas, cirurgias relevantes..." />
          </div>
        </div>
      )}

      {/* ── Plano terapêutico ── */}
      {tab === 'plano' && (
        <div className="card space-y-4">
          <h2 className="section-title">Plano terapêutico</h2>

          {isFisio && (
            <>
              <FIELD label="Diagnóstico cinesiofuncional" rows={3}
                value={form.diagnosticoFuncional ?? ''}
                onChange={v => set('diagnosticoFuncional', v)}
                dictation
                placeholder="Alterações de função e estrutura identificadas, limitações de atividade e restrições de participação..." />
              <FIELD label="Prognóstico funcional" rows={3}
                value={form.prognosticoFuncional ?? ''}
                onChange={v => set('prognosticoFuncional', v)}
                dictation
                placeholder="Evolução funcional esperada e fatores que podem influenciá-la..." />
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isFisio && (
              <FIELD label="Abordagem teórica"
                value={form.abordagem ?? ''}
                onChange={v => set('abordagem', v)}
                placeholder="Ex: TCC, Psicanálise, Gestalt..." />
            )}
            <FIELD label={`Frequência das ${t.sessions}`}
              value={form.frequencia ?? ''}
              onChange={v => set('frequencia', v)}
              placeholder={isFisio ? 'Ex: 3x por semana (40 min)' : 'Ex: Semanal (50 min)'} />
            <FIELD label="Duração prevista do tratamento"
              value={form.duracaoPrevista ?? ''}
              onChange={v => set('duracaoPrevista', v)}
              placeholder={isFisio ? 'Ex: 8 semanas' : 'Ex: 6 a 12 meses'} />
            {isFisio && (
              <FIELD label="Quantitativo provável de atendimentos"
                value={form.quantitativoAtendimentos ?? ''}
                onChange={v => set('quantitativoAtendimentos', v)}
                placeholder="Ex: 20 sessões" />
            )}
          </div>

          {isFisio && (
            <FIELD label="Recursos e métodos terapêuticos" rows={4}
              value={form.recursosTerapeuticos ?? ''}
              onChange={v => set('recursosTerapeuticos', v)}
              dictation
              placeholder="Cinesioterapia, terapia manual, eletrotermofototerapia, hidroterapia — com parâmetros de dosagem..." />
          )}

          <FIELD label="Objetivos terapêuticos" rows={4}
            value={form.objetivos ?? ''}
            onChange={v => set('objetivos', v)}
            dictation
            placeholder="Metas acordadas com a pessoa em atendimento..." />
          <div className="bg-sage-50 border border-sage-100 rounded-2xl p-4">
            <p className="text-xs text-sage-700 font-medium mb-1">Início do acompanhamento</p>
            <p className="text-sm text-sage-800">{formatDate(patient.startDate)}</p>
          </div>
        </div>
      )}

      {/* ── Evolução ── */}
      {tab === 'evolucao' && (
        <div className="space-y-4">
          <div className="card bg-amber-50 border-amber-100">
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Registros de evolução são criptografados. Somente você tem acesso.</span>
            </div>
          </div>

          {/* Planejamento da próxima sessão com IA */}
          <div className="card space-y-3 border-sage-100 bg-sage-50/40 dark:border-sage-400/20 dark:bg-sage-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-100">
                  <Sparkles className="h-4 w-4" />
                  Planejar próxima {t.session} com IA
                </p>
                <p className="text-xs text-sage-700 dark:text-sage-200">
                  Usa o resumo e os próximos passos das últimas {t.sessions}. Disponível a partir do Pro.
                </p>
              </div>
              <button
                type="button"
                onClick={planNextSession}
                disabled={generateSessionPlan.isPending || !hasPro}
                title={!hasPro ? 'IA disponivel a partir do plano Pro' : undefined}
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <Sparkles className="h-4 w-4" />
                {!hasPro ? 'IA no Pro' : generateSessionPlan.isPending ? 'Planejando...' : `Planejar ${t.session}`}
              </button>
            </div>
            {sessionPlan && (
              <div className="rounded-xl border border-white/70 bg-white p-3 dark:border-white/10 dark:bg-neutral-900">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Sugestão da IA</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-100">{sessionPlan}</p>
                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => setSessionPlan('')} className="btn-secondary text-sm">
                    Descartar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Nova entrada */}
          <div className="card space-y-3">
            <h2 className="section-title">Nova evolução clínica</h2>
            <p className="text-xs text-neutral-400">
              Este registro entra no histórico do {t.record} e não gera cobrança no financeiro.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data</label>
                <input type="date" value={evolDate} onChange={e => setEvolDate(e.target.value)}
                  className="input-field text-sm" />
              </div>
              <div>
                <label className="label">{t.sessionCapitalized} Nº</label>
                <input type="number" value={sessions.length + 1} readOnly className="input-field text-sm bg-neutral-50" />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="label mb-0">Descrição da {t.session}</label>
                <div className="flex items-center gap-2">
                  <SnippetPicker onInsert={text => setEvolText(prev => [prev, text].filter(Boolean).join('\n\n'))} />
                  <DictationButton value={evolText} onChange={setEvolText} />
                </div>
              </div>
              <textarea rows={5} value={evolText} onChange={e => setEvolText(e.target.value)}
                className="input-field resize-none text-sm"
                placeholder="Descreva o conteúdo trabalhado, observações clínicas, intercorrências, resposta da pessoa ao processo terapêutico..." />
            </div>
            <div className="rounded-2xl border border-sage-100 bg-sage-50/70 p-3 dark:border-sage-400/20 dark:bg-sage-500/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-sage-800 dark:text-sage-100">
                    <Sparkles className="h-4 w-4" />
                    Apoio de IA no prontuario
                  </p>
                  <p className="text-xs text-sage-700 dark:text-sage-200">
                    A IA gera um rascunho. Disponivel a partir do Pro.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={suggestFromLastSession}
                    disabled={generateProntuarioDraft.isPending || !hasPro || sessions.length === 0}
                    title={!hasPro ? 'IA disponível a partir do plano Pro' : 'Gera rascunho baseado na evolução anterior'}
                    className="btn-secondary flex items-center justify-center gap-2 text-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    {!hasPro ? 'IA no Pro' : generateProntuarioDraft.isPending ? 'Gerando...' : 'Da última evolução'}
                  </button>
                  <select
                    value={aiMode}
                    onChange={e => setAiMode(e.target.value as AiProntuarioMode)}
                    className="input-field h-10 min-w-[150px] text-sm"
                  >
                    <option value="organizar">Organizar</option>
                    <option value="evolucao">Evolucao</option>
                    <option value="resumo">Resumo</option>
                  </select>
                  <button
                    type="button"
                    onClick={generateAiDraft}
                    disabled={generateProntuarioDraft.isPending || !hasPro}
                    title={!hasPro ? 'IA disponivel a partir do plano Pro' : undefined}
                    className="btn-secondary flex items-center justify-center gap-2 text-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    {!hasPro ? 'IA no Pro' : generateProntuarioDraft.isPending ? 'Gerando...' : 'Gerar rascunho'}
                  </button>
                </div>
              </div>
              {aiDraft && (
                <div className="mt-3 rounded-xl border border-white/70 bg-white p-3 dark:border-white/10 dark:bg-neutral-900">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Preview da IA</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-100">{aiDraft}</p>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setAiDraft('')} className="btn-secondary text-sm">
                      Descartar
                    </button>
                    <button type="button" onClick={() => setAcceptedAiDraftId(generatedAiDraftId)} className="btn-primary text-sm">
                      {acceptedAiDraftId === generatedAiDraftId ? 'Rascunho vinculado' : 'Vincular sem substituir evolução'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <RecordingPanel
              patientId={id!}
              onApplyTranscription={text => setEvolText(prev => [prev, text].filter(Boolean).join('\n\n'))}
              onAiDraftGenerated={setAcceptedAiDraftId}
              transcriptionActionLabel="Inserir transcrição na evolução"
            />
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  if (!id || !evolText.trim()) return
                  try {
                    await createSession.mutateAsync({
                      patientId: id,
                      date: evolDate,
                      summary: evolText.trim(),
                      duration: patient?.sessionDuration ?? 50,
                      paymentStatus: 'waived',
                      aiDraftId: acceptedAiDraftId || undefined,
                    } as any)
                    setEvolText('')
                    setAiDraft('')
                    setGeneratedAiDraftId('')
                    setAcceptedAiDraftId('')
                    toast.success('Evolucao registrada')
                  } catch { toast.error('Erro ao salvar evolução.') }
                }}
                disabled={createSession.isPending}
                className="btn-primary text-sm flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />Salvar evolução
              </button>
            </div>
          </div>

          {/* Histórico real de sessões */}
          {sessions.length > 0 && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                value={evolSearch}
                onChange={e => setEvolSearch(e.target.value)}
                placeholder="Buscar no histórico de evoluções..."
                className="input-field h-9 pl-9 text-sm"
              />
            </div>
          )}
          {evolSearch.trim() && filteredSessions.length === 0 && (
            <div className="card text-center py-6 text-neutral-400 text-sm">Nenhuma evolução encontrada para "{evolSearch}".</div>
          )}
          {filteredSessions.map((s, i) => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-sage-700 bg-sage-50 px-2 py-0.5 rounded-lg">
                  {t.sessionCapitalized} {sessions.length - i}
                </span>
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-xs text-neutral-400">{formatDate(s.date)}</span>
                  <button
                    type="button"
                    onClick={() => setHistoryOpenId(historyOpenId === s.id ? null : s.id)}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    title="Ver histórico de edições">
                    <History className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => addendumTargetId === s.id ? setAddendumTargetId(null) : startAddendum(s.id)}
                    className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    title="Adicionar complemento">
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                  </button>
                  {editingSessionId === s.id ? (
                    <button
                      type="button"
                      onClick={cancelEditingSession}
                      className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      title="Cancelar edicao">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditingSession(s.id, s.date, s.summary)}
                      className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      title="Editar evolucao">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {historyOpenId === s.id && (
                <div className="mb-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <p className="mb-2 text-xs font-semibold text-neutral-500">Histórico de edições</p>
                  {historyLoading ? (
                    <p className="text-xs text-neutral-400">Carregando...</p>
                  ) : historyEntries.length === 0 ? (
                    <p className="text-xs text-neutral-400">Esta evolução nunca foi editada.</p>
                  ) : (
                    <div className="space-y-2">
                      {historyEntries.map(h => (
                        <div key={h.id} className="rounded-lg bg-white p-2 text-xs dark:bg-neutral-900">
                          <p className="mb-1 font-medium text-neutral-500">Versão anterior a {formatDate(h.editedAt)}</p>
                          {h.summary && <p className="text-neutral-600 dark:text-neutral-300">{h.summary}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editingSessionId === s.id ? (
                editLocked ? (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                    {t.sessionsCapitalized} com mais de 7 dias não podem mais ter a evolução original editada — use "Adicionar complemento" (ícone <MessageSquarePlus className="inline h-3.5 w-3.5" /> acima) para registrar uma correção sem apagar o texto original.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="label">Data da evolucao</label>
                      <input
                        type="date"
                        value={editEvolDate}
                        onChange={e => setEditEvolDate(e.target.value)}
                        className="input-field text-sm" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label className="label mb-0">Descricao da sessao</label>
                        <div className="flex items-center gap-2">
                          <SnippetPicker onInsert={text => setEditEvolText(prev => [prev, text].filter(Boolean).join('\n\n'))} />
                          <DictationButton value={editEvolText} onChange={setEditEvolText} />
                        </div>
                      </div>
                      <textarea
                        rows={5}
                        value={editEvolText}
                        onChange={e => setEditEvolText(e.target.value)}
                        className="input-field resize-none text-sm"
                        placeholder="Atualize a evolucao clinica desta sessao..." />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditingSession}
                        className="btn-secondary text-sm">
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveEditedSession}
                        disabled={updateSession.isPending || !editEvolDate || !editEvolText.trim()}
                        className="btn-primary text-sm flex items-center gap-2">
                        <Save className="h-3.5 w-3.5" />{updateSession.isPending ? 'Salvando...' : 'Salvar alteracao'}
                      </button>
                    </div>
                  </div>
                )
              ) : s.summary
                ? <p className="text-sm text-neutral-600 leading-relaxed">{s.summary}</p>
                : <p className="text-sm text-neutral-400 italic">Sem anotações registradas.</p>
              }

              {addendumTargetId === s.id && (
                <div className="mt-3 space-y-2 rounded-xl border border-sage-100 bg-sage-50/60 p-3 dark:border-sage-400/20 dark:bg-sage-500/10">
                  <label className="label mb-0">Complemento (não altera o texto original)</label>
                  <textarea
                    rows={3}
                    value={addendumText}
                    onChange={e => setAddendumText(e.target.value)}
                    className="input-field resize-none text-sm"
                    placeholder={`Ex.: complemento registrado após retorno do ${t.patient} sobre este atendimento...`} />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setAddendumTargetId(null)} className="btn-secondary text-sm">Cancelar</button>
                    <button
                      type="button"
                      onClick={saveAddendum}
                      disabled={addAddendum.isPending || !addendumText.trim()}
                      className="btn-primary text-sm flex items-center gap-2">
                      <MessageSquarePlus className="h-3.5 w-3.5" />{addAddendum.isPending ? 'Salvando...' : 'Salvar complemento'}
                    </button>
                  </div>
                </div>
              )}

              {(s.addendaList?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-2">
                  {s.addendaList!.map((a, ai) => (
                    <div key={ai} className="rounded-xl border border-sage-100 bg-sage-50/50 px-3 py-2 dark:border-sage-400/20 dark:bg-sage-500/10">
                      <p className="mb-1 text-xs font-semibold text-sage-700 dark:text-sage-200">
                        Complemento — {formatDate(a.createdAt)}
                      </p>
                      <p className="text-sm leading-relaxed text-sage-800 dark:text-sage-100">{a.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {s.privateNotes && (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <Lock className="h-3.5 w-3.5" />
                    Anotações privadas
                  </p>
                  <p className="text-sm leading-relaxed text-amber-800">{s.privateNotes}</p>
                </div>
              )}
              {s.nextSteps && (
                <div className="mt-3 rounded-xl border border-sage-100 bg-sage-50 px-3 py-2">
                  <p className="mb-1 text-xs font-semibold text-sage-700">Próximos passos</p>
                  <p className="text-sm leading-relaxed text-sage-800">{s.nextSteps}</p>
                </div>
              )}
              {((s.tags?.length ?? 0) > 0 || s.mood) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {s.mood && (
                    <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-medium text-neutral-600" title={`Humor registrado: ${s.mood}/5`}>
                      Humor: {MOOD_LABELS[s.mood]}
                    </span>
                  )}
                  {s.tags?.map(tag => (
                    <span key={tag} className="rounded-full bg-neutral-100 px-2.5 py-1 font-medium text-neutral-600">
                      {TAG_LABELS[tag]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="card text-center py-8 text-neutral-400 text-sm">
              Nenhuma {t.session} registrada ainda.
            </div>
          )}
        </div>
      )}

      {/* Save button mobile */}
      <div className="sm:hidden flex gap-2">
        <button onClick={() => exportProntuario.mutate({ audience: 'professional' })} disabled={exportProntuario.isPending} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50">
          <Download className="w-4 h-4" />{exportProntuario.isPending ? 'Gerando…' : 'Backup'}
        </button>
        <button onClick={() => setDeliveryOpen(true)} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
          <Send className="w-4 h-4" />Entregar
        </button>
        <button onClick={save} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
          <Save className="w-4 h-4" />Salvar
        </button>
      </div>

      <PatientRecordDeliveryModal
        open={deliveryOpen}
        onClose={() => setDeliveryOpen(false)}
        patientId={id ?? ''}
        patientName={patient.name}
      />
    </div>
  )
}
