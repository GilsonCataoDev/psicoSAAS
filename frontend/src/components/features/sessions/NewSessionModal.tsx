import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { mockPatients } from '@/lib/mock-data'
import { EmotionalTag, TAG_LABELS } from '@/types'
import { cn } from '@/lib/utils'

const MOODS = [
  { value: 1, emoji: '😔', label: 'Muito difícil' },
  { value: 2, emoji: '😟', label: 'Difícil' },
  { value: 3, emoji: '😐', label: 'Neutro' },
  { value: 4, emoji: '🙂', label: 'Positivo' },
  { value: 5, emoji: '😊', label: 'Muito positivo' },
]

export default function NewSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mood, setMood] = useState<number | null>(null)
  const [tags, setTags] = useState<EmotionalTag[]>([])

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { patientId: '', date: new Date().toISOString().split('T')[0], duration: 50, summary: '', privateNotes: '', nextSteps: '', paymentStatus: 'pending' },
  })

  function toggleTag(tag: EmotionalTag) {
    setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])
  }

  async function onSubmit() {
    await new Promise(r => setTimeout(r, 600))
    toast.success('Sessão registrada com cuidado 📝')
    reset(); setMood(null); setTags([]); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Como foi a sessão?" size="lg"
      description="Registre o que achar relevante. Seus dados são criptografados.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Pessoa</label>
            <select {...register('patientId')} className="input-field">
              <option value="">Selecione...</option>
              {mockPatients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data</label>
            <input {...register('date')} type="date" className="input-field" />
          </div>
        </div>

        {/* Mood selector */}
        <div>
          <label className="label">Como a pessoa chegou nesta sessão?</label>
          <div className="flex gap-2">
            {MOODS.map(m => (
              <button key={m.value} type="button" onClick={() => setMood(m.value)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all text-xs',
                  mood === m.value ? 'bg-sage-50 border-sage-300 text-sage-700' : 'border-neutral-200 text-neutral-500 hover:border-sage-200'
                )}>
                <span className="text-2xl">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Resumo da sessão</label>
          <textarea {...register('summary')} rows={3} className="input-field resize-none"
            placeholder="O que foi trabalhado, pontos de atenção, avanços observados..." />
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5">🔒 Anotações privadas — apenas você vê</p>
          <textarea {...register('privateNotes')} rows={2} className="input-field resize-none text-sm"
            placeholder="Percepções, hipóteses de trabalho, reflexões clínicas..." />
        </div>

        <div>
          <label className="label">Próximos passos (opcional)</label>
          <input {...register('nextSteps')} className="input-field"
            placeholder="Tarefas, temas para a próxima sessão..." />
        </div>

        <div>
          <label className="label">Temas desta sessão</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(TAG_LABELS) as [EmotionalTag, string][]).map(([tag, label]) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium border transition-all', tags.includes(tag)
                  ? 'bg-sage-100 text-sage-700 border-sage-300' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-sage-300')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Pagamento</label>
          <select {...register('paymentStatus')} className="input-field">
            <option value="paid">Recebido</option>
            <option value="pending">Pendente</option>
            <option value="waived">Cortesia</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Salvar sessão
          </button>
        </div>
      </form>
    </Modal>
  )
}
