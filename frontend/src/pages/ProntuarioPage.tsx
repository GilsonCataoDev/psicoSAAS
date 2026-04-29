import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Lock, Save, Printer, FileText } from 'lucide-react'
import { usePatient, useUpdatePatient, useSessions, useCreateSession } from '@/hooks/useApi'
import { Prontuario } from '@/types/prontuario'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'identificacao', label: 'Identificação' },
  { id: 'anamnese',      label: 'Anamnese'      },
  { id: 'plano',         label: 'Plano terapêutico' },
  { id: 'evolucao',      label: 'Evolução'      },
] as const

type Tab = typeof TABS[number]['id']

const FIELD = ({
  label, value, onChange, rows, placeholder, readOnly,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  rows?: number
  placeholder?: string
  readOnly?: boolean
}) => (
  <div>
    <label className="label">{label}</label>
    {rows ? (
      <textarea rows={rows} value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="input-field resize-none text-sm" />
    ) : (
      <input value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className="input-field text-sm" />
    )}
  </div>
)

export default function ProntuarioPage() {
  const { id } = useParams()
  const { data: patient } = usePatient(id ?? '')
  const { data: sessions = [] } = useSessions({ patientId: id })
  const createSession = useCreateSession()
  const updatePatient = useUpdatePatient()
  const [evolText, setEvolText] = useState('')
  const [evolDate, setEvolDate] = useState(new Date().toISOString().split('T')[0])
  const [tab, setTab] = useState<Tab>('identificacao')
  const [form, setForm] = useState<Partial<Prontuario>>({})

  // Inicializa form quando o paciente carregar
  useEffect(() => {
    if (patient?.prontuario) {
      setForm(patient.prontuario as Partial<Prontuario>)
    }
  }, [patient?.id])

  function set(field: keyof Prontuario, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function save() {
    if (!id) return
    try {
      await updatePatient.mutateAsync({ id, data: { prontuario: form } })
      toast.success('Prontuário salvo com segurança 🔒')
    } catch {
      toast.error('Erro ao salvar prontuário.')
    }
  }

  if (!patient) return (
    <div className="text-center py-20">
      <p className="text-neutral-500">Pessoa não encontrada.</p>
      <Link to="/pacientes" className="btn-secondary mt-4 inline-flex">Voltar</Link>
    </div>
  )

  return (
    <div className="animate-slide-up space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/pacientes/${id}`}
          className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title">Prontuário</h1>
          <p className="page-subtitle truncate">{patient.name}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2 text-sm hidden sm:flex">
            <Printer className="w-4 h-4" />Imprimir
          </button>
          <Link to={`/documentos?patient=${id}`}
            className="btn-secondary flex items-center gap-2 text-sm hidden sm:flex">
            <FileText className="w-4 h-4" />Documentos
          </Link>
          <button onClick={save} className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Salvar</span>
          </button>
        </div>
      </div>

      {/* LGPD banner */}
      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-sm text-amber-700">
        <Lock className="w-4 h-4 shrink-0" />
        <span>Prontuário protegido por criptografia AES-256 · Acesso exclusivo do profissional responsável · CFP Res. 001/2009</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-none sm:flex-1 px-3 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-white text-neutral-800 shadow-sm font-medium'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Identificação ── */}
      {tab === 'identificacao' && (
        <div className="space-y-5">
          <div className="card space-y-4">
            <h2 className="section-title">Dados pessoais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FIELD label="Nome completo" value={patient.name} readOnly />
              <FIELD label="Data de nascimento" value={patient.birthDate ? formatDate(patient.birthDate) : '—'} readOnly />
              <FIELD label="Pronomes" value={patient.pronouns ?? '—'} readOnly />
              <FIELD label="E-mail" value={patient.email ?? '—'} readOnly />
              <FIELD label="Telefone" value={patient.phone ?? '—'} readOnly />
              <FIELD label="Escolaridade"
                value={form.escolaridade ?? ''}
                onChange={v => set('escolaridade', v)}
                placeholder="Ex: Superior completo" />
              <FIELD label="Profissão"
                value={form.profissao ?? ''}
                onChange={v => set('profissao', v)}
                placeholder="Ex: Designer" />
              <FIELD label="Estado civil"
                value={form.estadoCivil ?? ''}
                onChange={v => set('estadoCivil', v)}
                placeholder="Ex: Solteira(o)" />
              <FIELD label="Religião / espiritualidade"
                value={form.religiao ?? ''}
                onChange={v => set('religiao', v)}
                placeholder="Opcional" />
            </div>
          </div>

          <div className="card space-y-4">
            <h2 className="section-title">Contato de emergência</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FIELD label="Nome"
                value={form.contatoEmergenciaNome ?? ''}
                onChange={v => set('contatoEmergenciaNome', v)}
                placeholder="Nome completo" />
              <FIELD label="Telefone"
                value={form.contatoEmergenciaPhone ?? ''}
                onChange={v => set('contatoEmergenciaPhone', v)}
                placeholder="(11) 99999-0000" />
              <FIELD label="Relação"
                value={form.contatoEmergenciaRelacao ?? ''}
                onChange={v => set('contatoEmergenciaRelacao', v)}
                placeholder="Ex: Mãe, cônjuge..." />
            </div>
          </div>
        </div>
      )}

      {/* ── Anamnese ── */}
      {tab === 'anamnese' && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <h2 className="section-title">Queixa e histórico</h2>
            <FIELD label="Queixa principal" rows={3}
              value={form.queixaPrincipal ?? ''}
              onChange={v => set('queixaPrincipal', v)}
              placeholder="Motivo que trouxe a pessoa ao atendimento..." />
            <FIELD label="História da doença / situação atual" rows={4}
              value={form.historicoDoenca ?? ''}
              onChange={v => set('historicoDoenca', v)}
              placeholder="Evolução dos sintomas, contexto de surgimento..." />
          </div>

          <div className="card space-y-4">
            <h2 className="section-title">Antecedentes</h2>
            <FIELD label="Antecedentes pessoais (saúde mental)" rows={3}
              value={form.antecedentesPessoais ?? ''}
              onChange={v => set('antecedentesPessoais', v)}
              placeholder="Histórico de tratamentos anteriores, hospitalizações..." />
            <FIELD label="Histórico familiar" rows={3}
              value={form.historicoFamiliar ?? ''}
              onChange={v => set('historicoFamiliar', v)}
              placeholder="Doenças mentais na família, dinâmicas relevantes..." />
          </div>

          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="section-title mb-0">Saúde física</h2>
              <Lock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <FIELD label="Medicamentos em uso" rows={2}
              value={form.medicamentos ?? ''}
              onChange={v => set('medicamentos', v)}
              placeholder="Nome, dosagem, prescritor..." />
            <FIELD label="Condições médicas / diagnósticos" rows={2}
              value={form.condicoesMedicas ?? ''}
              onChange={v => set('condicoesMedicas', v)}
              placeholder="Doenças crónicas, cirurgias relevantes..." />
          </div>
        </div>
      )}

      {/* ── Plano terapêutico ── */}
      {tab === 'plano' && (
        <div className="card space-y-4">
          <h2 className="section-title">Plano terapêutico</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FIELD label="Abordagem teórica"
              value={form.abordagem ?? ''}
              onChange={v => set('abordagem', v)}
              placeholder="Ex: TCC, Psicanálise, Gestalt..." />
            <FIELD label="Frequência das sessões"
              value={form.frequencia ?? ''}
              onChange={v => set('frequencia', v)}
              placeholder="Ex: Semanal (50 min)" />
            <FIELD label="Duração prevista do tratamento"
              value={form.duracaoPrevista ?? ''}
              onChange={v => set('duracaoPrevista', v)}
              placeholder="Ex: 6 a 12 meses" />
          </div>
          <FIELD label="Objetivos terapêuticos" rows={4}
            value={form.objetivos ?? ''}
            onChange={v => set('objetivos', v)}
            placeholder="Metas acordadas com a pessoa em atendimento..." />
          <div className="bg-sage-50 border border-sage-100 rounded-2xl p-4">
            <p className="text-xs text-sage-700 font-medium mb-1">📌 Início do acompanhamento</p>
            <p className="text-sm text-sage-800">{formatDate(patient.startDate)}</p>
          </div>
        </div>
      )}

      {/* ── Evolução ── */}
      {tab === 'evolucao' && (
        <div className="space-y-4">
          <div className="card bg-amber-50 border-amber-100">
            <div className="flex items-center gap-2 text-amber-700 text-sm">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Registros de evolução são criptografados. Somente você tem acesso.</span>
            </div>
          </div>

          {/* Nova entrada */}
          <div className="card space-y-3">
            <h2 className="section-title">Nova evolução</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Data</label>
                <input type="date" value={evolDate} onChange={e => setEvolDate(e.target.value)}
                  className="input-field text-sm" />
              </div>
              <div>
                <label className="label">Sessão Nº</label>
                <input type="number" value={sessions.length + 1} readOnly className="input-field text-sm bg-neutral-50" />
              </div>
            </div>
            <div>
              <label className="label">Descrição da sessão</label>
              <textarea rows={5} value={evolText} onChange={e => setEvolText(e.target.value)}
                className="input-field resize-none text-sm"
                placeholder="Descreva o conteúdo trabalhado, observações clínicas, intercorrências, resposta da pessoa ao processo terapêutico..." />
            </div>
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  if (!id || !evolText.trim()) return
                  try {
                    await createSession.mutateAsync({
                      patientId: id,
                      date: evolDate,
                      summary: evolText,
                      duration: patient?.sessionDuration ?? 50,
                      paymentStatus: 'pending',
                    } as any)
                    setEvolText('')
                    toast.success('Evolução registrada 🔒')
                  } catch { toast.error('Erro ao salvar evolução.') }
                }}
                disabled={createSession.isPending}
                className="btn-primary text-sm flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />Salvar evolução
              </button>
            </div>
          </div>

          {/* Histórico real de sessões */}
          {sessions.map((s, i) => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-sage-700 bg-sage-50 px-2 py-0.5 rounded-lg">
                  Sessão {sessions.length - i}
                </span>
                <span className="text-xs text-neutral-400">{formatDate(s.date)}</span>
              </div>
              {s.summary
                ? <p className="text-sm text-neutral-600 leading-relaxed">{s.summary}</p>
                : <p className="text-sm text-neutral-400 italic">Sem anotações registradas.</p>
              }
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="card text-center py-8 text-neutral-400 text-sm">
              Nenhuma sessão registrada ainda.
            </div>
          )}
        </div>
      )}

      {/* Save button mobile */}
      <div className="sm:hidden flex gap-2">
        <button onClick={() => window.print()} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
          <Printer className="w-4 h-4" />Imprimir
        </button>
        <button onClick={save} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
          <Save className="w-4 h-4" />Salvar
        </button>
      </div>
    </div>
  )
}
