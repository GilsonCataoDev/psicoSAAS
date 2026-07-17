import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { useUpdatePatient } from '@/hooks/useApi'
import { EmotionalTag, Patient, TAG_LABELS } from '@/types'

const TAG_VALUES = Object.keys(TAG_LABELS) as [EmotionalTag, ...EmotionalTag[]]

const schema = z.object({
  name: z.string().trim().min(2, 'Informe pelo menos 2 caracteres').max(150, 'Nome muito longo'),
  email: z.string().trim().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().trim().max(30, 'Telefone muito longo').optional(),
  birthDate: z.string().optional(),
  pronouns: z.string().trim().max(80, 'Pronomes muito longos').optional(),
  startDate: z.string().optional(),
  cpfCnpj: z.string()
    .regex(/^\d{11}$|^\d{14}$/, 'CPF (11 dígitos) ou CNPJ (14 dígitos)')
    .optional()
    .or(z.literal('')),
  race: z.string().trim().max(120).optional(),
  gender: z.string().trim().max(120).optional(),
  sexualOrientation: z.string().trim().max(120).optional(),
  tags: z.array(z.enum(TAG_VALUES)).max(20),
})

type FormData = z.infer<typeof schema>

const ALL_TAGS = Object.entries(TAG_LABELS) as [EmotionalTag, string][]

function defaultValues(patient: Patient): FormData {
  return {
    name: patient.name ?? '',
    email: patient.email ?? '',
    phone: patient.phone ?? '',
    birthDate: patient.birthDate?.slice(0, 10) ?? '',
    pronouns: patient.pronouns ?? '',
    startDate: patient.startDate?.slice(0, 10) ?? '',
    cpfCnpj: patient.cpfCnpj ?? '',
    race: patient.race ?? '',
    gender: patient.gender ?? '',
    sexualOrientation: patient.sexualOrientation ?? '',
    tags: patient.tags ?? [],
  }
}

function nullable(value?: string): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

interface EditPatientModalProps {
  open: boolean
  onClose: () => void
  patient: Patient
}

export default function EditPatientModal({ open, onClose, patient }: EditPatientModalProps) {
  const updatePatient = useUpdatePatient()
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(patient),
  })

  useEffect(() => {
    if (open) reset(defaultValues(patient))
  }, [open, patient, reset])

  const selectedTags = watch('tags') ?? []

  function toggleTag(tag: EmotionalTag) {
    setValue(
      'tags',
      selectedTags.includes(tag)
        ? selectedTags.filter(current => current !== tag)
        : [...selectedTags, tag],
      { shouldDirty: true },
    )
  }

  async function onSubmit(data: FormData) {
    try {
      await updatePatient.mutateAsync({
        id: patient.id,
        data: {
          name: data.name.trim(),
          email: nullable(data.email)?.toLowerCase() ?? null,
          phone: nullable(data.phone),
          birthDate: nullable(data.birthDate),
          pronouns: nullable(data.pronouns),
          startDate: nullable(data.startDate),
          cpfCnpj: nullable(data.cpfCnpj),
          race: nullable(data.race),
          gender: nullable(data.gender),
          sexualOrientation: nullable(data.sexualOrientation),
          tags: data.tags,
        },
      })
      toast.success('Cadastro do paciente atualizado')
      onClose()
    } catch (error: any) {
      const message = error?.response?.data?.message
      toast.error(Array.isArray(message) ? message[0] : message ?? 'Não foi possível atualizar o cadastro.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar cadastro"
      description="Atualize os dados pessoais e de contato do paciente."
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nome completo *</label>
            <input {...register('name')} autoFocus className="input-field" placeholder="Nome completo" />
            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">E-mail</label>
            <input {...register('email')} type="email" className="input-field" placeholder="email@exemplo.com" />
            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Telefone / WhatsApp</label>
            <input {...register('phone')} className="input-field" placeholder="(11) 99999-9999" />
            {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="label">Data de nascimento</label>
            <input {...register('birthDate')} type="date" className="input-field" />
          </div>
          <div>
            <label className="label">Início do acompanhamento</label>
            <input {...register('startDate')} type="date" className="input-field" />
          </div>

          <div>
            <label className="label">Pronomes</label>
            <input {...register('pronouns')} className="input-field" placeholder="ela/dela, ele/dele..." />
          </div>
          <div>
            <label className="label">CPF / CNPJ</label>
            <input
              {...register('cpfCnpj')}
              className="input-field font-mono"
              inputMode="numeric"
              maxLength={14}
              placeholder="Somente números"
              onChange={event => {
                setValue('cpfCnpj', event.target.value.replace(/\D/g, '').slice(0, 14), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
            {errors.cpfCnpj && <p className="mt-1 text-xs text-rose-500">{errors.cpfCnpj.message}</p>}
          </div>

          <div>
            <label className="label">Raça/cor</label>
            <input {...register('race')} className="input-field" placeholder="Autodeclarada" />
          </div>
          <div>
            <label className="label">Gênero</label>
            <input {...register('gender')} className="input-field" placeholder="Autodeclarado" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Orientação sexual</label>
            <input {...register('sexualOrientation')} className="input-field" placeholder="Autodeclarada" />
          </div>
        </div>

        <fieldset>
          <legend className="label">Etiquetas</legend>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map(([tag, label]) => {
              const selected = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-sage-300 bg-sage-100 text-sage-800'
                      : 'border-neutral-200 text-neutral-500 hover:border-sage-200 hover:text-sage-700'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 border-t border-neutral-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting || updatePatient.isPending} className="btn-primary text-sm">
            {isSubmitting || updatePatient.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
