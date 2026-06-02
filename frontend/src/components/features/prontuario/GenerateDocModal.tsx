import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { AlertTriangle, ChevronLeft } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Patient } from '@/types'
import { Documento, DocType, DOC_TYPE_DESCRIPTIONS, DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '@/types/prontuario'
import { formatCurrency } from '@/lib/utils'
import { useCreateDocument } from '@/hooks/useApi'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import toast from 'react-hot-toast'

type FormData = {
  patientId: string
  type: DocType
  requester?: string
  purpose?: string
  place?: string
  sessionCount?: number
  sessionValue?: number
  startDate?: string
  endDate?: string
  attendanceSchedule?: string
  demand?: string
  procedure?: string
  conclusion?: string
  extraText?: string
  referralTo?: string
}

function buildContent(data: FormData, patient: Patient, type: DocType, user: { name: string; crp?: string } | null): string {
  const today = new Date().toLocaleDateString('pt-BR')
  const startDate = data.startDate ? new Date(data.startDate).toLocaleDateString('pt-BR') : '__/__/____'
  const endDate = data.endDate ? new Date(data.endDate).toLocaleDateString('pt-BR') : '__/__/____'
  const sessionCount = data.sessionCount ?? '___'
  const sessionCountWords = data.sessionCount ? numToWords(data.sessionCount) : '___'
  const requester = data.requester?.trim() || 'Pessoa atendida'
  const purpose = data.purpose?.trim() || 'Finalidade informada pela pessoa solicitante'
  const place = data.place?.trim() || '[cidade/UF]'
  const author = `${user?.name ?? 'Psicólogo(a)'} - CRP ${user?.crp ?? '00/000000'}`

  switch (type) {
    case 'declaracao':
      return `DECLARAÇÃO

Pessoa atendida: ${patient.name}
Solicitante: ${requester}
Finalidade: ${purpose}
Profissional responsável: ${author}

Declaro, para os devidos fins, que a pessoa acima identificada ${data.attendanceSchedule ? `realiza/realizou acompanhamento psicológico em ${data.attendanceSchedule}` : `compareceu/realizou ${sessionCount} (${sessionCountWords}) atendimento(s) psicológico(s) no período de ${startDate} a ${endDate}`}.

Esta declaração registra apenas informações objetivas sobre a prestação de serviço psicológico, sem sintomas, situações ou estados psicológicos, conforme Res. CFP n. 06/2019.

${place}, ${today}.`

    case 'recibo':
      return `RECIBO DE PAGAMENTO

Recebi de ${patient.name} a quantia de ${data.sessionValue ? formatCurrency(data.sessionValue) : 'R$ ____'} referente a serviço psicológico prestado em ${today}.

Este recibo comprova pagamento e não substitui documento fiscal quando este for exigível pela legislação aplicável.`

    case 'relatorio':
      return `RELATÓRIO PSICOLÓGICO

1. Identificação
Pessoa atendida: ${patient.name}
Solicitante: ${requester}
Finalidade: ${purpose}
Profissional responsável: ${author}
Período de acompanhamento: ${startDate} a ${endDate}
Número de atendimentos: ${sessionCount}

2. Descrição da demanda
${data.demand?.trim() || '[Descreva a demanda que motivou o processo e a solicitação do documento.]'}

3. Procedimento
${data.procedure?.trim() || '[Informe procedimentos utilizados, período, fontes consultadas e limites do trabalho.]'}

4. Análise
${data.extraText?.trim() || '[Descreva apenas informações pertinentes à finalidade, com fundamentação técnico-científica e respeito ao sigilo profissional.]'}

5. Conclusão
${data.conclusion?.trim() || '[Registre conclusão técnica limitada à demanda e à finalidade informada.]'}

Este relatório possui caráter sigiloso e não deve ser utilizado para finalidade diferente da indicada.

${place}, ${today}.`

    case 'atestado':
      return `ATESTADO PSICOLÓGICO

Pessoa atendida: ${patient.name}
Solicitante: ${requester}
Finalidade: ${purpose}
Profissional responsável: ${author}

Descrição da demanda:
${data.demand?.trim() || '[Descreva objetivamente a demanda que fundamenta o atestado.]'}

Procedimento:
${data.procedure?.trim() || '[Informe o processo de avaliação psicológica, procedimentos utilizados e fontes de informação.]'}

Conclusão:
${data.conclusion?.trim() || '[Certifique a situação, estado ou funcionamento psicológico quando houver fundamento em avaliação psicológica, indicando período/recomendação quando aplicável.]'}

Este atestado é emitido por requerimento da pessoa atendida e deve ser utilizado exclusivamente para a finalidade informada.

${place}, ${today}.`

    case 'encaminhamento':
      return `ENCAMINHAMENTO

Encaminho ${patient.name} para avaliação e/ou acompanhamento com ${data.referralTo ?? '[profissional/serviço]'}.

Justificativa:
${data.extraText ?? '[Descreva o motivo do encaminhamento e apenas as informações clínicas necessárias para continuidade do cuidado.]'}

Permaneço à disposição para interlocução técnica, observados os limites éticos e o sigilo profissional.`

    default:
      return ''
  }
}

function numToWords(n: number): string {
  const words = ['zero','uma','duas','três','quatro','cinco','seis','sete','oito','nove','dez',
    'onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove','vinte']
  return words[n] ?? String(n)
}

export default function GenerateDocModal({
  open, onClose, onGenerate, patients, user, initialType,
}: {
  open: boolean
  onClose: () => void
  onGenerate: (doc: Documento) => void
  patients: Patient[]
  user: { name: string; crp?: string } | null
  initialType?: DocType
}) {
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [selectedType, setSelectedType] = useState<DocType>('declaracao')
  const createDocument = useCreateDocument()
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { type: 'declaracao' },
  })

  useEffect(() => {
    if (open) {
      if (initialType) {
        setSelectedType(initialType)
        setStep('form')
      } else {
        setSelectedType('declaracao')
        setStep('type')
      }
    }
  }, [open, initialType])

  const patientId = watch('patientId')
  const patient = patients.find(p => p.id === patientId)

  function handleClose() {
    setStep('type')
    reset()
    onClose()
  }

  async function onSubmit(data: FormData) {
    if (!patient) { toast.error('Selecione uma pessoa'); return }
    const content = buildContent({ ...data, type: selectedType }, patient, selectedType, user)
    const title = `${DOC_TYPE_LABELS[selectedType]} — ${patient.name}`
    try {
      const doc = await createDocument.mutateAsync({
        patientId: patient.id,
        patientName: patient.name,
        type: selectedType,
        title,
        content,
      })
      onGenerate(doc)
      toast.success('Documento gerado e assinado digitalmente')
      handleClose()
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error('Plano Essencial necessário para gerar documentos.')
      } else {
        toast.error('Erro ao gerar documento.')
      }
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Gerar documento" size="lg"
      description="Documentos com assinatura digital · CFP Res. 006/2019">
      {step === 'type' ? (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">Selecione o tipo de documento:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([type, label]) => (
              <button key={type}
                onClick={() => { setSelectedType(type); setStep('form') }}
                className={`flex min-h-24 items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:border-sage-300 hover:bg-sage-50 ${
                  selectedType === type ? 'border-sage-300 bg-sage-50' : 'border-neutral-200'
                }`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sage-600 ring-1 ring-neutral-100">
                  <UseCogniaIcon name={DOC_TYPE_ICONS[type]} size={24} />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-neutral-800">{label}</p>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-snug">{DOC_TYPE_DESCRIPTIONS[type]}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => setStep('type')}
              className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
            <UseCogniaIcon name={DOC_TYPE_ICONS[selectedType]} size={24} className="text-sage-600" />
            <span className="font-medium text-sm text-neutral-700">{DOC_TYPE_LABELS[selectedType]}</span>
          </div>

          <div>
            <label className="label">Pessoa</label>
            <select {...register('patientId', { required: true })} className="input-field">
              <option value="">Selecione...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {selectedType !== 'recibo' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Solicitante</label>
                <input {...register('requester')} className="input-field" placeholder="Ex: paciente, escola, empresa" />
              </div>
              <div>
                <label className="label">Finalidade</label>
                <input {...register('purpose')} className="input-field" placeholder="Ex: comprovacao de atendimento" />
              </div>
              <div>
                <label className="label">Local de emissao</label>
                <input {...register('place')} className="input-field" placeholder="Ex: Sao Paulo/SP" />
              </div>
            </div>
          )}

          {selectedType === 'declaracao' && (
            <div>
              <label className="label">Descricao objetiva do comparecimento</label>
              <input
                {...register('attendanceSchedule')}
                className="input-field"
                placeholder="Ex: toda segunda-feira, das 14h as 14h50, ou atendimento em 02/06/2026"
              />
            </div>
          )}

          {(selectedType === 'declaracao' || selectedType === 'relatorio') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data início</label>
                <input type="date" {...register('startDate')} className="input-field" />
              </div>
              <div>
                <label className="label">Data fim</label>
                <input type="date" {...register('endDate')}
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="input-field" />
              </div>
            </div>
          )}

          {(selectedType === 'declaracao' || selectedType === 'relatorio') && (
            <div>
              <label className="label">Número de sessões</label>
              <input type="number" min="1" {...register('sessionCount', { valueAsNumber: true })}
                className="input-field" placeholder="Ex: 8" />
            </div>
          )}

          {selectedType === 'recibo' && (
            <div>
              <label className="label">Valor recebido (R$)</label>
              <input type="number" step="0.01" {...register('sessionValue', { valueAsNumber: true })}
                className="input-field"
                placeholder={patient ? String(patient.sessionPrice) : '0,00'} />
            </div>
          )}

          {selectedType === 'encaminhamento' && (
            <div>
              <label className="label">Encaminhar para</label>
              <input {...register('referralTo')} className="input-field"
                placeholder="Ex: Psiquiatria, Neurologia, CAPS..." />
            </div>
          )}

          {(selectedType === 'relatorio' || selectedType === 'atestado') && (
            <div className="space-y-3">
              <div>
                <label className="label">Descricao da demanda</label>
                <textarea {...register('demand')} rows={3}
                  className="input-field resize-none text-sm"
                  placeholder="Descreva a demanda e o motivo da solicitacao do documento." />
              </div>
              <div>
                <label className="label">Procedimento</label>
                <textarea {...register('procedure')} rows={3}
                  className="input-field resize-none text-sm"
                  placeholder="Informe procedimentos utilizados, periodo, fontes consultadas e limites." />
              </div>
            </div>
          )}

          {(selectedType === 'relatorio' || selectedType === 'atestado') && (
            <div>
              <label className="label">Conclusao</label>
              <textarea {...register('conclusion')} rows={3}
                className="input-field resize-none text-sm"
                placeholder="Registre uma conclusao tecnica limitada a finalidade do documento." />
            </div>
          )}

          {(selectedType === 'relatorio' || selectedType === 'encaminhamento') && (
            <div>
              <label className="label">
                {selectedType === 'relatorio' ? 'Desenvolvimento clínico' : 'Justificativa / informações clínicas'}
              </label>
              <textarea {...register('extraText')} rows={4}
                className="input-field resize-none text-sm"
                placeholder="Descreva as informações relevantes para este documento..." />
            </div>
          )}

          {(selectedType === 'declaracao' || selectedType === 'atestado' || selectedType === 'relatorio') && (
            <div className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                Revise antes de assinar. Declaracao deve conter apenas informacoes objetivas; relatorio e atestado exigem fundamentacao tecnica e finalidade definida.
              </p>
            </div>
          )}

          {/* Preview da assinatura */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-1">
            <p className="text-xs text-neutral-400 uppercase tracking-wide font-medium">Assinatura digital</p>
            <p className="text-sm font-medium text-neutral-700">{user?.name ?? 'Psicólogo(a)'}</p>
            <p className="text-xs text-neutral-500">CRP {user?.crp ?? '00/000000'}</p>
            <p className="text-xs text-neutral-400">{new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={handleClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting}
              className="btn-primary flex items-center gap-2">
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Gerar e assinar
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
