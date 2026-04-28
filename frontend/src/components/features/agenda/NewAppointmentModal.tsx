import { useForm } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { usePatients, useCreateAppointment } from '@/hooks/useApi'

export default function NewAppointmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: patients = [] } = usePatients()
  const createAppointment = useCreateAppointment()

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { patientId: '', date: '', time: '09:00', duration: 50, modality: 'presencial', notes: '' },
  })

  async function onSubmit(data: any) {
    try {
      await createAppointment.mutateAsync(data)
      toast.success('Sessão agendada! 📅')
      reset(); onClose()
    } catch {
      toast.error('Erro ao agendar. Tente novamente.')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Agendar nova sessão"
      description="Os dados serão salvos e a pessoa receberá um lembrete.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Pessoa</label>
          <select {...register('patientId', { required: true })} className="input-field">
            <option value="">Selecione...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Data</label>
            <input {...register('date', { required: true })} type="date" className="input-field" />
          </div>
          <div>
            <label className="label">Horário</label>
            <input {...register('time')} type="time" className="input-field" />
          </div>
          <div>
            <label className="label">Duração (min)</label>
            <input {...register('duration')} type="number" className="input-field" />
          </div>
          <div>
            <label className="label">Modalidade</label>
            <select {...register('modality')} className="input-field">
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Observações (opcional)</label>
          <textarea {...register('notes')} rows={2} className="input-field resize-none" placeholder="Alguma informação relevante para esta sessão..." />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Agendar
          </button>
        </div>
      </form>
    </Modal>
  )
}
