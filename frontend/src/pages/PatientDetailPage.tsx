import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Phone, Mail, Calendar, Plus, Lock,
  ClipboardList, MessageCircle, CheckCircle2, Save,
  CalendarDays, Banknote, Clock, FileText, Pencil,
  BookOpenText, BrainCircuit, BarChart3, Copy, Paperclip, Download, Trash2, Eye, Sparkles, Loader2,
} from 'lucide-react'
import { SCALE_CONFIGS, getCriticalResponses, interpretScaleResult } from '@/lib/scale-scoring'
import Avatar from '@/components/ui/Avatar'
import { TagBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDate, formatCurrency, formatDateRelative, patientStartDate } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  usePatient, useSessions, useFinancial,
  useMarkFinancialPaid, useSendCharge, useUpdatePatient, useDeletePatient,
  useInstrumentAssignments, useUpdateInstrumentAnswers, useCreatePatientPortalLink, type InstrumentAssignment,
  usePatientAttachments, useUploadPatientAttachment, useDeletePatientAttachment,
  downloadPatientAttachment, previewPatientAttachment, type PatientAttachment,
  useCreateNeuropsychAssessment, useNeuropsychAssessments,
  useAssessmentAiInterpretation, useAppointments,
} from '@/hooks/useApi'
import NewSessionModal from '@/components/features/sessions/NewSessionModal'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { track, EVENTS } from '@/lib/analytics'
import LightweightChart from '@/components/ui/LightweightChart'
import EditPatientModal from '@/components/features/patients/EditPatientModal'
import DeletePatientDialog from '@/components/features/patients/DeletePatientDialog'
import RecurringSessionsCard from '@/components/features/patients/RecurringSessionsCard'
import LegacyNotesMigrationModal from '@/components/features/patients/LegacyNotesMigrationModal'
import { useHasPlan } from '@/store/subscription'
import { buildPatientDetailSummary, buildScaleEvolutionSeries } from '@/lib/patient-detail-summary'
import { useTerms } from '@/hooks/useTerms'

const MOODS = ['', '1', '2', '3', '4', '5']
const WEEKDAYS = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']
const PATIENT_STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Inativo' },
  { value: 'discharged', label: 'Alta' },
] as const

export default function PatientDetailPage() {
  const t = useTerms()
  const { id } = useParams()
  const navigate = useNavigate()
  const hasProPlan = useHasPlan('pro')
  useEffect(() => { if (id) track(EVENTS.PATIENT_VIEWED) }, [id])
  const { data: patient, isLoading } = usePatient(id ?? '')
  const { data: allSessions = [] } = useSessions({ patientId: id, includeClinical: true })
  const { data: financialRecords = [], isLoading: loadingFinancial } = useFinancial({ patientId: id })
  const markPaid = useMarkFinancialPaid()
  const sendCharge = useSendCharge()
  const updatePatient = useUpdatePatient()
  const { data: instrumentAssignments = [] } = useInstrumentAssignments(id)
  const updateInstrumentAnswers = useUpdateInstrumentAnswers()
  const assessmentAiInterpretation = useAssessmentAiInterpretation()
  const createPortalLink = useCreatePatientPortalLink()
  const { data: attachments = [] } = usePatientAttachments(id)
  const uploadAttachment = useUploadPatientAttachment(id)
  const deleteAttachment = useDeletePatientAttachment(id)
  const { data: neuropsychAssessments = [] } = useNeuropsychAssessments({}, hasProPlan)
  const createNeuropsychAssessment = useCreateNeuropsychAssessment()
  const { data: patientAppointments = [] } = useAppointments({ patientId: id })
  const lastAppointment = [...patientAppointments]
    .filter(a => a.status !== 'cancelled')
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))[0] ?? null
  const patientAssessments = neuropsychAssessments.filter(assessment => assessment.patientId === id)
  const activeAssessment = patientAssessments.find(assessment => ['planning', 'in_progress', 'integration'].includes(assessment.status))
  const latestAssessment = activeAssessment ?? patientAssessments[0]
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<PatientAttachment | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [note, setNote] = useState('')

  async function handleAttachmentUpload(file?: File) {
    if (!file) return
    if (!['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Envie um arquivo PDF, JPG ou PNG.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10 MB.')
      return
    }
    try {
      await uploadAttachment.mutateAsync({ file })
      toast.success(`Documento anexado ao ${t.record}`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Não foi possível anexar o documento.')
    }
  }

  async function handleAttachmentDownload(attachment: PatientAttachment) {
    setDownloadingAttachmentId(attachment.id)
    try {
      await downloadPatientAttachment(id!, attachment)
    } catch {
      toast.error('Não foi possível baixar o documento.')
    } finally {
      setDownloadingAttachmentId(null)
    }
  }

  async function handleAttachmentDelete(attachment: PatientAttachment) {
    if (!window.confirm(`Excluir "${attachment.filename}"? Essa ação não pode ser desfeita.`)) return
    try {
      await deleteAttachment.mutateAsync(attachment.id)
      toast.success('Documento excluído')
    } catch {
      toast.error('Não foi possível excluir o documento.')
    }
  }

  async function handleAttachmentPreview(attachment: PatientAttachment) {
    setPreviewAttachment(attachment)
    setPreviewLoading(true)
    try {
      const url = await previewPatientAttachment(id!, attachment)
      setPreviewUrl(url)
    } catch {
      toast.error('Não foi possível abrir o documento.')
      setPreviewAttachment(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  function closeAttachmentPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewAttachment(null)
  }

  async function openOrStartNeuropsychAssessment() {
    if (activeAssessment) {
      navigate(`/avaliacoes/${activeAssessment.id}`)
      return
    }
    if (!id) return
    try {
      const created = await createNeuropsychAssessment.mutateAsync({ patientId: id })
      toast.success('Avaliação iniciada')
      navigate(`/avaliacoes/${created.id}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Não foi possível iniciar a avaliação')
    }
  }
  const [tab, setTab] = useState<'record' | 'timeline' | 'responses' | 'notes' | 'financial'>('record')
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [showLegacyMigration, setShowLegacyMigration] = useState(false)
  const [showEditPatientModal, setShowEditPatientModal] = useState(false)
  const [showDeletePatientModal, setShowDeletePatientModal] = useState(false)
  const deletePatient = useDeletePatient()

  async function handleDeletePatient() {
    if (!patient) return
    try {
      await deletePatient.mutateAsync(patient.id)
      toast.success('Pessoa excluída')
      navigate('/pacientes')
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao excluir pessoa.')
    }
  }
  const [editingResponse, setEditingResponse] = useState<InstrumentAssignment | null>(null)
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({})
  const [fixedSchedule, setFixedSchedule] = useState({
    hasFixedSchedule: false,
    fixedScheduleWeekday: 1,
    fixedScheduleTime: '09:00',
    fixedScheduleFrequency: 'weekly' as 'weekly' | 'biweekly',
    fixedScheduleModality: 'presencial' as 'presencial' | 'online',
  })
  const [careSettings, setCareSettings] = useState({
    status: 'active' as 'active' | 'paused' | 'discharged',
    billingType: 'per_session' as 'per_session' | 'monthly_package',
    sessionPrice: 0,
    monthlyPackagePrice: 0,
    monthlyIncludedSessions: 4,
    billingDay: 5,
    sessionDuration: 50,
  })
  const [demographicSettings, setDemographicSettings] = useState({
    race: '',
    gender: '',
    sexualOrientation: '',
  })

  useEffect(() => {
    if (patient?.privateNotes) setNote(patient.privateNotes)
  }, [patient?.id])

  useEffect(() => {
    if (!patient) return
    setFixedSchedule({
      hasFixedSchedule: Boolean(patient.hasFixedSchedule),
      fixedScheduleWeekday: patient.fixedScheduleWeekday ?? 1,
      fixedScheduleTime: patient.fixedScheduleTime ?? '09:00',
      fixedScheduleFrequency: patient.fixedScheduleFrequency ?? 'weekly',
      fixedScheduleModality: patient.fixedScheduleModality ?? 'presencial',
    })
    setCareSettings({
      status: patient.status,
      billingType: patient.billingType ?? 'per_session',
      sessionPrice: Number(patient.sessionPrice ?? 0),
      monthlyPackagePrice: Number(patient.monthlyPackagePrice ?? 0),
      monthlyIncludedSessions: patient.monthlyIncludedSessions ?? 4,
      billingDay: patient.billingDay ?? 5,
      sessionDuration: patient.sessionDuration ?? 50,
    })
    setDemographicSettings({
      race: patient.race ?? '',
      gender: patient.gender ?? '',
      sexualOrientation: patient.sexualOrientation ?? '',
    })
  }, [
    patient?.id,
    patient?.status,
    patient?.billingType,
    patient?.sessionPrice,
    patient?.monthlyPackagePrice,
    patient?.monthlyIncludedSessions,
    patient?.billingDay,
    patient?.sessionDuration,
    patient?.race,
    patient?.gender,
    patient?.sexualOrientation,
    patient?.hasFixedSchedule,
    patient?.fixedScheduleWeekday,
    patient?.fixedScheduleTime,
    patient?.fixedScheduleFrequency,
    patient?.fixedScheduleModality,
  ])

  async function handleMarkPaid(recordId: string) {
    try {
      await markPaid.mutateAsync({ id: recordId, method: 'pix' })
      toast.success('Pagamento registrado')
    } catch { toast.error('Erro ao registrar pagamento.') }
  }

  async function handleSendCharge(recordId: string) {
    try {
      await sendCharge.mutateAsync(recordId)
      track(EVENTS.PAYMENT_SENT)
      toast.success('Cobranca enviada via WhatsApp')
    } catch { toast.error('Erro ao enviar cobrança.') }
  }

  async function saveFixedSchedule() {
    if (!id) return
    try {
      await updatePatient.mutateAsync({ id, data: fixedSchedule })
      toast.success('Horario fixo salvo')
    } catch {
      toast.error('Erro ao salvar horario fixo.')
    }
  }

  async function saveCareSettings() {
    if (!id) return
    try {
      await updatePatient.mutateAsync({
        id,
        data: {
          status: careSettings.status,
          billingType: careSettings.billingType,
          sessionPrice: careSettings.sessionPrice,
          monthlyPackagePrice: careSettings.monthlyPackagePrice,
          monthlyIncludedSessions: careSettings.monthlyIncludedSessions,
          billingDay: careSettings.billingDay,
          sessionDuration: careSettings.sessionDuration,
        },
      })
      toast.success('Dados do atendimento salvos')
    } catch {
      toast.error('Erro ao salvar dados do atendimento.')
    }
  }

  async function changeCareStatus(status: typeof careSettings.status) {
    if (!id) return
    try {
      setCareSettings(current => ({ ...current, status }))
      await updatePatient.mutateAsync({ id, data: { status } })
      toast.success('Situação atualizada')
    } catch {
      setCareSettings(current => ({ ...current, status: patient?.status ?? current.status }))
      toast.error('Erro ao atualizar situação.')
    }
  }

  async function saveDemographicSettings() {
    if (!id) return
    try {
      await updatePatient.mutateAsync({
        id,
        data: {
          race: demographicSettings.race,
          gender: demographicSettings.gender,
          sexualOrientation: demographicSettings.sexualOrientation,
        },
      })
      toast.success(`Informações do ${t.patient} salvas`)
    } catch {
      toast.error(`Erro ao salvar informações do ${t.patient}.`)
    }
  }

  function openResponse(response: InstrumentAssignment) {
    setEditingResponse(response)
    setEditedAnswers(response.answers ?? {})
    assessmentAiInterpretation.reset()
  }

  function generateAssessmentInterpretation() {
    if (!editingResponse) return
    const interpretation = scaleInterpretation(editingResponse)
    if (!interpretation) return
    const critical = criticalResponses(editingResponse)
    assessmentAiInterpretation.mutate({
      id: editingResponse.id,
      scaleName: editingResponse.title,
      scoreDetails: {
        score: interpretation.score,
        level: interpretation.level?.label,
        subscales: interpretation.subscales.map(s => ({ label: s.label, score: s.score, level: s.level.label })),
      },
      criticalFlags: critical.map(c => ({ label: c.label, note: c.note })),
    }, {
      onError: () => toast.error('Não foi possível gerar a interpretação por IA.'),
    })
  }

  function criticalResponses(response: InstrumentAssignment | null) {
    if (!response) return []
    return getCriticalResponses(response.instrumentId, response.answers)
  }

  function scaleInterpretation(response: InstrumentAssignment | null) {
    if (!response) return null
    return interpretScaleResult(response.instrumentId, response.score, response.scoreDetails, response.answers)
  }

  async function saveResponse() {
    if (!editingResponse) return
    try {
      await updateInstrumentAnswers.mutateAsync({ id: editingResponse.id, answers: editedAnswers })
      setEditingResponse(null)
      toast.success('Respostas atualizadas')
    } catch {
      toast.error('Erro ao atualizar respostas.')
    }
  }

  async function copyPortalLink() {
    if (!id) return
    try {
      const { url } = await createPortalLink.mutateAsync(id)
      await navigator.clipboard.writeText(url)
      toast.success(`Link copiado. Envie ao ${t.patient} para preencher os dados antes da ${t.session}.`)
    } catch {
      toast.error('Não foi possível gerar o link.')
    }
  }

  if (isLoading) return (
    <div className="animate-pulse space-y-4 max-w-4xl">
      <div className="h-5 bg-neutral-100 rounded-lg w-36" />
      <div className="h-36 bg-neutral-100 rounded-2xl" />
      <div className="h-10 bg-neutral-100 rounded-xl" />
    </div>
  )

  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-neutral-500 mb-4">Pessoa não encontrada.</p>
      <Link to="/pacientes" className="btn-secondary inline-flex">← Voltar</Link>
    </div>
  )

  const prontuario = patient.prontuario ?? {}
  const {
    totalPaid,
    totalPending,
    clinicalSessions,
    monthlySessionsUsed,
    moodChartData,
    filledProntuarioFields,
  } = buildPatientDetailSummary(financialRecords, allSessions, prontuario)
  const scaleEvolutionSeries = buildScaleEvolutionSeries(instrumentAssignments)

  return (
    <div className="animate-slide-up space-y-5 max-w-4xl">
      {/* Voltar */}
      <Link to="/pacientes"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>{t.patientsCapitalized}</span>
      </Link>

      {/* Header card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <Avatar name={patient.name} colorClass={patient.avatarColor} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-xl font-medium text-neutral-800">{patient.name}</h1>
                  {patient.pronouns && (
                    <span className="text-sm text-neutral-400">({patient.pronouns})</span>
                  )}
                  <StatusBadge status={patient.status} />
                </div>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-neutral-400">
                  {patient.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[160px]">{patient.email}</span>
                    </span>
                  )}
                  {patient.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />{patient.phone}
                    </span>
                  )}
                  {patient.birthDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{formatDate(patient.birthDate)}
                    </span>
                  )}
                </div>
              </div>

              {/* Ações — desktop */}
              <div className="hidden sm:flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditPatientModal(true)}
                  className="btn-secondary text-sm flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={copyPortalLink}
                  disabled={createPortalLink.isPending}
                  className="btn-secondary text-sm flex items-center gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> Portal
                </button>
                <Link to={`/prontuario/${patient.id}`}
                  className="btn-secondary text-sm flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> {t.recordCapitalized}
                </Link>
                <button onClick={() => setShowSessionModal(true)}
                  className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Nova {t.session}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeletePatientModal(true)}
                  title="Excluir pessoa"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {patient.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {patient.tags.map(tag => <TagBadge key={tag} tag={tag} />)}
              </div>
            )}
          </div>
        </div>

        {/* Ações — mobile */}
        <div className="grid grid-cols-2 gap-2 mt-4 sm:hidden">
          <button
            type="button"
            onClick={() => setShowEditPatientModal(true)}
            className="btn-secondary text-sm flex items-center gap-1.5 justify-center"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <button onClick={copyPortalLink}
            disabled={createPortalLink.isPending}
            className="btn-secondary text-sm flex items-center gap-1.5 justify-center">
            <Copy className="w-3.5 h-3.5" /> Portal
          </button>
          <Link to={`/prontuario/${patient.id}`}
            className="btn-secondary text-sm flex items-center gap-1.5 justify-center">
            <ClipboardList className="w-3.5 h-3.5" /> {t.recordCapitalized}
          </Link>
          <button onClick={() => setShowSessionModal(true)}
            className="btn-primary text-sm flex items-center gap-1.5 justify-center">
            <Plus className="w-3.5 h-3.5" /> Nova {t.session}
          </button>
          <button
            type="button"
            onClick={() => setShowDeletePatientModal(true)}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm text-rose-500 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir pessoa
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-neutral-100">
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Em acompanhamento desde</p>
            <p className="font-semibold text-neutral-700 text-sm">{formatDate(patientStartDate(patient.startDate, patient.createdAt))}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">
              {patient.billingType === 'monthly_package' ? 'Pacote mensal' : `Valor por ${t.session}`}
            </p>
            <p className="font-semibold text-neutral-700 text-sm">
              {formatCurrency(patient.billingType === 'monthly_package' ? patient.monthlyPackagePrice : patient.sessionPrice)}
              {patient.billingType === 'monthly_package' && <span className="font-normal text-neutral-400"> · {monthlySessionsUsed}/{patient.monthlyIncludedSessions} {t.sessions}</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Duração</p>
            <p className="font-semibold text-neutral-700 text-sm">{patient.sessionDuration} min</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-sage-100 bg-sage-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sage-800">Portal do {t.patient}</p>
              <p className="mt-1 text-xs leading-relaxed text-sage-700">
                Copie um link seguro para o {t.patient} revisar dados, contato de emergência e próximos horários antes da {t.session}.
              </p>
            </div>
            <button
              type="button"
              onClick={copyPortalLink}
              disabled={createPortalLink.isPending}
              className="btn-primary shrink-0 text-sm inline-flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {createPortalLink.isPending ? 'Gerando...' : 'Copiar link'}
            </button>
          </div>
        </div>
      </div>

      {hasProPlan && (patient.careMode === 'neuropsychological_assessment' || latestAssessment) && (
        <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-card dark:border-violet-900/50 dark:from-violet-950/30 dark:to-cognia-panel">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200"><BrainCircuit className="h-5 w-5" /></span>
              <div><h2 className="font-semibold text-neutral-900 dark:text-white">Avaliação neuropsicológica</h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{activeAssessment
                  ? `${activeAssessment.batteryProgress.applied}/${activeAssessment.batteryProgress.total} procedimentos aplicados · avaliação em andamento`
                  : latestAssessment
                    ? 'A avaliação mais recente foi concluída ou arquivada. Você pode consultá-la na área de avaliações.'
                    : 'Organize história, bateria, resultados, integração e relatório final.'}</p></div>
            </div>
            {activeAssessment ? <button type="button" onClick={openOrStartNeuropsychAssessment} className="btn-primary shrink-0">Abrir avaliação</button> : latestAssessment ? <Link to={`/avaliacoes/${latestAssessment.id}`} className="btn-secondary shrink-0 text-center">Ver última avaliação</Link> : <button type="button" onClick={openOrStartNeuropsychAssessment} disabled={createNeuropsychAssessment.isPending} className="btn-primary shrink-0">{createNeuropsychAssessment.isPending ? 'Iniciando...' : 'Iniciar avaliação'}</button>}
          </div>
        </section>
      )}

      {patient.hasFixedSchedule && (
        <RecurringSessionsCard
          patient={patient}
          anchorDate={lastAppointment?.date ?? null}
          anchorLabel={lastAppointment ? `Última ${t.session} em ${formatDate(lastAppointment.date)}` : `Sem ${t.sessions} registradas ainda`}
        />
      )}

      <EditPatientModal
        open={showEditPatientModal}
        onClose={() => setShowEditPatientModal(false)}
        patient={patient}
      />

      <DeletePatientDialog
        open={showDeletePatientModal}
        patientName={patient.name}
        loading={deletePatient.isPending}
        onConfirm={handleDeletePatient}
        onClose={() => setShowDeletePatientModal(false)}
      />

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-sage-600" />
            <h2 className="font-semibold text-neutral-800 text-sm">Informações do {t.patient}</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Raça/cor</label>
            <input
              value={demographicSettings.race}
              onChange={e => setDemographicSettings(s => ({ ...s, race: e.target.value }))}
              className="input-field"
              placeholder="Autodeclarada"
            />
          </div>
          <div>
            <label className="label">Gênero</label>
            <input
              value={demographicSettings.gender}
              onChange={e => setDemographicSettings(s => ({ ...s, gender: e.target.value }))}
              className="input-field"
              placeholder="Autodeclarado"
            />
          </div>
          <div>
            <label className="label">Orientação sexual</label>
            <input
              value={demographicSettings.sexualOrientation}
              onChange={e => setDemographicSettings(s => ({ ...s, sexualOrientation: e.target.value }))}
              className="input-field"
              placeholder="Autodeclarada"
            />
          </div>
          <div className="flex items-end">
            <button onClick={saveDemographicSettings} disabled={updatePatient.isPending} className="btn-primary text-sm w-full">
              {updatePatient.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-sage-600" />
            <h2 className="font-semibold text-neutral-800 text-sm">Situação e cobrança</h2>
          </div>
          <StatusBadge status={careSettings.status} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Situação</label>
            <select
              value={careSettings.status}
              onChange={e => setCareSettings(s => ({ ...s, status: e.target.value as typeof careSettings.status }))}
              className="input-field"
            >
              {PATIENT_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Forma de cobrança</label>
            <select value={careSettings.billingType}
              onChange={e => setCareSettings(s => ({ ...s, billingType: e.target.value as typeof careSettings.billingType }))}
              className="input-field">
              <option value="per_session">Por {t.session}</option>
              <option value="monthly_package">Pacote mensal</option>
            </select>
          </div>
          <div>
            <label className="label">Duração (min)</label>
            <input
              type="number"
              min={20}
              max={180}
              value={careSettings.sessionDuration}
              onChange={e => setCareSettings(s => ({ ...s, sessionDuration: Number(e.target.value) }))}
              className="input-field"
            />
          </div>
          {careSettings.billingType === 'monthly_package' ? (
            <>
              <div>
                <label className="label">Valor do pacote (R$)</label>
                <input type="number" min={0} step="0.01" value={careSettings.monthlyPackagePrice}
                  onChange={e => setCareSettings(s => ({ ...s, monthlyPackagePrice: Number(e.target.value) }))}
                  className="input-field" />
              </div>
              <div>
                <label className="label">{t.sessionsCapitalized} incluídas/mês</label>
                <input type="number" min={1} max={31} value={careSettings.monthlyIncludedSessions}
                  onChange={e => setCareSettings(s => ({ ...s, monthlyIncludedSessions: Number(e.target.value) }))}
                  className="input-field" />
              </div>
              <div>
                <label className="label">Dia do vencimento</label>
                <input type="number" min={1} max={31} value={careSettings.billingDay}
                  onChange={e => setCareSettings(s => ({ ...s, billingDay: Number(e.target.value) }))}
                  className="input-field" />
              </div>
              <div className="flex items-end text-xs text-neutral-500">
                Uso neste mês: <strong className="ml-1 text-neutral-700">{monthlySessionsUsed}/{careSettings.monthlyIncludedSessions}</strong>
              </div>
            </>
          ) : (
            <div>
              <label className="label">Valor da {t.session} (R$)</label>
              <input type="number" min={0} step="0.01" value={careSettings.sessionPrice}
                onChange={e => setCareSettings(s => ({ ...s, sessionPrice: Number(e.target.value) }))}
                className="input-field" />
            </div>
          )}
          <div className="flex items-end">
            <button onClick={saveCareSettings} disabled={updatePatient.isPending} className="btn-primary text-sm w-full">
              {updatePatient.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
          {careSettings.status !== 'active' && (
            <button
              type="button"
              onClick={() => changeCareStatus('active')}
              disabled={updatePatient.isPending}
              className="btn-secondary text-xs"
            >
              Reativar
            </button>
          )}
          {careSettings.status !== 'paused' && (
            <button
              type="button"
              onClick={() => changeCareStatus('paused')}
              disabled={updatePatient.isPending}
              className="btn-secondary text-xs"
            >
              Marcar inativo
            </button>
          )}
          {careSettings.status !== 'discharged' && (
            <button
              type="button"
              onClick={() => changeCareStatus('discharged')}
              disabled={updatePatient.isPending}
              className="btn-secondary text-xs"
            >
              Registrar alta
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sage-600" />
            <h2 className="font-semibold text-neutral-800 text-sm">Horario fixo</h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            <input
              type="checkbox"
              checked={fixedSchedule.hasFixedSchedule}
              onChange={e => setFixedSchedule(s => ({ ...s, hasFixedSchedule: e.target.checked }))}
              className="w-4 h-4 accent-sage-600"
            />
            Usar horario fixo
          </label>
        </div>
        {fixedSchedule.hasFixedSchedule && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="label">Dia</label>
              <select
                value={fixedSchedule.fixedScheduleWeekday}
                onChange={e => setFixedSchedule(s => ({ ...s, fixedScheduleWeekday: Number(e.target.value) }))}
                className="input-field"
              >
                {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Horario</label>
              <input
                type="time"
                value={fixedSchedule.fixedScheduleTime}
                onChange={e => setFixedSchedule(s => ({ ...s, fixedScheduleTime: e.target.value }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Recorrencia</label>
              <select
                value={fixedSchedule.fixedScheduleFrequency}
                onChange={e => setFixedSchedule(s => ({ ...s, fixedScheduleFrequency: e.target.value as 'weekly' | 'biweekly' }))}
                className="input-field"
              >
                <option value="weekly">Toda semana</option>
                <option value="biweekly">15 em 15 dias</option>
              </select>
            </div>
            <div>
              <label className="label">Modalidade</label>
              <select
                value={fixedSchedule.fixedScheduleModality}
                onChange={e => setFixedSchedule(s => ({ ...s, fixedScheduleModality: e.target.value as 'presencial' | 'online' }))}
                className="input-field"
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={saveFixedSchedule} disabled={updatePatient.isPending} className="btn-primary text-sm w-full">
                Salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl">
        {[
          { id: 'record',    label: t.recordCapitalized,  icon: BookOpenText  },
          { id: 'timeline',  label: 'Histórico',    icon: CalendarDays  },
          { id: 'responses', label: 'Respostas',    icon: FileText      },
          { id: 'notes',     label: 'Anotacoes privadas', icon: Lock          },
          { id: 'financial', label: 'Financeiro',   icon: Banknote      },
        ].map(tabItem => (
          <button key={tabItem.id} onClick={() => setTab(tabItem.id as any)}
            className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm transition-all text-center ${
              tab === tabItem.id
                ? 'bg-white text-neutral-800 shadow-sm font-semibold'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}>
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* ── Prontuario e evolucoes ───────────────────────────────────── */}
      {tab === 'record' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpenText className="h-4 w-4 text-sage-600" />
                  <h2 className="section-title mb-0">{t.recordCapitalized} clínico</h2>
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  Identificação, {t.intake}, plano terapêutico e evoluções ficam reunidos nesta pessoa.
                </p>
              </div>
              <Link to={`/prontuario/${patient.id}`} className="btn-secondary shrink-0 text-sm">
                Abrir completo
              </Link>
            </div>

            {filledProntuarioFields.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
                <ClipboardList className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-3 font-medium text-neutral-600">{t.recordCapitalized} ainda sem dados clínicos</p>
                <p className="mt-1 text-sm text-neutral-400">Abra o {t.record} completo para preencher a {t.intake} e o plano terapêutico.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {filledProntuarioFields.map(field => (
                  <div key={field.key} className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{field.label}</p>
                    <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-neutral-600">
                      {String(prontuario[field.key])}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-sage-600" />
                <h2 className="section-title mb-0">Evoluções</h2>
              </div>
              <button onClick={() => setShowSessionModal(true)} className="btn-primary text-sm">
                Nova evolução
              </button>
            </div>

            {clinicalSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
                <p className="font-medium text-neutral-600">Nenhuma evolução registrada</p>
                <p className="mt-1 text-sm text-neutral-400">As evoluções aparecem aqui assim que uma {t.session} for registrada.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {clinicalSessions.map((session, index) => (
                  <div key={session.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="rounded-full bg-sage-50 px-2.5 py-1 text-xs font-semibold text-sage-700">
                        Evolução {clinicalSessions.length - index}
                      </span>
                      <span className="text-xs text-neutral-400">{formatDate(session.date)}</span>
                    </div>
                    {session.summary ? (
                      <p className="text-sm leading-relaxed text-neutral-600">{session.summary}</p>
                    ) : (
                      <p className="text-sm italic text-neutral-400">Sem descrição registrada.</p>
                    )}
                    {session.nextSteps && (
                      <p className="mt-2 rounded-xl bg-sage-50 px-3 py-2 text-sm leading-relaxed text-sage-800">
                        {session.nextSteps}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Documentos anexados ─────────────────────────────────── */}
          <div className="card">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-sage-600" />
                  <h2 className="section-title mb-0">Documentos</h2>
                </div>
                <p className="mt-1 text-sm text-neutral-400">
                  Material anterior de evolução, laudos e outros documentos deste {t.patient}. PDF, JPG ou PNG até 10 MB.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setShowLegacyMigration(true)} className="btn-primary shrink-0 text-sm">
                  Migrar anotações em papel
                </button>
                <label className={`btn-secondary shrink-0 cursor-pointer text-sm ${uploadAttachment.isPending ? 'pointer-events-none opacity-60' : ''}`}>
                  {uploadAttachment.isPending ? 'Enviando...' : 'Anexar arquivo'}
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                    disabled={uploadAttachment.isPending}
                    onChange={event => {
                      handleAttachmentUpload(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                </label>
              </div>
            </div>

            {attachments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
                <Paperclip className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-3 font-medium text-neutral-600">Nenhum documento anexado</p>
                <p className="mt-1 text-sm text-neutral-400">Anexe PDFs de evoluções antigas para concentrar o histórico aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-700">{attachment.filename}</p>
                      <p className="text-xs text-neutral-400">
                        {(attachment.size / 1024 / 1024) >= 1
                          ? `${(attachment.size / 1024 / 1024).toFixed(1)} MB`
                          : `${Math.max(1, Math.round(attachment.size / 1024))} KB`}
                        {' · '}{formatDate(attachment.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(attachment.mimeType) && (
                        <button
                          onClick={() => handleAttachmentPreview(attachment)}
                          className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-sage-50 hover:text-sage-600"
                          title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleAttachmentDownload(attachment)}
                        disabled={downloadingAttachmentId === attachment.id}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-sage-50 hover:text-sage-600 disabled:opacity-50"
                        title="Baixar">
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleAttachmentDelete(attachment)}
                        disabled={deleteAttachment.isPending}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                        title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Timeline ──────────────────────────────────────────────────── */}
      {tab === 'timeline' && (
        <div className="space-y-3">
          {moodChartData.length >= 2 && (
            <div className="card">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Humor por {t.session}</p>
              <div className="h-[100px]">
                <LightweightChart
                  data={moodChartData.map(item => ({ label: item.label, value: Number(item.humor) || 0 }))}
                  height={100}
                  color="#2F7657"
                  fillOpacity={0.08}
                  min={1}
                  max={5}
                  showYAxis
                  formatValue={value => ['Muito dificil', 'Dificil', 'Neutro', 'Positivo', 'Muito positivo'][Math.round(value) - 1] ?? String(value)}
                />
              </div>
            </div>
          )}

          {clinicalSessions.length === 0 ? (
            <div className="card py-12 text-center">
              <div className="w-12 h-12 bg-sage-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarDays className="w-5 h-5 text-sage-400" />
              </div>
              <p className="font-medium text-neutral-600 mb-1">Nenhuma {t.session} ainda</p>
              <p className="text-sm text-neutral-400 mb-4">O histórico de {t.sessions} aparecerá aqui.</p>
              <button onClick={() => setShowSessionModal(true)} className="btn-secondary text-sm">
                Registrar {t.session}
              </button>
            </div>
          ) : (
            clinicalSessions.map(s => (
              <div key={s.id} className="card flex gap-4 hover:shadow-lifted transition-shadow duration-200">
                <div className="w-12 text-center shrink-0 pt-0.5">
                  <p className="text-[11px] text-neutral-400 leading-tight">{formatDateRelative(s.date)}</p>
                  <span className="text-xl mt-1 block">
                    {s.mood ? MOODS[s.mood] : 'Registro'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-neutral-700 text-sm">{t.sessionCapitalized} · {s.duration} min</p>
                  {s.summary && (
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{s.summary}</p>
                  )}
                  {s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.tags.map(tag => <TagBadge key={tag} tag={tag} small />)}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  <StatusBadge status={s.paymentStatus} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Respostas de formulários ─────────────────────────────────── */}
      {tab === 'responses' && (
        <div className="space-y-3">
          {scaleEvolutionSeries.length > 0 && (
            <div className="space-y-3">
              {scaleEvolutionSeries.map(series => {
                const thresholds = SCALE_CONFIGS[series.instrumentId]?.thresholds
                const maxScore = thresholds?.[thresholds.length - 1]?.max
                return (
                  <div key={series.instrumentId} className="card">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">
                      Evolução · {series.title}
                    </p>
                    <div className="h-[100px]">
                      <LightweightChart
                        data={series.points}
                        height={100}
                        color="#4DA8DA"
                        fillOpacity={0.1}
                        min={0}
                        max={maxScore}
                        showYAxis
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {instrumentAssignments.filter(item => item.status === 'completed').length === 0 ? (
            <div className="card py-12 text-center">
              <FileText className="mx-auto h-9 w-9 text-neutral-300" />
              <p className="mt-3 font-medium text-neutral-600">Nenhuma resposta recebida</p>
              <p className="mt-1 text-sm text-neutral-400">Formulários respondidos aparecerão aqui.</p>
            </div>
          ) : instrumentAssignments.filter(item => item.status === 'completed').map(response => (
            <button key={response.id} type="button" onClick={() => openResponse(response)}
              className="card w-full text-left hover:shadow-lifted transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-700">{response.title}</p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Respondido em {response.completedAt ? formatDate(response.completedAt) : formatDate(response.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {response.answers
                      ? `${Object.values(response.answers).filter(Boolean).length} respostas preenchidas`
                      : 'Resposta em formato anterior'}
                  </p>
                  {response.score != null && (() => {
                    const interpretation = interpretScaleResult(response.instrumentId, response.score, response.scoreDetails, response.answers)
                    if (!interpretation) return null
                    if (interpretation.subscales.length > 0) {
                      return (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {interpretation.subscales.map(sub => (
                            <span key={sub.id} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sub.level.color}`}>
                              {sub.label}: {sub.score} ({sub.level.label})
                            </span>
                          ))}
                        </div>
                      )
                    }
                    if (!interpretation.level) return null
                    return (
                      <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${interpretation.level.color}`}>
                        <BarChart3 className="h-3 w-3" /> Pontuação: {interpretation.score} — {interpretation.level.label}
                      </span>
                    )
                  })()}
                  {getCriticalResponses(response.instrumentId, response.answers).length > 0 && (
                    <span className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      Ponto crítico assinalado
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-sage-600">
                  <Pencil className="h-3.5 w-3.5" /> {SCALE_CONFIGS[response.instrumentId] ? 'Ver resposta' : 'Ver e editar'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Anotações privadas ─────────────────────────────────────────── */}
      {tab === 'notes' && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800">
              Anotações criptografadas — visíveis apenas para você.
            </p>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={9}
            placeholder="Escreva suas observações clínicas com liberdade. Este é um espaço só seu — ninguém mais terá acesso..."
            className="input-field resize-none leading-relaxed"
          />
          <div className="flex justify-end">
            <button
              onClick={async () => {
                if (!id) return
                try {
                  await updatePatient.mutateAsync({ id, data: { privateNotes: note } })
                  toast.success('Anotacao salva com seguranca')
                } catch { toast.error('Erro ao salvar anotação.') }
              }}
              disabled={updatePatient.isPending}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              {updatePatient.isPending ? 'Salvando...' : 'Salvar anotação'}
            </button>
          </div>
        </div>
      )}

      {/* ── Financeiro ────────────────────────────────────────────────── */}
      {tab === 'financial' && (
        <div className="space-y-3">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total cobrado', value: financialRecords.reduce((s, r) => s + Number(r.amount), 0), color: 'text-neutral-700' },
              { label: 'Recebido',      value: totalPaid,    color: 'text-sage-700'    },
              { label: 'Pendente',      value: totalPending, color: 'text-amber-600'   },
            ].map(item => (
              <div key={item.label} className="card py-4 text-center">
                <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Lista */}
          {loadingFinancial ? (
            <div className="card text-center py-10">
              <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : financialRecords.length === 0 ? (
            <div className="card py-12 text-center">
              <div className="w-12 h-12 bg-sage-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Banknote className="w-5 h-5 text-sage-400" />
              </div>
              <p className="font-medium text-neutral-600 mb-1">Nenhum registro financeiro</p>
              <p className="text-sm text-neutral-400">Os lançamentos vinculados a esta pessoa aparecerão aqui.</p>
            </div>
          ) : (
            <div className="card divide-y divide-neutral-50">
              {financialRecords.map(record => (
                <div key={record.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-700">{record.description}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {record.dueDate ? formatDate(record.dueDate) : '—'}
                      {record.method && <span> · {record.method}</span>}
                    </p>
                  </div>
                  <p className="font-semibold text-neutral-700 text-sm shrink-0">
                    {formatCurrency(Number(record.amount))}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    {record.status === 'paid' ? (
                      <span className="flex items-center gap-1 text-xs text-sage-600 bg-sage-50 px-2.5 py-1 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Pago
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSendCharge(record.id)}
                          title="Enviar cobrança via WhatsApp"
                          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-sage-600 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMarkPaid(record.id)}
                          className="text-xs btn-secondary py-1 px-2.5"
                        >
                          Recebido
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NewSessionModal
        open={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        defaultPatientId={patient.id}
      />

      <LegacyNotesMigrationModal
        open={showLegacyMigration}
        onClose={() => setShowLegacyMigration(false)}
        patientId={patient.id}
        patientName={patient.name}
        sessionDuration={patient.sessionDuration}
      />

      <Modal
        open={!!previewAttachment}
        onClose={closeAttachmentPreview}
        title={previewAttachment?.filename ?? 'Documento'}
        size="lg">
        {previewLoading ? (
          <div className="flex h-[60vh] items-center justify-center text-sm text-neutral-400">Carregando...</div>
        ) : previewUrl && previewAttachment ? (
          previewAttachment.mimeType === 'application/pdf' ? (
            <iframe src={previewUrl} title={previewAttachment.filename} className="h-[75vh] w-full rounded-xl border border-neutral-100" />
          ) : (
            <img src={previewUrl} alt={previewAttachment.filename} className="max-h-[75vh] w-full rounded-xl object-contain" />
          )
        ) : null}
        {previewAttachment && (
          <div className="mt-4 flex justify-end">
            <button onClick={() => handleAttachmentDownload(previewAttachment)} className="btn-secondary text-sm">
              <Download className="mr-1.5 inline h-4 w-4" /> Baixar
            </button>
          </div>
        )}
      </Modal>

      <Modal open={!!editingResponse} onClose={() => setEditingResponse(null)} title={editingResponse?.title ?? 'Respostas'} size="lg">
        {criticalResponses(editingResponse).length > 0 && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">Ponto crítico nas respostas</p>
            <div className="mt-2 space-y-1">
              {criticalResponses(editingResponse).map(item => (
                <p key={item.label} className="text-xs leading-relaxed text-red-700">
                  <span className="font-semibold">{item.label}:</span> {item.note}
                </p>
              ))}
            </div>
          </div>
        )}
        {editingResponse?.score != null && (() => {
          const interpretation = scaleInterpretation(editingResponse)
          if (!interpretation) return null
          return (
            <div className="mb-4 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {interpretation.level && (
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${interpretation.level.color}`}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    Total: {interpretation.score} — {interpretation.level.label}
                  </span>
                )}
                {interpretation.subscales.map(sub => (
                  <span key={sub.id} className={`rounded-full px-3 py-1 text-xs font-semibold ${sub.level.color}`}>
                    {sub.label}: {sub.score} — {sub.level.label}
                  </span>
                ))}
              </div>
              {interpretation.note && (
                <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                  {interpretation.note}
                </p>
              )}
            </div>
          )
        })()}
        {editingResponse?.score != null && (
          <div className="mb-4 rounded-xl border border-neutral-100 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sage-600" /> Interpretação por IA
              </p>
              <button
                type="button"
                onClick={generateAssessmentInterpretation}
                disabled={assessmentAiInterpretation.isPending}
                className="btn-secondary text-xs px-2.5 py-1"
              >
                {assessmentAiInterpretation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : assessmentAiInterpretation.data ? 'Gerar de novo' : 'Gerar rascunho'}
              </button>
            </div>
            {assessmentAiInterpretation.data?.criticalAlert && (
              <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-medium leading-relaxed text-red-800">
                {assessmentAiInterpretation.data.criticalAlert}
              </p>
            )}
            {assessmentAiInterpretation.data?.draft && (
              <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                {assessmentAiInterpretation.data.draft}
              </p>
            )}
          </div>
        )}
        {editingResponse?.answers && SCALE_CONFIGS[editingResponse.instrumentId] ? (
          <div className="space-y-3">
            {SCALE_CONFIGS[editingResponse.instrumentId].items.map((item, index) => {
              const value = editingResponse.answers?.[item.id] ?? ''
              const options = item.options ?? SCALE_CONFIGS[editingResponse.instrumentId].options
              const label = options.find(option => String(option.value) === String(value))?.label
              return (
                <div key={item.id} className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                  <p className="text-sm font-medium text-neutral-700">
                    <span className="mr-2 text-xs font-semibold text-sage-600">{index + 1}.</span>
                    {item.label}
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    Resposta: <span className="font-semibold text-neutral-700">{value || '—'}</span>
                    {label ? <span> · {label}</span> : null}
                  </p>
                </div>
              )
            })}
            <div className="flex justify-end border-t border-neutral-100 pt-4">
              <button type="button" onClick={() => setEditingResponse(null)} className="btn-secondary">Fechar</button>
            </div>
          </div>
        ) : editingResponse?.answers ? (
          <div className="space-y-4">
            {editingResponse.fields.map(field => (
              <label key={field.id} className="block">
                <span className="label">{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea rows={3} value={editedAnswers[field.id] ?? ''}
                    onChange={e => setEditedAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field resize-y" />
                ) : field.type === 'select' ? (
                  <select value={editedAnswers[field.id] ?? ''}
                    onChange={e => setEditedAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field">
                    <option value="">Selecione</option>
                    {field.options?.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input type={field.type} value={editedAnswers[field.id] ?? ''}
                    onChange={e => setEditedAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field" />
                )}
              </label>
            ))}
            <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
              <button type="button" onClick={() => setEditingResponse(null)} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={saveResponse} disabled={updateInstrumentAnswers.isPending} className="btn-primary">
                {updateInstrumentAnswers.isPending ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-600">
            {editingResponse?.responseText}
          </pre>
        )}
      </Modal>
    </div>
  )
}
