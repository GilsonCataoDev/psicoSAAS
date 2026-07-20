import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, BrainCircuit, Check, Download, FileUp, ListRestart, Plus, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  useCreateNeuropsychBatteryItem, useDeleteNeuropsychBatteryItem,
  useNeuropsychAssessment, useUpdateNeuropsychAssessment, useUpdateNeuropsychBatteryItem,
  usePatientAttachments, useUploadPatientAttachment,
} from '@/hooks/useApi'
import { NeuropsychBatteryItem, NeuropsychDomain } from '@/types'
import { downloadPatientAttachment, PatientAttachment } from '@/hooks/api/attachments'
import { buildNeuropsychIntegrationDraft } from '@/lib/neuropsychDraft'
import NeuropsychCopilotPanel from '@/components/features/neuropsych/NeuropsychCopilotPanel'

const DOMAINS: Array<[NeuropsychDomain, string]> = [
  ['intelligence', 'Inteligência'], ['attention', 'Atenção'], ['memory', 'Memória'],
  ['executive_functions', 'Funções executivas'], ['language', 'Linguagem'],
  ['visuospatial_skills', 'Habilidades visuoespaciais'], ['behavioral_scales', 'Escalas comportamentais'],
  ['personality', 'Personalidade'],
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
  const [form, setForm] = useState({ referralQuestion: '', clinicalHistory: '', clinicalHypotheses: '', qualitativeObservations: '', integrationDraft: '', professionalConclusion: '', evaluatedDomains: [] as NeuropsychDomain[] })
  const [newItem, setNewItem] = useState<{
    name: string
    procedureType: NeuropsychBatteryItem['procedureType']
    domains: NeuropsychDomain[]
    purpose: string
  }>({ name: '', procedureType: 'neuropsychological_procedure', domains: [], purpose: '' })

  useEffect(() => {
    if (!assessment) return
    setForm({
      referralQuestion: assessment.referralQuestion ?? '', clinicalHistory: assessment.clinicalHistory ?? '',
      clinicalHypotheses: assessment.clinicalHypotheses ?? '', qualitativeObservations: assessment.qualitativeObservations ?? '',
      integrationDraft: assessment.integrationDraft ?? '', professionalConclusion: assessment.professionalConclusion ?? '',
      evaluatedDomains: assessment.evaluatedDomains ?? [],
    })
  }, [assessment])

  if (isLoading || !assessment) return <div className="h-48 animate-pulse rounded-2xl bg-neutral-100 dark:bg-white/5" />

  async function save() {
    try { await update.mutateAsync({ ...form, version: assessment!.version }); toast.success('Avaliação salva') }
    catch (error: any) { toast.error(error?.response?.data?.message ?? 'Não foi possível salvar') }
  }

  async function addItem(event: FormEvent) {
    event.preventDefault()
    if (!newItem.name.trim()) return toast.error('Informe o nome do procedimento')
    try {
      await createItem.mutateAsync({ ...newItem, status: 'planned' })
      setNewItem({ name: '', procedureType: 'neuropsychological_procedure', domains: [], purpose: '' })
      toast.success('Procedimento adicionado')
    } catch (error: any) { toast.error(error?.response?.data?.message ?? 'Não foi possível adicionar') }
  }

  async function upload(file?: File) {
    if (!file) return
    try { await uploadAttachment.mutateAsync({ file, kind: attachmentKind }); toast.success('Arquivo protegido anexado') }
    catch (error: any) { toast.error(error?.response?.data?.message ?? 'Não foi possível anexar o arquivo') }
  }

  function toggleDomain(domain: NeuropsychDomain, target: 'assessment' | 'item') {
    if (target === 'assessment') setForm(current => ({ ...current, evaluatedDomains: current.evaluatedDomains.includes(domain) ? current.evaluatedDomains.filter(value => value !== domain) : [...current.evaluatedDomains, domain] }))
    else setNewItem(current => ({ ...current, domains: current.domains.includes(domain) ? current.domains.filter(value => value !== domain) : [...current.domains, domain] }))
  }

  function organizeDraft() {
    if (form.integrationDraft.trim() && !window.confirm('Substituir o rascunho atual por uma nova organização das informações?')) return
    setForm(current => ({
      ...current,
      integrationDraft: buildNeuropsychIntegrationDraft({ ...assessment!, ...current }),
    }))
    toast.success('Rascunho organizado sem uso de IA')
  }

  return (
    <div className="animate-slide-up space-y-5 pb-16">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><Link to="/avaliacoes" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-sage-700"><ArrowLeft className="h-3.5 w-3.5" /> Avaliações</Link>
          <h1 className="page-title flex items-center gap-2"><BrainCircuit className="h-6 w-6 text-sage-600" />{assessment.patient?.name}</h1>
          <p className="page-subtitle">Avaliação neuropsicológica · rascunho clínico protegido</p></div>
        <div className="flex gap-2"><select value={assessment.status} onChange={event => update.mutate({ status: event.target.value as any, version: assessment.version })} className="input-field w-44">
          <option value="planning">Planejamento</option><option value="in_progress">Em aplicação</option><option value="integration">Integração</option><option value="completed">Concluída</option><option value="archived">Arquivada</option>
        </select><button onClick={save} disabled={update.isPending} className="btn-primary flex items-center gap-2"><Check className="h-4 w-4" />Salvar</button></div>
      </header>

      <section className="card space-y-5 p-5"><div><h2 className="font-semibold text-neutral-900 dark:text-white">1. Planejamento clínico</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Registre a pergunta de encaminhamento, história e hipóteses provisórias.</p></div>
        <Field label="Motivo e pergunta de encaminhamento" value={form.referralQuestion} onChange={value => setForm(current => ({ ...current, referralQuestion: value }))} />
        <div className="grid gap-4 lg:grid-cols-2"><Field label="História clínica" value={form.clinicalHistory} onChange={value => setForm(current => ({ ...current, clinicalHistory: value }))} tall /><Field label="Hipóteses clínicas provisórias" value={form.clinicalHypotheses} onChange={value => setForm(current => ({ ...current, clinicalHypotheses: value }))} tall /></div>
        <DomainPicker selected={form.evaluatedDomains} onToggle={domain => toggleDomain(domain, 'assessment')} />
      </section>

      <section className="card space-y-5 p-5"><div><h2 className="font-semibold text-neutral-900 dark:text-white">2. Bateria de avaliação</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Cadastre somente o nome e seus registros profissionais. Não copie conteúdo protegido.</p></div>
        <form onSubmit={addItem} className="rounded-2xl border border-sage-100 bg-sage-50/50 p-4 dark:border-sage-800/50 dark:bg-sage-950/10">
          <div className="grid gap-3 md:grid-cols-2"><div><label className="label">Teste ou procedimento</label><input value={newItem.name} onChange={event => setNewItem(current => ({ ...current, name: event.target.value }))} className="input-field" placeholder="Nome do procedimento" /></div>
            <div><label className="label">Tipo</label><select value={newItem.procedureType} onChange={event => setNewItem(current => ({ ...current, procedureType: event.target.value as NeuropsychBatteryItem['procedureType'] }))} className="input-field"><option value="neuropsychological_procedure">Procedimento neuropsicológico</option><option value="psychological_test">Teste psicológico</option><option value="behavioral_scale">Escala comportamental</option><option value="clinical_interview">Entrevista clínica</option><option value="observation">Observação</option><option value="other">Outro</option></select></div></div>
          <div className="mt-3"><DomainPicker selected={newItem.domains} onToggle={domain => toggleDomain(domain, 'item')} compact /></div>
          <div className="mt-3"><label className="label">Finalidade</label><input value={newItem.purpose} onChange={event => setNewItem(current => ({ ...current, purpose: event.target.value }))} className="input-field" placeholder="O que este procedimento pretende investigar?" /></div>
          <div className="mt-3 flex justify-end"><button className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" />Adicionar à bateria</button></div>
        </form>
        <div className="space-y-3">{assessment.batteryItems.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-200 p-6 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">Nenhum procedimento planejado.</p> : assessment.batteryItems.map(item => (
          <article key={item.id} className="rounded-2xl border border-neutral-100 p-4 dark:border-white/10"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{item.name}</h3><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{item.purpose || 'Sem finalidade registrada'}</p></div><div className="flex gap-2"><select value={item.status} onChange={event => updateItem.mutate({ itemId: item.id, data: { status: event.target.value as any } })} className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-white/10 dark:bg-cognia-panel dark:text-neutral-200"><option value="planned">Planejado</option><option value="applied">Aplicado</option><option value="integrated">Integrado</option><option value="not_applied">Não aplicado</option></select><button onClick={() => confirm('Remover este procedimento?') && deleteItem.mutate(item.id)} className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remover"><Trash2 className="h-4 w-4" /></button></div></div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2"><Field label="Resultado escrito" value={item.resultSummary ?? ''} onBlur={value => updateItem.mutate({ itemId: item.id, data: { resultSummary: value } })} /><Field label="Observações qualitativas" value={item.qualitativeNotes ?? ''} onBlur={value => updateItem.mutate({ itemId: item.id, data: { qualitativeNotes: value } })} /></div>
          </article>))}</div>
      </section>

      <section className="card space-y-4 p-5"><div><h2 className="font-semibold text-neutral-900 dark:text-white">3. Integração e conclusão</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">A interpretação e a conclusão são sempre responsabilidade do profissional.</p></div>
        <Field label="Observações qualitativas gerais" value={form.qualitativeObservations} onChange={value => setForm(current => ({ ...current, qualitativeObservations: value }))} tall />
        <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="label mb-0">Integração dos resultados</span><button type="button" onClick={organizeDraft} className="btn-secondary flex items-center gap-2 text-xs"><ListRestart className="h-3.5 w-3.5" />Organizar rascunho sem IA</button></div><Field label="" value={form.integrationDraft} onChange={value => setForm(current => ({ ...current, integrationDraft: value }))} tall /></div>
        <Field label="Conclusão profissional" value={form.professionalConclusion} onChange={value => setForm(current => ({ ...current, professionalConclusion: value }))} tall />
        <div className="rounded-xl bg-violet-50 p-3 text-xs text-violet-800 dark:bg-violet-950/30 dark:text-violet-200">O organizador acima funciona localmente, sem API externa e sem custo por uso. Ele apenas distribui os registros em uma estrutura de trabalho; não interpreta testes nem produz diagnóstico.</div>
      </section>

      <NeuropsychCopilotPanel
        assessment={assessment}
        onAddToDraft={text => setForm(current => ({
          ...current,
          integrationDraft: current.integrationDraft.trim() ? `${current.integrationDraft.trim()}\n\n${text}` : text,
        }))}
      />

      <section className="card space-y-4 p-5"><div><h2 className="font-semibold text-neutral-900 dark:text-white">4. Resultados e relatório final</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">PDF, JPG ou PNG, com até 10 MB. O conteúdo é criptografado antes de ser salvo.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><select value={attachmentKind} onChange={event => setAttachmentKind(event.target.value as PatientAttachment['kind'])} className="input-field sm:w-52"><option value="test_result">Resultado de teste</option><option value="supporting_document">Documento de apoio</option><option value="final_report">Relatório final</option><option value="other">Outro</option></select>
          <label className="btn-secondary flex cursor-pointer items-center justify-center gap-2"><FileUp className="h-4 w-4" />{uploadAttachment.isPending ? 'Enviando...' : 'Selecionar arquivo'}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" disabled={uploadAttachment.isPending} onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} /></label></div>
        {attachments.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-200 p-5 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-neutral-400">Nenhum arquivo vinculado a esta avaliação.</p> : <div className="space-y-2">{attachments.map(attachment => <button key={attachment.id} onClick={() => downloadPatientAttachment(assessment.patientId, attachment)} className="flex w-full items-center justify-between rounded-xl border border-neutral-100 p-3 text-left hover:border-sage-200 dark:border-white/10"><div><p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{attachment.filename}</p><p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{attachment.kind === 'final_report' ? 'Relatório final' : attachment.kind === 'test_result' ? 'Resultado' : 'Documento de apoio'} · {(attachment.size / 1024).toFixed(0)} KB</p></div><Download className="h-4 w-4 text-neutral-400" /></button>)}</div>}
      </section>
    </div>
  )
}

function Field({ label, value, onChange, onBlur, tall }: { label: string; value: string; onChange?: (value: string) => void; onBlur?: (value: string) => void; tall?: boolean }) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  return <div><label className="label">{label}</label><textarea value={local} onChange={event => { setLocal(event.target.value); onChange?.(event.target.value) }} onBlur={() => onBlur?.(local)} className={`input-field resize-y ${tall ? 'min-h-36' : 'min-h-24'}`} /></div>
}

function DomainPicker({ selected, onToggle, compact }: { selected: NeuropsychDomain[]; onToggle: (domain: NeuropsychDomain) => void; compact?: boolean }) {
  return <div><p className="label">Funções avaliadas</p><div className="flex flex-wrap gap-2">{DOMAINS.map(([domain, label]) => <button key={domain} type="button" aria-pressed={selected.includes(domain)} onClick={() => onToggle(domain)} className={`${compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-full border font-medium transition ${selected.includes(domain) ? 'border-sage-400 bg-sage-100 text-sage-800 dark:bg-sage-900/50 dark:text-sage-100' : 'border-neutral-200 text-neutral-500 hover:border-sage-300 dark:border-white/10 dark:text-neutral-300'}`}>{label}</button>)}</div></div>
}
