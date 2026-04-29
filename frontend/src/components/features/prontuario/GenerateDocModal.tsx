import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import { Patient } from '@/types'
import { Documento, DocType, DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '@/types/prontuario'
import { formatCurrency } from '@/lib/utils'
import { useCreateDocument } from '@/hooks/useApi'
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

function generateSignCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'PS-' + new Date().getFullYear() + '-' +
    Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function buildContent(data: FormData, patient: Patient, type: DocType): string {
  const today = new Date().toLocaleDateString('pt-BR')

  switch (type) {
    case 'declaracao':
      return `Declaro, para os devidos fins, que ${patient.name} compareceu a ${data.sessionCount ?? '___'} (${data.sessionCount ? numToWords(data.sessionCount) : '___'}) sessões de psicoterapia no período de ${data.startDate ? new Date(data.startDate).toLocaleDateString('pt-BR') : '__/__/____'} a ${data.endDate ? new Date(data.endDate).toLocaleDateString('pt-BR') : '__/__/____'}, sob minha responsabilidade profissional.`

    case 'recibo':
      return `Recebi de ${patient.name} a quantia de ${data.sessionValue ? formatCurrency(data.sessionValue) : 'R$ ____'} (${data.sessionValue ? formatCurrency(data.sessionValue) : '____'}) referente à(s) sessão(ões) de psicoterapia realizada(s) em ${today}.`

    case 'relatorio':
      return `Relatório Psicológico\n\nIdentificação: ${patient.name}\nData de início do acompanhamento: ${data.startDate ? new Date(data.startDate).toLocaleDateString('pt-BR') : '__/__/____'}\nNúmero de sessões realizadas: ${data.sessionCount ?? '___'}\n\nDesenvolvimento:\n${data.extraText ?? '[Descreva o processo terapêutico, progressos observados e estado atual da pessoa.]'}\n\nConclusão:\nO(A) paciente encontra-se em processo terapêutico ativo, com adesão adequada ao tratamento.`

    case 'atestado':
      return `Atesto, para os devidos fins, que ${patient.name} encontra-se sob acompanhamento psicológico regular, com frequência ${patient.sessionDuration ? `de ${patient.sessionDuration} minutos por sessão` : 'semanal'}, sendo clinicamente recomendável a continuidade do tratamento.\n\n${data.extraText ?? ''}`

    case 'encaminhamento':
      return `Encaminho ${patient.name} para avaliação e acompanhamento com ${data.referralTo ?? '[profissional/serviço]'}.\n\nJustificativa:\n${data.extraText ?? '[Descreva o motivo do encaminhamento e informações clínicas relevantes.]'}`

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
      toast.success('Documento gerado e assinado digitalmente ✓')
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
                className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all hover:border-sage-300 hover:bg-sage-50 ${
                  selectedType === type ? 'border-sage-300 bg-sage-50' : 'border-neutral-200'
                }`}>
                <span className="text-2xl">{DOC_TYPE_ICONS[type]}</span>
                <div>
                  <p className="font-medium text-sm text-neutral-800">{label}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {type === 'declaracao' && 'Comprova frequência às sessões'}
                    {type === 'recibo' && 'Comprovante de pagamento'}
                    {type === 'relatorio' && 'Relatório clínico formal'}
                    {type === 'atestado' && 'Certifica o acompanhamento'}
                    {type === 'encaminhamento' && 'Referência a outro profissional'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={() => setStep('type')}
              className="text-sm text-neutral-400 hover:text-neutral-600">← Voltar</button>
            <span className="text-lg">{DOC_TYPE_ICONS[selectedType]}</span>
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
              {isSubmitting
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : '✍️'}
              Gerar e assinar
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
