import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { EmotionalTag, TAG_LABELS } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  pronouns: z.string().optional(),
  sessionPrice: z.coerce.number().min(0),
  sessionDuration: z.coerce.number().min(20).max(180),
  tags: z.array(z.string()).optional(),
})

type FormData = z.infer<typeof schema>

const ALL_TAGS = Object.entries(TAG_LABELS) as [EmotionalTag, string][]

export default function NewPatientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { sessionPrice: 150, sessionDuration: 50, tags: [] },
  })

  const selectedTags = watch('tags') ?? []

  function toggleTag(tag: EmotionalTag) {
    const current = selectedTags
    setValue('tags', current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag])
  }

  async function onSubmit(data: FormData) {
    await new Promise(r => setTimeout(r, 600))
    toast.success(`${data.name} adicionada com sucesso 🌱`)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar nova pessoa" size="lg"
      description="Preencha apenas o que você tiver. O resto pode ser adicionado depois.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input {...register('name')} className="input-field" placeholder="Nome completo" />
            {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">E-mail</label>
            <input {...register('email')} type="email" className="input-field" placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="label">Telefone / WhatsApp</label>
            <input {...register('phone')} className="input-field" placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className="label">Data de nascimento</label>
            <input {...register('birthDate')} type="date" className="input-field" />
          </div>
          <div>
            <label className="label">Pronomes</label>
            <input {...register('pronouns')} className="input-field" placeholder="ela/dele, ele/dele..." />
          </div>
          <div>
            <label className="label">Valor da sessão (R$)</label>
            <input {...register('sessionPrice')} type="number" className="input-field" />
          </div>
          <div>
            <label className="label">Duração (minutos)</label>
            <input {...register('sessionDuration')} type="number" className="input-field" />
          </div>
        </div>

        <div>
          <label className="label">Temas de trabalho</label>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map(([tag, label]) => (
              <button key={tag} type="button" onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-sage-100 text-sage-700 border-sage-300'
                    : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-sage-300'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
            {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}
