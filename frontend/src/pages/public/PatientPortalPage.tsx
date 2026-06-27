import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, CheckCircle2, Clock, Lock, UserRound } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, type AuthAxiosRequestConfig } from '@/lib/api'
import { formatDate } from '@/lib/utils'

type PatientPortal = {
  patient: {
    name: string
    email?: string | null
    phone?: string | null
    birthDate?: string | null
    pronouns?: string | null
    race?: string | null
    gender?: string | null
    sexualOrientation?: string | null
  }
  psychologist: {
    name: string
    crp?: string | null
  }
  appointments: Array<{
    id: string
    date: string
    time: string
    duration: number
    modality: string
    status: string
  }>
  intake: {
    queixaPrincipal?: string
    contatoEmergenciaNome?: string
    contatoEmergenciaPhone?: string
    contatoEmergenciaRelacao?: string
  }
}

type IntakeForm = {
  email: string
  phone: string
  birthDate: string
  pronouns: string
  race: string
  gender: string
  sexualOrientation: string
  queixaPrincipal: string
  contatoEmergenciaNome: string
  contatoEmergenciaPhone: string
  contatoEmergenciaRelacao: string
}

const emptyForm: IntakeForm = {
  email: '',
  phone: '',
  birthDate: '',
  pronouns: '',
  race: '',
  gender: '',
  sexualOrientation: '',
  queixaPrincipal: '',
  contatoEmergenciaNome: '',
  contatoEmergenciaPhone: '',
  contatoEmergenciaRelacao: '',
}

function publicConfig(): AuthAxiosRequestConfig {
  return { skipAuthRedirect: true }
}

export default function PatientPortalPage() {
  const { token } = useParams()
  const [form, setForm] = useState<IntakeForm>(emptyForm)

  const portal = useQuery<PatientPortal>({
    queryKey: ['patient-portal', token],
    queryFn: () => api.get(`/patient-portal/${token}`, publicConfig()).then(r => r.data),
    enabled: !!token,
    retry: false,
  })

  useEffect(() => {
    const data = portal.data
    if (!data) return
    setForm({
      email: data.patient.email ?? '',
      phone: data.patient.phone ?? '',
      birthDate: data.patient.birthDate ?? '',
      pronouns: data.patient.pronouns ?? '',
      race: data.patient.race ?? '',
      gender: data.patient.gender ?? '',
      sexualOrientation: data.patient.sexualOrientation ?? '',
      queixaPrincipal: data.intake.queixaPrincipal ?? '',
      contatoEmergenciaNome: data.intake.contatoEmergenciaNome ?? '',
      contatoEmergenciaPhone: data.intake.contatoEmergenciaPhone ?? '',
      contatoEmergenciaRelacao: data.intake.contatoEmergenciaRelacao ?? '',
    })
  }, [portal.data])

  const saveIntake = useMutation({
    mutationFn: (data: IntakeForm) =>
      api.patch(`/patient-portal/${token}/intake`, data, publicConfig()).then(r => r.data),
    onSuccess: () => {
      toast.success('Informações salvas')
      portal.refetch()
    },
    onError: () => toast.error('Não foi possível salvar agora.'),
  })

  const professional = useMemo(() => {
    if (!portal.data) return ''
    return portal.data.psychologist.crp
      ? `${portal.data.psychologist.name} · CRP ${portal.data.psychologist.crp}`
      : portal.data.psychologist.name
  }, [portal.data])

  function updateField(field: keyof IntakeForm, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  if (portal.isLoading) {
    return (
      <main className="min-h-screen bg-[#F6F7F4] px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-100 bg-white p-6 shadow-card">
          <div className="h-6 w-36 animate-pulse rounded-lg bg-neutral-100" />
          <div className="mt-5 h-28 animate-pulse rounded-xl bg-neutral-100" />
        </div>
      </main>
    )
  }

  if (portal.isError || !portal.data) {
    return (
      <main className="min-h-screen bg-[#F6F7F4] px-4 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-neutral-100 bg-white p-6 text-center shadow-card">
          <p className="font-semibold text-neutral-800">Link indisponível</p>
          <p className="mt-2 text-sm text-neutral-500">Peça um novo link para a profissional responsável.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F6F7F4] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sage-700">UseCognia</p>
              <h1 className="mt-2 font-display text-2xl font-semibold text-neutral-800">Portal do paciente</h1>
              <p className="mt-1 text-sm text-neutral-500">{professional}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sage-100 bg-sage-50 px-3 py-1.5 text-xs font-semibold text-sage-700">
              <Lock className="h-3.5 w-3.5" />
              Link seguro
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sage-700">
                <UserRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Paciente</p>
                <p className="font-semibold text-neutral-800">{portal.data.patient.name}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-sage-600" />
            <h2 className="text-sm font-semibold text-neutral-800">Próximos horários</h2>
          </div>
          {portal.data.appointments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
              Nenhum horário futuro aparece neste link.
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {portal.data.appointments.map(appointment => (
                <div key={appointment.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-neutral-800">{formatDate(appointment.date)}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {appointment.modality === 'online' ? 'Online' : 'Presencial'}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-neutral-50 px-3 py-1.5 text-sm font-semibold text-neutral-700">
                    <Clock className="h-3.5 w-3.5 text-sage-600" />
                    {appointment.time} · {appointment.duration} min
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-800">Informações para atendimento</h2>
            <p className="mt-1 text-sm text-neutral-500">Preencha ou revise seus dados antes da sessão.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">E-mail</span>
              <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className="label">Telefone</span>
              <input value={form.phone} onChange={e => updateField('phone', e.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className="label">Data de nascimento</span>
              <input type="date" value={form.birthDate} onChange={e => updateField('birthDate', e.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className="label">Pronomes</span>
              <input value={form.pronouns} onChange={e => updateField('pronouns', e.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className="label">Raça/cor</span>
              <input value={form.race} onChange={e => updateField('race', e.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className="label">Gênero</span>
              <input value={form.gender} onChange={e => updateField('gender', e.target.value)} className="input-field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Orientação sexual</span>
              <input value={form.sexualOrientation} onChange={e => updateField('sexualOrientation', e.target.value)} className="input-field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Principal motivo da busca</span>
              <textarea
                rows={4}
                value={form.queixaPrincipal}
                onChange={e => updateField('queixaPrincipal', e.target.value)}
                className="input-field resize-y"
                placeholder="Conte de forma breve o que deseja trabalhar no atendimento."
              />
            </label>
            <label className="block">
              <span className="label">Contato de emergência</span>
              <input value={form.contatoEmergenciaNome} onChange={e => updateField('contatoEmergenciaNome', e.target.value)} className="input-field" />
            </label>
            <label className="block">
              <span className="label">Telefone do contato</span>
              <input value={form.contatoEmergenciaPhone} onChange={e => updateField('contatoEmergenciaPhone', e.target.value)} className="input-field" />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Relação com o contato</span>
              <input value={form.contatoEmergenciaRelacao} onChange={e => updateField('contatoEmergenciaRelacao', e.target.value)} className="input-field" />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-neutral-400">
              As informações serão salvas no cadastro mantido pela profissional responsável.
            </p>
            <button
              type="button"
              onClick={() => saveIntake.mutate(form)}
              disabled={saveIntake.isPending}
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {saveIntake.isPending ? 'Salvando...' : 'Salvar informações'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
