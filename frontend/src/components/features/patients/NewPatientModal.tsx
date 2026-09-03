import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import { useTerms } from '@/hooks/useTerms'
import { hasPsychologyModules } from '@/lib/professions'
import { useAuthStore } from '@/store/auth'
import { EmotionalTag, Patient, TAG_LABELS } from '@/types'
import { useCreatePatient, useDefaultTemplate } from '@/hooks/useApi'
import { track, EVENTS } from '@/lib/analytics'
import RecurringSessionsCard from './RecurringSessionsCard'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  pronouns: z.string().optional(),
  race: z.string().optional(),
  gender: z.string().optional(),
  sexualOrientation: z.string().optional(),
  careMode: z.enum(['psychotherapy', 'neuropsychological_assessment']),
  billingType: z.enum(['per_session', 'monthly_package']),
  sessionPrice: z.coerce.number().min(0),
  monthlyPackagePrice: z.coerce.number().min(0),
  monthlyIncludedSessions: z.coerce.number().int().min(1).max(31),
  billingDay: z.coerce.number().int().min(1).max(31),
  sessionDuration: z.coerce.number().min(20).max(180),
  hasFixedSchedule: z.boolean().optional(),
  fixedScheduleWeekday: z.coerce.number().min(0).max(6).optional(),
  fixedScheduleTime: z.string().optional(),
  fixedScheduleFrequency: z.enum(['weekly', 'biweekly']).optional(),
  fixedScheduleModality: z.enum(['presencial', 'online']).optional(),
  tags: z.array(z.string()).optional(),
  cpfCnpj: z.string()
    .regex(/^\d{11}$|^\d{14}$/, 'CPF (11 dígitos) ou CNPJ (14 dígitos)')
    .optional()
    .or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.billingType === 'monthly_package' && data.monthlyPackagePrice <= 0) {
    ctx.addIssue({ code: 'custom', path: ['monthlyPackagePrice'], message: 'Informe o valor do pacote' })
  }
})

type FormData = z.infer<typeof schema>

const ALL_TAGS = Object.entries(TAG_LABELS) as [EmotionalTag, string][]

export default function NewPatientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTerms()
  const showCareMode = hasPsychologyModules(useAuthStore(s => s.user?.profession))
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      billingType: 'per_session',
      careMode: 'psychotherapy',
      sessionPrice: 150,
      monthlyPackagePrice: 600,
      monthlyIncludedSessions: 4,
      billingDay: 5,
      sessionDuration: 50,
      hasFixedSchedule: false,
      fixedScheduleWeekday: 1,
      fixedScheduleTime: '09:00',
      fixedScheduleFrequency: 'weekly',
      fixedScheduleModality: 'presencial',
      tags: [],
    },
  })
  const createPatient = useCreatePatient()
  const { data: patientTemplate } = useDefaultTemplate('patient_form')
  const [createdPatient, setCreatedPatient] = useState<Patient | null>(null)
  const selectedTags = watch('tags') ?? []
  const hasFixedSchedule = watch('hasFixedSchedule')
  const billingType = watch('billingType')
  const careMode = watch('careMode')

  function toggleTag(tag: EmotionalTag) {
    const current = selectedTags
    setValue('tags', current.includes(tag) ? current.filter(item => item !== tag) : [...current, tag])
  }

  function applyDefaultTemplate() {
    if (!patientTemplate) return
    setValue('sessionPrice', 150)
    setValue('billingType', 'per_session')
    setValue('sessionDuration', 50)
    setValue('hasFixedSchedule', false)
    toast.success('Template simples aplicado')
  }

  async function onSubmit(data: FormData) {
    try {
      const payload = Object.fromEntries(
        Object.entries({ ...data, tags: data.tags ?? [] }).filter(([, value]) => value !== ''),
      )
      if (!data.hasFixedSchedule) {
        delete (payload as any).fixedScheduleWeekday
        delete (payload as any).fixedScheduleTime
        delete (payload as any).fixedScheduleFrequency
        delete (payload as any).fixedScheduleModality
      }
      const created = await createPatient.mutateAsync(payload as any)
      track(EVENTS.PATIENT_CREATED)
      toast.success(`${data.name} adicionada com sucesso`)
      if (data.hasFixedSchedule) {
        setCreatedPatient(created)
        return
      }
      reset()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Não foi possível adicionar. Tente novamente.')
    }
  }

  function finish() {
    setCreatedPatient(null)
    reset()
    onClose()
  }

  if (createdPatient) {
    return (
      <Modal open={open} onClose={finish} title={`Marcar as próximas ${t.sessions}?`} size="lg"
        description={`${createdPatient.name} foi cadastrada(o) com horário fixo. Você pode marcar as próximas ${t.sessions} agora ou fazer isso depois pela agenda.`}>
        <div className="space-y-4">
          <RecurringSessionsCard
            patient={createdPatient}
            anchorDate={null}
            anchorLabel={`Sem ${t.sessions} anteriores`}
            onScheduled={finish}
          />
          <div className="flex justify-end pt-2">
            <button type="button" onClick={finish} className="btn-secondary">Pular por agora</button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar nova pessoa" size="lg"
      description="Preencha apenas o que você tiver. O resto pode ser adicionado depois.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {patientTemplate && (
          <button type="button" onClick={applyDefaultTemplate}
            className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1 text-xs font-medium text-sage-700 hover:bg-sage-100">
            Usar template padrão
          </button>
        )}
        <div className="grid grid-cols-2 gap-4">
          {showCareMode && (
          <div className="col-span-2 rounded-xl border border-sage-100 bg-sage-50/60 p-4 dark:border-sage-800/60 dark:bg-sage-950/20">
            <label className="label">Modo de atendimento</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-xl border p-3 text-sm ${careMode === 'psychotherapy' ? 'border-sage-400 bg-white text-sage-800 dark:bg-cognia-panel dark:text-sage-200' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300'}`}>
                <input {...register('careMode')} type="radio" value="psychotherapy" className="sr-only" />
                <span className="block font-semibold">Psicoterapia</span>
                <span className="mt-1 block text-xs opacity-75">{t.sessionsCapitalized} e acompanhamento contínuo</span>
              </label>
              <label className={`cursor-pointer rounded-xl border p-3 text-sm ${careMode === 'neuropsychological_assessment' ? 'border-sage-400 bg-white text-sage-800 dark:bg-cognia-panel dark:text-sage-200' : 'border-neutral-200 text-neutral-600 dark:border-white/10 dark:text-neutral-300'}`}>
                <input {...register('careMode')} type="radio" value="neuropsychological_assessment" className="sr-only" />
                <span className="block font-semibold">Avaliação neuropsicológica</span>
                <span className="mt-1 block text-xs opacity-75">Bateria, resultados e integração</span>
              </label>
            </div>
          </div>
          )}
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
            <label className="label">Raça/cor</label>
            <input {...register('race')} className="input-field" placeholder="Autodeclarada" />
          </div>
          <div>
            <label className="label">Gênero</label>
            <input {...register('gender')} className="input-field" placeholder="Autodeclarado" />
          </div>
          <div>
            <label className="label">Orientação sexual</label>
            <input {...register('sexualOrientation')} className="input-field" placeholder="Autodeclarada" />
          </div>
          <div>
            <label className="label">CPF / CNPJ <span className="text-neutral-400 font-normal">(para cobrança)</span></label>
            <input {...register('cpfCnpj')}
              className="input-field font-mono"
              placeholder="Apenas números"
              maxLength={14}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '')
                ;(e.target as HTMLInputElement).value = v
              }}
            />
            {errors.cpfCnpj && <p className="text-rose-500 text-xs mt-1">{errors.cpfCnpj.message}</p>}
          </div>
          <div className="col-span-2 rounded-xl border border-neutral-100 p-4">
            <label className="label">Forma de cobrança</label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${billingType === 'per_session' ? 'border-sage-300 bg-sage-50 text-sage-800' : 'border-neutral-200 text-neutral-600'}`}>
                <input {...register('billingType')} type="radio" value="per_session" className="sr-only" />
                <span className="block font-semibold">Por {t.session}</span>
                <span className="mt-0.5 block text-xs opacity-75">Gera uma cobrança a cada atendimento</span>
              </label>
              <label className={`cursor-pointer rounded-xl border p-3 text-sm transition-colors ${billingType === 'monthly_package' ? 'border-sage-300 bg-sage-50 text-sage-800' : 'border-neutral-200 text-neutral-600'}`}>
                <input {...register('billingType')} type="radio" value="monthly_package" className="sr-only" />
                <span className="block font-semibold">Pacote mensal</span>
                <span className="mt-0.5 block text-xs opacity-75">Uma cobrança por mês, com {t.sessions} incluídas</span>
              </label>
            </div>
          </div>
          {billingType === 'monthly_package' ? (
            <>
              <div>
                <label className="label">Valor do pacote (R$)</label>
                <input {...register('monthlyPackagePrice')} type="number" min={0} step="0.01" className="input-field" />
                {errors.monthlyPackagePrice && <p className="mt-1 text-xs text-rose-500">{errors.monthlyPackagePrice.message}</p>}
              </div>
              <div>
                <label className="label">{t.sessionsCapitalized} incluídas por mês</label>
                <input {...register('monthlyIncludedSessions')} type="number" min={1} max={31} className="input-field" />
              </div>
              <div>
                <label className="label">Dia do vencimento</label>
                <input {...register('billingDay')} type="number" min={1} max={31} className="input-field" />
              </div>
            </>
          ) : (
            <div>
              <label className="label">Valor da {t.session} (R$)</label>
              <input {...register('sessionPrice')} type="number" min={0} step="0.01" className="input-field" />
            </div>
          )}
          <div>
            <label className="label">Duração (minutos)</label>
            <input {...register('sessionDuration')} type="number" className="input-field" />
          </div>
        </div>

        <div className="border border-neutral-100 rounded-xl p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input {...register('hasFixedSchedule')} type="checkbox" className="w-4 h-4 accent-sage-600" />
            Atendimento com horario fixo
          </label>
          {hasFixedSchedule && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Dia da semana</label>
                <select {...register('fixedScheduleWeekday')} className="input-field">
                  <option value={1}>Segunda</option>
                  <option value={2}>Terca</option>
                  <option value={3}>Quarta</option>
                  <option value={4}>Quinta</option>
                  <option value={5}>Sexta</option>
                  <option value={6}>Sabado</option>
                  <option value={0}>Domingo</option>
                </select>
              </div>
              <div>
                <label className="label">Horario</label>
                <input {...register('fixedScheduleTime')} type="time" className="input-field" />
              </div>
              <div>
                <label className="label">Recorrencia</label>
                <select {...register('fixedScheduleFrequency')} className="input-field">
                  <option value="weekly">Toda semana</option>
                  <option value="biweekly">De 15 em 15 dias</option>
                </select>
              </div>
              <div>
                <label className="label">Modalidade</label>
                <select {...register('fixedScheduleModality')} className="input-field">
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                </select>
              </div>
            </div>
          )}
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
