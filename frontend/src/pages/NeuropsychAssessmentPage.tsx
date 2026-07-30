import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, BrainCircuit, Check, ChevronLeft, ChevronRight, Download, FileUp, ListRestart, Plus, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  useCreateNeuropsychBatteryItem, useDeleteNeuropsychBatteryItem,
  useNeuropsychAssessment, useUpdateNeuropsychAssessment, useUpdateNeuropsychBatteryItem,
  usePatientAttachments, useUploadPatientAttachment,
} from '@/hooks/useApi'
import { NeuropsychAssessment, NeuropsychBatteryItem, NeuropsychDomain } from '@/types'
import { downloadPatientAttachment, PatientAttachment } from '@/hooks/api/attachments'
import { buildNeuropsychIntegrationDraft } from '@/lib/neuropsychDraft'
import NeuropsychCopilotPanel from '@/components/features/neuropsych/NeuropsychCopilotPanel'
import TestNameCombobox from '@/components/features/neuropsych/TestNameCombobox'

const DOMAINS: Array<[NeuropsychDomain, string]> = [
  ['intelligence', 'Inteligência'], ['attention', 'Atenção'], ['memory', 'Memória'],
  ['executive_functions', 'Funções executivas'], ['language', 'Linguagem'],
  ['visuospatial_skills', 'Habilidades visuoespaciais'], ['behavioral_scales', 'Escalas comportamentais'],
  ['personality', 'Personalidade'],
]

type AssessmentStep = 'planning' | 'battery' | 'integration' | 'files'

const STEPS: Array<{ id: AssessmentStep; label: string; shortLabel: string }> = [
  { id: 'planning', label: 'Planejamento', shortLabel: 'Planejar' },
  { id: 'battery', label: 'Bateria', shortLabel: 'Bateria' },
  { id: 'integration', label: 'Integração e IA', shortLabel: 'Integrar' },
  { id: 'files', label: 'Arquivos', shortLabel: 'Arquivos' },
]

export default function NeuropsychAssessmentPage() {
  const { id = '' } = useParams()
  const { data: assessment, isLoading } = useNeuropsychAssessment(id)
  const update = useUpdateNeuropsychAssessment(id)
  const createItem = useCreateNeuropsychBatteryItem(id)
  const updateItem = useUpdateNeuropsychBatteryItem(id)
  const deleteItem = useDeleteNeuropsychBatteryItem(id)
  const { data: attachments = [] } = usePatientAttachments(assessment?.patientId, id)
  const uploadAttachment = useUploadPatientAttachment(assessment?.patientId, id)
  const [attachmentKind, setAttachmentKind] = useState<PatientAttachment['kind']>('test_result')
  const [activeStep, setActiveStep] = useState<AssessmentStep>('planning')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [statusSaveState, setStatusSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const hydratedAssessmentId = useRef<string | null>(null)
  const [form, setForm] = useState({ referralQuestion: '', clinicalHistory: '', clinicalHypotheses: '', qualitativeObservations: '', integrationDraft: '', professionalConclusion: '', evaluatedDomains: [] as NeuropsychDomain[] })
  const [newItem, setNewItem] = useState<{
    name: string
    procedureType: NeuropsychBatteryItem['procedureType']
    domains: NeuropsychDomain[]
    purpose: string
  }>({ name: '', procedureType: 'neuropsychological_procedure', domains: [], purpose: '' })

  useEffect(() => {
    if (!assessment || hydratedAssessmentId.current === assessment.id) return
    hydratedAssessmentId.current = assessment.id
    setForm({
      referralQuestion: assessment.referralQuestion ?? '', clinicalHistory: assessment.clinicalHistory ?? '',
      clinicalHypotheses: assessment.clinicalHypotheses ?? '', qualitativeObservations: assessment.qualitativeObservations ?? '',
      integrationDraft: assessment.integrationDraft ?? '', professionalConclusion: assessment.professionalConclusion ?? '',
      evaluatedDomains: assessment.evaluatedDomains ?? [],
    })
    setHasUnsavedChanges(false)
  }, [assessment])

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [hasUnsavedChanges])

  if (isLoading || !assessment) return <div className="h-48 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />

  async function save() {
    try {
      await update.mutateAsync({ ...form, version: assessment!.version })
      setHasUnsavedChanges(false)
      setLastSavedAt(new Date())
      toast.success('Avaliação salva')
    }
    catch (error: any) { toast.error(error?.response?.data?.message ?? 'Não foi possível salvar') }
  }

  async function addItem(event: FormEvent) {
    event.preventDefault()
    if (!newItem.name.trim()) return toast.error('Informe o nome do procedimento')
    try {
      await createItem.mutateAsync(newItem)
      setNewItem({ name: '', procedureType: 'neuropsychological_procedure', domains: [], purpose: '' })
      toast.success('Procedimento adicionado')
    } catch (error: any) { toast.error(error?.response?.data?.message ?? 'Não foi possível adicionar') }
  }

  async function changeAssessmentStatus(status: NeuropsychAssessment['status']) {
    setStatusSaveState('saving')
    try {
      await update.mutateAsync({ status, version: assessment!.version })
      setLastSavedAt(new Date())
      setStatusSaveState('saved')
    } catch (error: any) {
      setStatusSaveState('error')
      toast.error(error?.response?.data?.message ?? 'Não foi possível alterar o status')
    }
  }

  async function upload(file?: File) {
    if (!file) return
    try { await uploadAttachment.mutateAsync({ file, kind: attachmentKind }); toast.success('Arquivo protegido anexado') }
    catch (error: any) { toast.error(error?.response?.data?.message ?? 'Não foi possível anexar o arquivo') }
  }

  function toggleDomain(domain: NeuropsychDomain, target: 'assessment' | 'item') {
    if (target === 'assessment') changeForm(current => ({ ...current, evaluatedDomains: current.evaluatedDomains.includes(domain) ? current.evaluatedDomains.filter(value => value !== domain) : [...current.evaluatedDomains, domain] }))
    else setNewItem(current => ({ ...current, domains: current.domains.includes(domain) ? current.domains.filter(value => value !== domain) : [...current.domains, domain] }))
  }

  function changeForm(change: Parameters<typeof setForm>[0]) {
    setForm(change)
    setHasUnsavedChanges(true)
  }

  function organizeDraft() {
    if (form.integrationDraft.trim() && !window.confirm('Substituir o rascunho atual por uma nova organização das informações?')) return
    changeForm(current => ({
      ...current,
      integrationDraft: buildNeuropsychIntegrationDraft({ ...assessment!, ...current }),
    }))
    toast.success('Rascunho organizado sem uso de IA')
  }

  const activeStepIndex = STEPS.findIndex(step => step.id === activeStep)
  const completedSteps: Record<AssessmentStep, boolean> = {
    planning: Boolean(form.referralQuestion.trim() || form.clinicalHistory.trim() || form.clinicalHypotheses.trim()),
    battery: assessment.batteryItems.length > 0,
    integration: Boolean(form.integrationDraft.trim() || form.professionalConclusion.trim()),
    files: attachments.length > 0,
  }

  return (
    <div className="animate-slide-up space-y-5 pb-16">
      <header className="-mx-1 flex flex-col justify-between gap-4 rounded-2xl border border-neutral-100 bg-white/95 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-cognia-panel/95 sm:flex-row sm:items-center lg:sticky lg:top-0 lg:z-20">
        <div><Link to="/avaliacoes" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-sage-700"><ArrowLeft className="h-3.5 w-3.5" /> Avaliações</Link>
          <h1 className="page-title flex items-center gap-2"><BrainCircuit className="h-6 w-6 text-sage-600" />{assessment.patient?.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><span className="text-neutral-500 dark:text-neutral-400">Etapa {activeStepIndex + 1} de {STEPS.length} · rascunho clínico protegido</span><span className={`rounded-full px-2 py-0.5 font-medium ${hasUnsavedChanges ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200' : 'bg-sage-50 text-sage-700 dark:bg-sage-950/40 dark:text-sage-200'}`}>{hasUnsavedChanges ? 'Alterações não salvas' : lastSavedAt ? `Salvo às ${lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Tudo salvo'}</span></div></div>
        <div className="flex flex-col gap-2 min-[430px]:flex-row min-[430px]:items-start">
          <div>
            <select
              aria-label="Status da avaliação"
              value={assessment.status}
              disabled={update.isPending}
              onChange={event => void changeAssessmentStatus(event.target.value as NeuropsychAssessment['status'])}
              className="input-field min-[430px]:w-44"
            >
              <option value="planning">Planejamento</option><option value="in_progress">Em aplicação</option><option value="integration">Integração</option><option value="completed">Concluída</option><option value="archived">Arquivada</option>
            </select>
            <span role="status" aria-label="Salvamento automático do status" aria-live="polite" className={`mt-1 block min-h-4 text-[11px] ${
              statusSaveState === 'error' ? 'text-rose-600 dark:text-rose-300' : 'text-neutral-500 dark:text-neutral-400'
            }`}>
              {statusSaveState === 'saving' && 'Salvando status...'}
              {statusSaveState === 'saved' && 'Status salvo automaticamente'}
              {statusSaveState === 'error' && 'Status não salvo; tente novamente'}
            </span>
          </div>
          <button onClick={save} disabled={update.isPending || !hasUnsavedChanges} className="btn-primary flex items-center justify-center gap-2"><Check className="h-4 w-4" />{update.isPending && statusSaveState !== 'saving' ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </header>

      <nav aria-label="Etapas da avaliação" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {STEPS.map((step, index) => {
          const isActive = step.id === activeStep
          const isComplete = completedSteps[step.id]
          return <button key={step.id} type="button" aria-current={isActive ? 'step' : undefined} onClick={() => setActiveStep(step.id)} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition ${isActive ? 'border-sage-400 bg-sage-50 text-sage-900 shadow-sm dark:border-sage-600 dark:bg-sage-950/40 dark:text-sage-100' : 'border-neutral-200 bg-white text-neutral-600 hover:border-sage-300 dark:border-white/10 dark:bg-cognia-panel dark:text-neutral-300'}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isActive ? 'bg-sage-600 text-white' : isComplete ? 'bg-sage-100 text-sage-700 dark:bg-sage-900 dark:text-sage-200' : 'bg-neutral-100 text-neutral-500 dark:bg-white/10 dark:text-neutral-300'}`}>{isComplete && !isActive ? <Check className="h-3.5 w-3.5" /> : index + 1}</span>
            <span className="min-w-0"><span className="hidden truncate text-sm font-semibold sm:block">{step.label}</span><span className="truncate text-sm font-semibold sm:hidden">{step.shortLabel}</span></span>
          </button>
        })}
      </nav>

      {activeStep === 'planning' && <section className="card space-y-5 p-5"><div><h2 className="font-semibold text-neutral-900 dark:text-white">1. Planejamento clínico</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Registre a pergunta de encaminhamento, história e hipóteses provisórias.</p></div>
        <Field label="Motivo e pergunta de encaminhamento" value={form.referralQuestion} onChange={value => changeForm(current => ({ ...current, referralQuestion: value }))} />
        <div className="grid gap-4 lg:grid-cols-2"><Field label="História clínica" value={form.clinicalHistory} onChange={value => changeForm(current => ({ ...current, clinicalHistory: value }))} tall /><Field label="Hipóteses clínicas provisórias" value={form.clinicalHypotheses} onChange={value => changeForm(current => ({ ...current, clinicalHypotheses: value }))} tall /></div>
        <DomainPicker selected={form.evaluatedDomains} onToggle={domain => toggleDomain(domain, 'assessment')} />
      </section>}

      {activeStep === 'battery' && <section className="card space-y-5 p-5"><div><h2 className="font-semibold text-neutral-900 dark:text-white">2. Bateria de avaliação</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Cadastre somente o nome e seus registros profissionais. Não copie conteúdo protegido.</p></div>
        <form onSubmit={addItem} className="rounded-2xl border border-sage-100 bg-sage-50/50 p-4 dark:border-sage-800/50 dark:bg-sage-950/10">
          <div className="grid gap-3 md:grid-cols-2"><div><label htmlFor="battery-item-name" className="label">Teste ou procedimento</label><TestNameCombobox id="battery-item-name" value={newItem.name} onChange={value => setNewItem(current => ({ ...current, name: value }))} placeholder="Nome do procedimento" /><p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">Sugestões de nomes conhecidos aparecem ao digitar — você também pode escrever um nome próprio.</p></div>
            <div><label htmlFor="battery-item-type" className="label">Tipo</label><select id="battery-item-type" value={newItem.procedureType} onChange={event => setNewItem(current => ({ ...current, procedureType: event.target.value as NeuropsychBatteryItem['procedureType'] }))} className="input-field"><option value="neuropsychological_procedure">Procedimento neuropsicológico</option><option value="psychological_test">Teste psicológico</option><option value="behavioral_scale">Escala comportamental</option><option value="clinical_interview">Entrevista clínica</option><option value="observation">Observação</option><option value="other">Outro</option></select></div></div>
          <div className="mt-3"><DomainPicker selected={newItem.domains} onToggle={domain => toggleDomain(domain, 'item')} compact /></div>
          <div className="mt-3"><label htmlFor="battery-item-purpose" className="label">Finalidade</label><input id="battery-item-purpose" value={newItem.purpose} onChange={event => setNewItem(current => ({ ...current, purpose: event.target.value }))} className="input-field" placeholder="O que este procedimento pretende investigar?" /></div>
          <div className="mt-3 flex justify-end"><button className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" />Adicionar à bateria</button></div>
        </form>
        <div className="space-y-3">{assessment.batteryItems.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">Nenhum procedimento planejado.</p> : assessment.batteryItems.map(item => (
          <article key={item.id} className="rounded-2xl border border-neutral-100 p-4 dark:border-white/10"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{item.name}</h3><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{item.purpose || 'Sem finalidade registrada'}</p></div><div className="flex gap-2"><select value={item.status} onChange={event => updateItem.mutate({ itemId: item.id, data: { status: event.target.value as any } })} className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-cognia-panel dark:text-neutral-200"><option value="planned">Planejado</option><option value="applied">Aplicado</option><option value="integrated">Integrado</option><option value="not_applied">Não aplicado</option></select><button onClick={() => confirm('Remover este procedimento?') && deleteItem.mutate(item.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remover"><Trash2 className="h-4 w-4" /></button></div></div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2"><Field label="Resultado escrito" value={item.resultSummary ?? ''} onBlur={value => updateItem.mutate({ itemId: item.id, data: { resultSummary: value } })} /><Field label="Observações qualitativas" value={item.qualitativeNotes ?? ''} onBlur={value => updateItem.mutate({ itemId: item.id, data: { qualitativeNotes: value } })} /></div>
          </article>))}</div>
      </section>}

      {activeStep === 'integration' && <div className="space-y-5"><section className="card space-y-4 p-5"><div><h2 className="font-semibold text-neutral-900 dark:text-white">3. Integração e conclusão</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">A interpretação e a conclusão são sempre responsabilidade do profissional.</p></div>
        <Field label="Observações qualitativas gerais" value={form.qualitativeObservations} onChange={value => changeForm(current => ({ ...current, qualitativeObservations: value }))} tall />
        <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="label mb-0">Integração dos resultados</span><button type="button" onClick={organizeDraft} className="btn-secondary flex items-center gap-2 text-xs"><ListRestart className="h-3.5 w-3.5" />Organizar rascunho sem IA</button></div><Field label="Integração dos resultados" hideLabel value={form.integrationDraft} onChange={value => changeForm(current => ({ ...current, integrationDraft: value }))} tall /></div>
        <Field label="Conclusão profissional" value={form.professionalConclusion} onChange={value => changeForm(current => ({ ...current, professionalConclusion: value }))} tall />
        <div className="rounded-xl bg-violet-50 p-3 text-xs text-violet-800 dark:bg-violet-950/30 dark:text-violet-200">O organizador acima funciona localmente, sem API externa e sem custo por uso. Ele apenas distribui os registros em uma estrutura de trabalho; não interpreta testes nem produz diagnóstico.</div>
      </section>

      <NeuropsychCopilotPanel
        assessment={assessment}
        onAddToDraft={text => changeForm(current => ({
          ...current,
          integrationDraft: current.integrationDraft.trim() ? `${current.integrationDraft.trim()}\n\n${text}` : text,
        }))}
      />
      </div>}

      {activeStep === 'files' && <section className="card space-y-4 p-5"><div><h2 className="font-semibold text-neutral-900 dark:text-white">4. Resultados e relatório final</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">PDF, JPG ou PNG, com até 10 MB. O conteúdo é criptografado antes de ser salvo.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><select aria-label="Tipo do arquivo" value={attachmentKind} onChange={event => setAttachmentKind(event.target.value as PatientAttachment['kind'])} className="input-field sm:w-52"><option value="test_result">Resultado de teste</option><option value="supporting_document">Documento de apoio</option><option value="final_report">Relatório final</option><option value="other">Outro</option></select>
          <label className="btn-secondary flex cursor-pointer items-center justify-center gap-2"><FileUp className="h-4 w-4" />{uploadAttachment.isPending ? 'Enviando...' : 'Selecionar arquivo'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" disabled={uploadAttachment.isPending} onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label></div>
        {attachments.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-200 p-5 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">Nenhum arquivo vinculado a esta avaliação.</p> : <div className="space-y-2">{attachments.map(attachment => <button key={attachment.id} onClick={() => downloadPatientAttachment(assessment.patientId, attachment)} className="flex w-full items-center justify-between rounded-xl border border-neutral-100 p-3 text-left hover:border-sage-200 dark:border-white/10"><div><p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{attachment.filename}</p><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{attachment.kind === 'final_report' ? 'Relatório final' : attachment.kind === 'test_result' ? 'Resultado' : 'Documento de apoio'} · {(attachment.size / 1024).toFixed(0)} KB</p></div><Download className="h-4 w-4 text-neutral-400" /></button>)}</div>}
      </section>}

      <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-4 dark:border-white/10">
        <button type="button" disabled={activeStepIndex === 0} onClick={() => setActiveStep(STEPS[activeStepIndex - 1].id)} className="btn-secondary flex items-center gap-2 disabled:invisible"><ChevronLeft className="h-4 w-4" />Voltar</button>
        <p className="hidden text-xs text-neutral-500 dark:text-neutral-400 sm:block">Use as etapas para navegar sem perder o que já foi preenchido.</p>
        <button type="button" disabled={activeStepIndex === STEPS.length - 1} onClick={() => setActiveStep(STEPS[activeStepIndex + 1].id)} className="btn-primary flex items-center gap-2 disabled:invisible">Próxima etapa<ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, onBlur, tall, hideLabel }: { label: string; value: string; onChange?: (value: string) => void; onBlur?: (value: string) => void; tall?: boolean; hideLabel?: boolean }) {
  const id = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 320)}px`
  }, [local])
  return <div><label htmlFor={id} className={hideLabel ? 'sr-only' : 'label'}>{label}</label><textarea ref={textareaRef} id={id} value={local} rows={tall ? 5 : 3} onChange={event => { setLocal(event.target.value); onChange?.(event.target.value) }} onBlur={() => onBlur?.(local)} className="input-field min-h-20 resize-none overflow-y-auto" /></div>
}

function DomainPicker({ selected, onToggle, compact }: { selected: NeuropsychDomain[]; onToggle: (domain: NeuropsychDomain) => void; compact?: boolean }) {
  return <div><p className="label">Funções avaliadas</p><div className="flex flex-wrap gap-2">{DOMAINS.map(([domain, label]) => <button key={domain} type="button" aria-pressed={selected.includes(domain)} onClick={() => onToggle(domain)} className={`${compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-full border font-medium transition ${selected.includes(domain) ? 'border-sage-400 bg-sage-100 text-sage-800 dark:bg-sage-900/50 dark:text-sage-100' : 'border-neutral-200 text-neutral-500 hover:border-sage-300 dark:border-white/10 dark:text-neutral-300'}`}>{label}</button>)}</div></div>
}
