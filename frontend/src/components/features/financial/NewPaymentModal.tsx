import { useForm } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { usePatients, useCreateFinancial } from '@/hooks/useApi'

type FormData = {
  patientId: string
  description: string
  amount: number
  method: string
  type: 'income' | 'expense'
  dueDate: string
  paidNow: boolean
}

export default function NewPaymentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: patients = [] } = usePatients()
  const createFinancial = useCreateFinancial()

  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { type: 'income', method: 'pix', dueDate: new Date().toISOString().split('T')[0], paidNow: false },
  })

  const paidNow = watch('paidNow')
  const type = watch('type')

  async function onSubmit(data: FormData) {
    try {
      await createFinancial.mutateAsync({
        ...data,
        status: data.paidNow ? 'paid' : 'pending',
        paidAt: data.paidNow ? new Date().toISOString() : undefined,
        patientId: data.patientId || undefined,
      } as any)
      toast.success('Lançamento registrado ✓')
      reset(); onClose()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo lançamento"
      description="Registre uma receita ou despesa manualmente.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Tipo</label>
          <div className="flex gap-2">
            {[{ v: 'income', l: '💚 Receita' }, { v: 'expense', l: '🔴 Despesa' }].map(({ v, l }) => (
              <label key={v} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-sm font-medium ${
                type === v ? 'bg-sage-50 border-sage-300 text-sage-700' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300'
              }`}>
                <input type="radio" value={v} {...register('type')} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Pessoa (opcional)</label>
          <select {...register('patientId')} className="input-field">
            <option value="">Nenhuma</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Descrição</label>
            <input {...register('description', { required: true })} className="input-field" placeholder="Ex: Sessão 23/04, Supervisão..." />
          </div>
          <div>
            <label className="label">Valor (R$)</label>
            <input {...register('amount', { required: true, valueAsNumber: true })} type="number" step="0.01" min="0" className="input-field" placeholder="0,00" />
          </div>
          <div>
            <label className="label">Vencimento</label>
            <input {...register('dueDate')} type="date" className="input-field" />
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl cursor-pointer">
          <input type="checkbox" {...register('paidNow')} className="w-4 h-4 rounded accent-sage-500" />
          <span className="text-sm font-medium text-neutral-700">
            {type === 'income' ? 'Já recebi este valor' : 'Já paguei esta despesa'}
          </span>
        </label>

        {paidNow && (
          <div>
            <label className="label">Forma de pagamento</label>
            <select {...register('method')} className="input-field">
              <option value="pix">PIX</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Débito</option>
              <option value="cash">Dinheiro</option>
              <option value="transfer">Transferência</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Salvar lançamento
          </button>
        </div>
      </form>
    </Modal>
  )
}
