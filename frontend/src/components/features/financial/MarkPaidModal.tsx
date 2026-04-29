import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { FinancialRecord } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useMe } from '@/hooks/useApi'
import toast from 'react-hot-toast'

const METHODS = [
  { v: 'pix',         l: 'PIX',              icon: '⚡' },
  { v: 'credit_card', l: 'Cartão de crédito', icon: '💳' },
  { v: 'debit_card',  l: 'Débito',            icon: '💳' },
  { v: 'cash',        l: 'Dinheiro',          icon: '💵' },
  { v: 'transfer',    l: 'Transferência',     icon: '🏦' },
]

export default function MarkPaidModal({
  record,
  open,
  onClose,
  onConfirm,
}: {
  record: FinancialRecord | null
  open: boolean
  onClose: () => void
  onConfirm: (id: string, method: string) => void
}) {
  const { data: me } = useMe()
  const pixKey: string = me?.preferences?.pixKey ?? ''
  const [method, setMethod] = useState('pix')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (!record) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    onConfirm(record.id, method)
    setLoading(false)
    onClose()
  }

  function copyPix() {
    if (!pixKey) { toast.error('Configure sua chave PIX em Ajustes → Pagamentos'); return }
    navigator.clipboard.writeText(pixKey)
    toast.success('Chave PIX copiada!')
  }

  if (!record) return null

  return (
    <Modal open={open} onClose={onClose} title="Registrar pagamento"
      description={`Confirmar recebimento de ${formatCurrency(record.amount)}`}>
      <div className="space-y-5">

        {/* Resumo */}
        <div className="bg-sage-50 border border-sage-100 rounded-2xl p-4 space-y-1">
          <p className="text-sm font-medium text-neutral-700">{record.description}</p>
          <p className="text-2xl font-bold text-sage-700">{formatCurrency(record.amount)}</p>
          {record.patient && (
            <p className="text-xs text-neutral-500">{record.patient.name}</p>
          )}
        </div>

        {/* PIX key (se método for PIX) */}
        {method === 'pix' && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Sua chave PIX</p>
            {pixKey ? (
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm text-neutral-800 truncate">{pixKey}</p>
                <button onClick={copyPix}
                  className="flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-700 font-medium shrink-0">
                  <Copy className="w-3.5 h-3.5" />Copiar
                </button>
              </div>
            ) : (
              <p className="text-xs text-amber-600">
                Chave PIX não configurada. Acesse Ajustes → Pagamentos.
              </p>
            )}
          </div>
        )}

        {/* Forma de pagamento */}
        <div>
          <label className="label">Como foi recebido?</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {METHODS.map(({ v, l, icon }) => (
              <button key={v} type="button" onClick={() => setMethod(v)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                  method === v
                    ? 'bg-sage-50 border-sage-300 text-sage-700 font-medium'
                    : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
                }`}>
                <span>{icon}</span>{l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleConfirm} disabled={loading}
            className="btn-primary flex items-center gap-2">
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Check className="w-4 h-4" />}
            Confirmar recebimento
          </button>
        </div>
      </div>
    </Modal>
  )
}
