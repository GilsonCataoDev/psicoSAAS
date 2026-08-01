import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { ProntuarioExportOptions, useExportProntuario } from '@/hooks/api/patients'

type Section = NonNullable<ProntuarioExportOptions['sections']>[number]

const SECTIONS: Array<{ id: Section; label: string; detail: string }> = [
  { id: 'identification', label: 'Identificação', detail: 'Dados cadastrais e informações complementares' },
  { id: 'anamnesis', label: 'Anamnese', detail: 'Queixa, histórico e condições registradas' },
  { id: 'treatment_plan', label: 'Plano terapêutico', detail: 'Abordagem, objetivos e frequência' },
  { id: 'evolutions', label: 'Evoluções', detail: 'Registros das sessões no período selecionado' },
]

interface Props {
  open: boolean
  onClose: () => void
  patientId: string
  patientName: string
}

export default function PatientRecordDeliveryModal({ open, onClose, patientId, patientName }: Props) {
  const exportRecord = useExportProntuario(patientId)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sections, setSections] = useState<Section[]>(SECTIONS.map(section => section.id))
  const [reviewed, setReviewed] = useState(false)

  useEffect(() => {
    if (!open) return
    setFromDate('')
    setToDate('')
    setSections(SECTIONS.map(section => section.id))
    setReviewed(false)
  }, [open])

  const invalidPeriod = useMemo(
    () => Boolean(fromDate && toDate && fromDate > toDate),
    [fromDate, toDate],
  )

  function toggleSection(section: Section) {
    setReviewed(false)
    setSections(current => current.includes(section)
      ? current.filter(item => item !== section)
      : [...current, section])
  }

  async function generate() {
    if (!reviewed || sections.length === 0 || invalidPeriod) return
    try {
      await exportRecord.mutateAsync({
        audience: 'patient',
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        sections,
      })
      toast.success('Cópia do prontuário gerada com segurança.')
      onClose()
    } catch {
      toast.error('Não foi possível gerar a cópia. Revise os dados e tente novamente.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Preparar entrega ao paciente"
      description={`Escolha o conteúdo da cópia de ${patientName}.`}
      size="lg"
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-100">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Anotações privadas nunca entram nesta cópia.</p>
            <p className="mt-1 text-emerald-800 dark:text-emerald-200">Também excluímos contatos de terceiros. O download fica registrado no histórico de segurança.</p>
          </div>
        </div>

        <div>
          <p className="label mb-2">Período das evoluções</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              De
              <input type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); setReviewed(false) }} className="input-field mt-1" />
            </label>
            <label className="text-sm text-neutral-600 dark:text-neutral-300">
              Até
              <input type="date" value={toDate} onChange={event => { setToDate(event.target.value); setReviewed(false) }} className="input-field mt-1" />
            </label>
          </div>
          {invalidPeriod && <p className="mt-2 text-sm text-red-600 dark:text-red-300">A data inicial precisa vir antes da data final.</p>}
        </div>

        <fieldset>
          <legend className="label mb-2">Conteúdo da entrega</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SECTIONS.map(section => {
              const selected = sections.includes(section.id)
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  aria-pressed={selected}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors ${selected
                    ? 'border-cognia-300 bg-cognia-50 dark:border-cognia-700 dark:bg-cognia-950/30'
                    : 'border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5'}`}
                >
                  <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${selected ? 'text-cognia-600' : 'text-neutral-300 dark:text-neutral-600'}`} />
                  <span>
                    <span className="block text-sm font-medium text-neutral-800 dark:text-white">{section.label}</span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">{section.detail}</span>
                  </span>
                </button>
              )
            })}
          </div>
          {sections.length === 0 && <p className="mt-2 text-sm text-red-600 dark:text-red-300">Selecione ao menos uma seção.</p>}
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-white/10">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={event => setReviewed(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-cognia-600"
          />
          <span className="text-sm text-neutral-700 dark:text-neutral-200">
            Revisei o prontuário e confirmo que estas informações podem ser entregues ao paciente.
          </span>
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            type="button"
            onClick={generate}
            disabled={!reviewed || sections.length === 0 || invalidPeriod || exportRecord.isPending}
            className="btn-primary flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exportRecord.isPending ? 'Gerando cópia…' : 'Gerar cópia para entrega'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
