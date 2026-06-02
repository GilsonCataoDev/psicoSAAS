import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ChevronLeft } from 'lucide-react'
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
  sessionCount?: number
  sessionValue?: number
  startDate?: string
  endDate?: string
  extraText?: string
  referralTo?: string
}

function buildContent(data: FormData, patient: Patient, type: DocType): string {
  const today = new Date().toLocaleDateString('pt-BR')
  const startDate = data.startDate ? new Date(data.startDate).toLocaleDateString('pt-BR') : '__/__/____'
  const endDate = data.endDate ? new Date(data.endDate).toLocaleDateString('pt-BR') : '__/__/____'
  const sessionCount = data.sessionCount ?? '___'
  const sessionCountWords = data.sessionCount ? numToWords(data.sessionCount) : '___'

  switch (type) {
    case 'declaracao':
      return `DECLARACAO DE COMPARECIMENTO

Declaro, para os devidos fins, que ${patient.name} compareceu a ${sessionCount} (${sessionCountWords}) atendimento(s) psicologico(s) no periodo de ${startDate} a ${endDate}, sob minha responsabilidade profissional.

Este documento e emitido a pedido da pessoa atendida, restringindo-se a finalidade declarada e preservando o sigilo profissional.`

    case 'recibo':
      return `RECIBO DE PAGAMENTO

Recebi de ${patient.name} a quantia de ${data.sessionValue ? formatCurrency(data.sessionValue) : 'R$ ____'} referente a servico psicologico prestado em ${today}.

Este recibo comprova pagamento e nao substitui documento fiscal quando este for exigivel pela legislacao aplicavel.`

    case 'relatorio':
      return `RELATORIO PSICOLOGICO

Identificacao: ${patient.name}
Finalidade: [descreva a finalidade especifica do documento]
Periodo de acompanhamento: ${startDate} a ${endDate}
Numero de atendimentos: ${sessionCount}

Analise:
${data.extraText ?? '[Descreva somente informacoes pertinentes a finalidade, com fundamentacao tecnico-cientifica e respeito ao sigilo profissional.]'}

Conclusao:
[Registre a conclusao tecnica limitada a demanda apresentada, evitando informacoes desnecessarias.]`

    case 'atestado':
      return `ATESTADO PSICOLOGICO

Atesto, para os devidos fins, que ${patient.name} encontra-se sob acompanhamento psicologico.

Informacoes tecnicas pertinentes:
${data.extraText ?? '[Informe, quando aplicavel, a condicao psicologica, periodo indicado, recomendacoes e limitacoes do atestado.]'}

Este atestado deve ser utilizado exclusivamente para a finalidade informada pela pessoa atendida.`

    case 'encaminhamento':
      return `ENCAMINHAMENTO

Encaminho ${patient.name} para avaliacao e/ou acompanhamento com ${data.referralTo ?? '[profissional/servico]'}.

Justificativa:
${data.extraText ?? '[Descreva o motivo do encaminhamento e apenas as informacoes clinicas necessarias para continuidade do cuidado.]'}

Permaneço a disposicao para interlocucao tecnica, observados os limites eticos e o sigilo profissional.`

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
  open, onClose, onGenerate, patients, user,
}: {
  open: boolean
  onClose: () => void
  onGenerate: (doc: Documento) => void
  patients: Patient[]
  user: { name: string; crp?: string } | null
}) {
  const [step, setStep] = useState<'type' | 'form'>('type')
  const [selectedType, setSelectedType] = useState<DocType>('declaracao')
  const createDocument = useCreateDocument()
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { type: 'declaracao' },
  })

  const patientId = watch('patientId')
  const patient = patients.find(p => p.id === patientId)

  function handleClose() {
    setStep('type')
    reset()
    onClose()
  }

  async function onSubmit(data: FormData) {
    if (!patient) { toast.error('Selecione uma pessoa'); return }
    const content = buildContent({ ...data, type: selectedType }, patient, selectedType)
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

          {(selectedType === 'relatorio' || selectedType === 'atestado' || selectedType === 'encaminhamento') && (
            <div>
              <label className="label">
                {selectedType === 'relatorio' ? 'Desenvolvimento clínico' :
                 selectedType === 'atestado' ? 'Observações (opcional)' :
                 'Justificativa / informações clínicas'}
              </label>
              <textarea {...register('extraText')} rows={4}
                className="input-field resize-none text-sm"
                placeholder="Descreva as informações relevantes para este documento..." />
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
