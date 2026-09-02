import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { useTerms } from '@/hooks/useTerms'

interface DeletePatientDialogProps {
  open: boolean
  patientName: string
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

/**
 * Exclusão de pessoa é irreversível — apaga sessões, agendamentos, documentos,
 * anexos e avaliações em cascata (lançamentos financeiros ficam, desvinculados).
 * Por isso exige digitar o nome exato em vez de um simples "Confirmar".
 */
export default function DeletePatientDialog({ open, patientName, loading, onConfirm, onClose }: DeletePatientDialogProps) {
  const t = useTerms()
  const [typed, setTyped] = useState('')
  const confirmed = typed.trim() === patientName.trim()

  function handleClose() {
    setTyped('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Excluir pessoa" description="Esta ação não pode ser desfeita." size="sm">
      <div className="space-y-5">
        <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p className="leading-relaxed">
            Isso apaga permanentemente <strong>{patientName}</strong>: {t.record}, evoluções, agendamentos,
            documentos, anexos e avaliações. Lançamentos financeiros já registrados são mantidos (sem vínculo com a pessoa),
            preservando o histórico de faturamento.
          </p>
        </div>

        <div>
          <label className="label">
            Digite <strong>{patientName}</strong> para confirmar
          </label>
          <input
            autoFocus
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={patientName}
            className="input-field text-sm"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={loading} className="btn-secondary text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Excluir permanentemente
          </button>
        </div>
      </div>
    </Modal>
  )
}
