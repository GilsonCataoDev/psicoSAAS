import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, Download, X, MessageSquare, Repeat2, Pause, Play, Trash2,
  Star, Layers3, Activity, AlertTriangle, Send, ClipboardCheck,
  TrendingUp, Clock3, CheckCircle2, Filter,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import {
  useCreateInstrumentAssignment,
  useDeleteInstrumentSchedule,
  useInstrumentAssignments,
  useInstrumentSchedules,
  useSetInstrumentScheduleActive,
  usePatients,
  type InstrumentAssignment,
} from '@/hooks/useApi'
import LightweightChart from '@/components/ui/LightweightChart'
import { cn } from '@/lib/utils'
import { formatDate as formatUiDate } from '@/lib/utils'
import { getCriticalResponses, interpretScaleResult, SCALE_CONFIGS } from '@/lib/scale-scoring'
import { buildScaleEvolutionSeries } from '@/lib/patient-detail-summary'
import {
  BATTERIES,
  CARD_ACCENTS,
  CAT_COLOR,
  CAT_LABEL,
  instrumentsFor,
} from '@/features/instruments/instrument-catalog'
import { useAuthStore } from '@/store/auth'
import { hasPsychologyModules } from '@/lib/professions'
import type {
  AgeGroup,
  Instrument,
  InstrumentCategory,
} from '@/features/instruments/instrument-catalog'

function renderLine(line: string, idx: number) {
  if (!line.trim()) return <div key={idx} className="h-2" />

  const isHeader =
    line === line.toUpperCase() &&
    line.trim().length > 2 &&
    /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÜÇ\s/—]+$/.test(line.trim())

  if (isHeader) {
    return (
      <div key={idx} className="flex items-center gap-3 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 whitespace-nowrap">
          {line.trim()}
        </p>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
    )
  }

  const colonIdx = line.indexOf(':')
  if (colonIdx > 0) {
    const label = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    return (
      <div key={idx} className="grid grid-cols-[180px_1fr] gap-3 items-end py-1 border-b border-dashed border-neutral-150">
        <span className="text-[11px] font-semibold text-neutral-500 pb-0.5 leading-tight">{label}</span>
        <span className="text-sm text-neutral-700 pb-0.5 min-h-[1.5rem]">
          {value || <span className="text-neutral-200 select-none">_</span>}
        </span>
      </div>
    )
  }

  return (
    <p key={idx} className="text-xs text-neutral-400 italic py-0.5">
      {line}
    </p>
  )
}

// ── Modal de instrumento ─────────────────────────────────────────────────────

function InstrumentModal({
  instrument,
  onClose,
  onSend,
}: {
  instrument: Instrument | null
  onClose: () => void
  onSend: (instrument: Instrument) => void
}) {
  if (!instrument) return null

  const inst = instrument   // narrowed local — TypeScript carries this into closures
  const lines = inst.template.split('\n')
  const fieldCount = lines.filter(l => l.trim().endsWith(':')).length

  function escHtml(v: string) {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function printInstrument() {
    const rows = lines.map(line => {
      if (!line.trim()) return '<div style="height:8px"></div>'
      const isHeader =
        line === line.toUpperCase() &&
        line.trim().length > 2 &&
        /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÜÇ\s/—]+$/.test(line.trim())
      if (isHeader) {
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0 4px">
          <span style="font-size:8.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;white-space:nowrap">${escHtml(line.trim())}</span>
          <div style="flex:1;height:1px;background:#d1d5db"></div></div>`
      }
      const ci = line.indexOf(':')
      if (ci > 0) {
        const label = escHtml(line.slice(0, ci).trim())
        const value = escHtml(line.slice(ci + 1).trim())
        return `<div style="display:grid;grid-template-columns:170px 1fr;gap:8px;padding:5px 0;border-bottom:1px dashed #e5e7eb">
          <span style="font-size:9px;font-weight:600;color:#6b7280;padding-top:2px">${label}</span>
          <span style="font-size:11px;color:#374151;padding-bottom:3px">${value || ''}</span></div>`
      }
      return `<p style="font-size:9px;color:#9ca3af;font-style:italic;margin:2px 0">${escHtml(line)}</p>`
    }).join('')

    const catLabel = CAT_LABEL[inst.category]
    const html = `<!doctype html><html><head><title>${escHtml(inst.title)}</title>
<style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}
html,body{width:210mm;min-height:297mm;margin:0;background:#fff;font-family:Arial,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
.badge{display:inline-block;font-size:8px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid #d1d5db;color:#374151;margin-top:4px}
</style>
</head><body><div>
<div class="header">
  <p style="font-size:14px;font-weight:700;margin:0 0 2px">${escHtml(inst.title)}</p>
  <p style="font-size:9.5px;color:#6b7280;margin:0 0 4px">${escHtml(inst.description)}</p>
  <span class="badge">${escHtml(catLabel)}</span>
  <span class="badge" style="margin-left:4px">${fieldCount} campos</span>
  <span class="badge" style="margin-left:4px">Profissional: ___________________________ | CRP: ____________ | Data: ____/____/____</span>
</div>
${rows}
<p style="font-size:8px;color:#9ca3af;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:8px">Instrumento de apoio clínico · não substitui prontuário oficial · UseCognia</p>
</div></body></html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.opener = null
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      setTimeout(() => { printWindow.focus(); printWindow.print() }, 250)
      return
    }

    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      iframe.remove()
      toast.error('Não foi possível abrir a impressão neste navegador.')
      return
    }

    doc.open()
    doc.write(html)
    doc.close()
    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => iframe.remove(), 1000)
    }, 250)
  }

  return (
    <Modal open={!!instrument} onClose={onClose} title={instrument.title} size="lg">
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <instrument.Icon className="w-5 h-5 text-sage-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-600 leading-relaxed">{instrument.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[instrument.category]}`}>
                {CAT_LABEL[instrument.category]}
              </span>
              {instrument.tags.map(t => (
                <span key={t} className="text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs text-neutral-400 shrink-0">{fieldCount} campos</span>
        </div>

        {/* Formulário */}
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sage-400" />
              <span className="text-xs font-medium text-neutral-500">Formulário para preenchimento</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span>Profissional: <span className="inline-block w-24 border-b border-neutral-300">&nbsp;</span></span>
              <span>Data: <span className="inline-block w-16 border-b border-neutral-300">&nbsp;</span></span>
            </div>
          </div>
          <div className="px-5 py-4 space-y-0.5 max-h-[50vh] overflow-y-auto">
            {lines.map((line, idx) => renderLine(line, idx))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400">
            Instrumento de apoio clínico · não substitui prontuário oficial
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Fechar</button>
            <button type="button" onClick={() => onSend(inst)} className="btn-secondary text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Enviar formulário
            </button>
            <button type="button" onClick={printInstrument} className="btn-primary text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Card de instrumento ──────────────────────────────────────────────────────

function InstrumentCard({
  instrument,
  index,
  onClick,
  favorite,
  onToggleFavorite,
}: {
  instrument: Instrument
  index: number
  onClick: () => void
  favorite: boolean
  onToggleFavorite: () => void
}) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const fieldCount = instrument.template.split('\n').filter(l => l.trim().endsWith(':')).length

  return (
    <div className="card group flex flex-col items-start gap-3 p-4 text-left transition-all duration-200 hover:-translate-y-px hover:border-sage-200 hover:shadow-lifted">
      <div className="flex w-full items-start justify-between gap-2">
        <button
          type="button"
          onClick={onClick}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${accent}`}
          title="Abrir instrumento"
        >
          <instrument.Icon className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onToggleFavorite}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            favorite ? 'bg-amber-50 text-amber-500' : 'text-neutral-300 hover:bg-neutral-50 hover:text-amber-500',
          )}
          title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
        >
          <Star className={cn('h-4 w-4', favorite && 'fill-current')} />
        </button>
      </div>

      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={onClick} className="text-left">
            <p className="text-sm font-semibold text-neutral-800 leading-tight group-hover:text-sage-700">{instrument.title}</p>
          </button>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLOR[instrument.category]}`}>
            {CAT_LABEL[instrument.category]}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-neutral-400 line-clamp-2">{instrument.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {instrument.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] text-neutral-400 bg-neutral-50 border border-neutral-100 px-1.5 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-between pt-1 border-t border-neutral-100">
        <span className="text-[11px] text-neutral-300">{fieldCount} campos</span>
        <button type="button" onClick={onClick} className="text-xs font-medium text-sage-600 group-hover:text-sage-700">
          Abrir →
        </button>
      </div>
    </div>
  )
}

// ── Recorrências ativas ──────────────────────────────────────────────────────

const RECURRENCE_LABEL: Record<string, string> = {
  weekly: 'Toda semana',
  biweekly: 'De 15 em 15 dias',
  monthly: 'Todo mês',
}

function ScheduleList() {
  const { data: schedules = [] } = useInstrumentSchedules()
  const setActive = useSetInstrumentScheduleActive()
  const deleteSchedule = useDeleteInstrumentSchedule()

  if (schedules.length === 0) return null

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Repeat2 className="w-4 h-4 text-sage-600" />
        <p className="text-sm font-semibold text-neutral-800">Recorrências ativas</p>
        <span className="text-xs text-neutral-400">({schedules.length})</span>
      </div>
      <div className="divide-y divide-neutral-100">
        {schedules.map(schedule => (
          <div key={schedule.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-700 truncate">
                {schedule.title} — {schedule.patientName ?? 'Paciente'}
              </p>
              <p className="text-xs text-neutral-400">
                {RECURRENCE_LABEL[schedule.recurrence] ?? schedule.recurrence}
                {schedule.active ? ` • próximo envio em ${new Date(schedule.nextSendAt).toLocaleDateString('pt-BR')}` : ' • pausada'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                title={schedule.active ? 'Pausar' : 'Retomar'}
                onClick={() => setActive.mutate({ id: schedule.id, active: !schedule.active })}
                disabled={setActive.isPending}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-sage-600 hover:bg-sage-50"
              >
                {schedule.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                type="button"
                title="Cancelar recorrência"
                onClick={() => {
                  if (confirm('Cancelar esta recorrência? O envio automático para.')) {
                    deleteSchedule.mutate(schedule.id)
                  }
                }}
                disabled={deleteSchedule.isPending}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

function InstrumentOpsDashboard({ assignments }: { assignments: InstrumentAssignment[] }) {
  const completed = assignments.filter(item => item.status === 'completed')
  const pending = assignments.filter(item => item.status === 'pending')
  const expired = assignments.filter(item => item.status === 'expired')
  const critical = completed.filter(item => getCriticalResponses(item.instrumentId, item.answers).length > 0)
  const series = buildScaleEvolutionSeries(assignments).slice(0, 2)
  const responseRate = assignments.length ? Math.round((completed.length / assignments.length) * 100) : 0

  return (
    <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Painel de instrumentos</h2>
            <p className="text-xs text-neutral-400">Envios, pendencias e pontos criticos em um lugar.</p>
          </div>
          <span className="rounded-full bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-700">{responseRate}% resposta</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Enviados', value: assignments.length, icon: Send, color: 'text-sage-600' },
            { label: 'Respondidos', value: completed.length, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Pendentes', value: pending.length, icon: Clock3, color: 'text-amber-600' },
            { label: 'Criticos', value: critical.length, icon: AlertTriangle, color: 'text-rose-600' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3">
              <item.icon className={`mb-2 h-4 w-4 ${item.color}`} />
              <p className="text-xl font-semibold text-neutral-800">{item.value}</p>
              <p className="text-xs text-neutral-400">{item.label}</p>
            </div>
          ))}
        </div>
        {expired.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {expired.length} link{expired.length === 1 ? '' : 's'} vencido{expired.length === 1 ? '' : 's'} aguardando reenvio.
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-mist-600" />
          <h2 className="section-title">Evolucao de escores</h2>
        </div>
        {series.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-400">Escalas respondidas em sequencia aparecem aqui.</p>
        ) : series.map(item => {
          const thresholds = SCALE_CONFIGS[item.instrumentId]?.thresholds
          const maxScore = thresholds?.[thresholds.length - 1]?.max
          return (
            <div key={item.instrumentId} className="rounded-xl border border-neutral-100 p-3">
              <p className="mb-2 text-xs font-semibold text-neutral-500">{item.title}</p>
              <LightweightChart data={item.points} height={82} color="#4DA8DA" fillOpacity={0.1} min={0} max={maxScore} showYAxis />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ObjectiveAndBatteryPanel({
  objective,
  selectedBattery,
  onObjective,
  onBattery,
  showBatteries,
}: {
  objective: typeof OBJECTIVES[number]['value']
  selectedBattery: string
  onObjective: (value: typeof OBJECTIVES[number]['value']) => void
  onBattery: (value: string) => void
  showBatteries: boolean
}) {
  return (
    <div className={showBatteries ? 'grid gap-3 lg:grid-cols-[1.2fr_1fr]' : 'grid gap-3'}>
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-sage-600" />
          <h2 className="section-title">Biblioteca por objetivo</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {OBJECTIVES.map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => { onObjective(item.value); onBattery('') }}
              className={cn(
                'rounded-xl border px-3 py-2 text-left transition-colors',
                objective === item.value
                  ? 'border-sage-300 bg-sage-50 text-sage-800'
                  : 'border-neutral-100 bg-white text-neutral-600 hover:border-sage-200',
              )}
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-neutral-400">{item.hint}</p>
            </button>
          ))}
        </div>
      </div>

      {/* As baterias combinam instrumentos de psicologia — não fazem sentido em outras profissões. */}
      {showBatteries && (
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-mist-600" />
          <h2 className="section-title">Modelos de bateria</h2>
        </div>
        <div className="space-y-2">
          {BATTERIES.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onBattery(selectedBattery === item.id ? '' : item.id)}
              className={cn(
                'w-full rounded-xl border px-3 py-2 text-left transition-colors',
                selectedBattery === item.id
                  ? 'border-mist-300 bg-mist-50 text-mist-800'
                  : 'border-neutral-100 bg-white text-neutral-600 hover:border-mist-200',
              )}
            >
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-neutral-400">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
      )}
    </div>
  )
}

function AssignmentHistory({
  assignments,
  statusFilter,
  patientFilter,
  onStatusFilter,
  onPatientFilter,
}: {
  assignments: InstrumentAssignment[]
  statusFilter: InstrumentAssignment['status'] | 'all'
  patientFilter: string
  onStatusFilter: (value: InstrumentAssignment['status'] | 'all') => void
  onPatientFilter: (value: string) => void
}) {
  const patientOptions = Array.from(new Map(assignments
    .filter(item => item.patientId && item.patientName)
    .map(item => [item.patientId, item.patientName] as const)).entries())
  const filtered = assignments
    .filter(item => statusFilter === 'all' || item.status === statusFilter)
    .filter(item => patientFilter === 'all' || item.patientId === patientFilter)
    .slice(0, 12)

  return (
    <div className="card space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-sage-600" />
          <h2 className="section-title">Historico e status dos envios</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={e => onStatusFilter(e.target.value as InstrumentAssignment['status'] | 'all')} className="input-field h-9 py-1 text-xs sm:w-36">
            <option value="all">Todos status</option>
            <option value="pending">Pendentes</option>
            <option value="completed">Respondidos</option>
            <option value="expired">Vencidos</option>
          </select>
          <select value={patientFilter} onChange={e => onPatientFilter(e.target.value)} className="input-field h-9 py-1 text-xs sm:w-44">
            <option value="all">Todos pacientes</option>
            {patientOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-400">Nenhum envio encontrado.</p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {filtered.map(item => {
            const critical = getCriticalResponses(item.instrumentId, item.answers)
            const scoreBadge = getScoreBadge(item)
            return (
              <div key={item.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-neutral-800">{item.title}</p>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      item.status === 'completed' && 'bg-emerald-50 text-emerald-700',
                      item.status === 'pending' && 'bg-amber-50 text-amber-700',
                      item.status === 'expired' && 'bg-neutral-100 text-neutral-500',
                    )}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    {critical.length > 0 && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Critico</span>
                    )}
                    {scoreBadge && (
                      <span className="rounded-full bg-mist-50 px-2 py-0.5 text-[11px] font-semibold text-mist-700">{scoreBadge}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-400">
                    {item.patientName ?? 'Paciente'} - {item.status === 'completed' ? 'respondido' : 'enviado'} em {formatUiDate(item.completedAt ?? item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {item.patientId && (
                    <Link to={`/pacientes/${item.patientId}`} className="btn-secondary px-3 py-1.5 text-xs">Paciente</Link>
                  )}
                  {item.status === 'completed' && (
                    <button type="button" onClick={() => printAssignment(item)} className="btn-secondary px-3 py-1.5 text-xs">
                      PDF
                    </button>
                  )}
                  {item.status === 'pending' && item.url && (
                    <button
                      type="button"
                      onClick={async () => { await navigator.clipboard.writeText(item.url ?? ''); toast.success('Link copiado.') }}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      Copiar link
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ALL_CATEGORIES: Array<{ value: InstrumentCategory | 'all'; label: string }> = [
  { value: 'all',        label: 'Todos' },
  { value: 'formulario', label: 'Formulários' },
  { value: 'escala',     label: 'Escalas' },
  { value: 'registro',   label: 'Registros' },
  { value: 'entrevista', label: 'Entrevistas' },
]

const ALL_AGES: Array<{ value: AgeGroup | 'all'; label: string }> = [
  { value: 'all',         label: 'Todas as idades' },
  { value: 'infantil',    label: 'Infantil' },
  { value: 'adolescente', label: 'Adolescente' },
  { value: 'adulto',      label: 'Adulto' },
]

const OBJECTIVES = [
  { value: 'all', label: 'Todos', hint: 'Biblioteca completa', terms: [] },
  { value: 'initial', label: 'Rastreio inicial', hint: 'Primeira avaliação', terms: ['anamnese', 'avaliação inicial', 'avaliacao inicial', 'queixa'] },
  { value: 'anxiety', label: 'Ansiedade', hint: 'Sintomas ansiosos', terms: ['ansiedade', 'gad', 'medo', 'pânico', 'panico', 'estresse'] },
  { value: 'mood', label: 'Humor', hint: 'Depressão e humor', terms: ['depress', 'humor', 'phq', 'tristeza'] },
  { value: 'progress', label: 'Acompanhamento', hint: 'Evolução clínica', terms: ['registro', 'monitoramento', 'acompanhamento', 'evolução', 'evolucao'] },
  { value: 'child', label: 'Infantojuvenil', hint: 'Crianças e adolescentes', terms: ['infantil', 'adolescente', 'criança', 'crianca'] },
  { value: 'neuro', label: 'Neuropsicologia', hint: 'Atenção, memória e TDAH', terms: ['neuro', 'tdah', 'atenção', 'atencao', 'memória', 'memoria', 'cognitivo'] },
] as const


const STATUS_LABEL: Record<InstrumentAssignment['status'], string> = {
  pending: 'Pendente',
  completed: 'Respondido',
  expired: 'Vencido',
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function matchesObjective(instrument: Instrument, objective: typeof OBJECTIVES[number]['value']) {
  if (objective === 'all') return true
  const config = OBJECTIVES.find(item => item.value === objective)
  if (!config) return true
  const haystack = normalizeText([
    instrument.title,
    instrument.description,
    instrument.category,
    ...instrument.tags,
  ].join(' '))
  return config.terms.some(term => haystack.includes(normalizeText(term)))
}

function getScoreBadge(response: InstrumentAssignment) {
  if (response.score == null) return null
  const interpretation = interpretScaleResult(response.instrumentId, response.score, response.scoreDetails, response.answers)
  if (!interpretation) return `Score ${response.score}`
  return interpretation.level
    ? `${interpretation.score} - ${interpretation.level.label}`
    : `Score ${interpretation.score}`
}

function printAssignment(response: InstrumentAssignment) {
  const safe = (value?: string | null) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const scaleConfig = SCALE_CONFIGS[response.instrumentId]
  let rows: string
  if (scaleConfig && response.answers) {
    const answerLabel = (itemId: string) => {
      const raw = response.answers?.[itemId]
      const item = scaleConfig.items.find(i => i.id === itemId)
      const option = (item?.options ?? scaleConfig.options).find(o => String(o.value) === raw)
      return option ? `${option.value} — ${option.label}` : (raw ?? '')
    }
    const itemRows = scaleConfig.items.map(item => `<tr><th>${safe(item.label)}</th><td>${safe(answerLabel(item.id))}</td></tr>`).join('')
    const interpretation = interpretScaleResult(response.instrumentId, response.score, response.scoreDetails, response.answers)
    const summaryRows = interpretation
      ? `<tr><th>Pontuação total</th><td>${safe(String(interpretation.score))}${interpretation.level ? ` — ${safe(interpretation.level.label)}` : ''}</td></tr>`
      : ''
    rows = itemRows + summaryRows
  } else {
    rows = response.fields.length && response.answers
      ? response.fields.map(field => `<tr><th>${safe(field.label)}</th><td>${safe(response.answers?.[field.id])}</td></tr>`).join('')
      : `<tr><td colspan="2"><pre>${safe(response.responseText)}</pre></td></tr>`
  }
  const html = `<!doctype html><html><head><title>${safe(response.title)}</title>
<style>
@page{size:A4;margin:18mm}body{font-family:Arial,sans-serif;color:#111}h1{font-size:18px;margin:0 0 6px}p{font-size:12px;color:#555}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top;font-size:12px}th{width:34%;color:#555}pre{white-space:pre-wrap;font-family:Arial,sans-serif}
</style></head><body><h1>${safe(response.title)}</h1><p>Paciente: ${safe(response.patientName ?? 'Paciente')} | Respondido em: ${safe(formatUiDate(response.completedAt ?? response.createdAt))}</p><table>${rows}</table></body></html>`
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    toast.error('Nao foi possivel abrir a impressao.')
    return
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  setTimeout(() => { printWindow.focus(); printWindow.print() }, 250)
}

function SendInstrumentModal({
  instrument,
  onClose,
}: {
  instrument: Instrument | null
  onClose: () => void
}) {
  const { data: patients = [] } = usePatients({ enabled: !!instrument })
  const createAssignment = useCreateInstrumentAssignment()
  const [patientId, setPatientId] = useState('')
  const [sendWhatsApp, setSendWhatsApp] = useState(true)
  const [extraAnamneseQuestions, setExtraAnamneseQuestions] = useState('')
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>('none')
  const selectedPatient = patients.find(p => p.id === patientId)
  const shouldSendWhatsApp = sendWhatsApp && !!selectedPatient?.phone
  const isAnamnese = instrument?.tags.some(tag => tag.toLowerCase() === 'anamnese') ?? false

  useEffect(() => {
    setExtraAnamneseQuestions('')
    setRecurrence('none')
  }, [instrument?.id])

  function templateWithExtraAnamneseQuestions() {
    if (!instrument) return ''
    const questions = extraAnamneseQuestions
      .split('\n')
      .map(line => line.trim().replace(/:+$/, ''))
      .filter(Boolean)

    if (questions.length === 0) return instrument.template

    return [
      instrument.template.trimEnd(),
      '',
      isAnamnese ? 'PERGUNTAS EXTRAS DA ANAMNESE' : 'PERGUNTAS EXTRAS PERSONALIZADAS',
      ...questions.map(question => `${question}:`),
    ].join('\n')
  }

  async function send() {
    if (!instrument || !patientId) return
    try {
      const result = await createAssignment.mutateAsync({
        patientId,
        instrumentId: instrument.id,
        title: instrument.title,
        description: instrument.description,
        category: instrument.category,
        template: templateWithExtraAnamneseQuestions(),
        sendWhatsApp: shouldSendWhatsApp,
        recurrence: recurrence === 'none' ? undefined : recurrence,
      })

      const recurrenceNote = recurrence !== 'none' ? ' • recorrência ativada' : ''
      if (!shouldSendWhatsApp) {
        if (result.url) await navigator.clipboard.writeText(result.url)
        toast.success(`Link copiado para a área de transferência${recurrenceNote}`)
      } else if (result.whatsAppSent) {
        toast.success(`Formulário enviado via WhatsApp${recurrenceNote}`)
      } else {
        // Formulário criado mas WhatsApp não enviou — copia o link como fallback
        if (result.url) await navigator.clipboard.writeText(result.url)
        const motivo = result.whatsAppError ?? 'WhatsApp não configurado'
        toast(`Link copiado — ${motivo}`, { icon: '⚠️' })
      }
      onClose()
    } catch {
      toast.error('Nao foi possivel enviar o formulario.')
    }
  }

  return (
    <Modal open={!!instrument} onClose={onClose} title="Enviar formulário" size="md">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="text-sm font-semibold text-neutral-800">{instrument?.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{instrument?.description}</p>
        </div>

        <label className="block">
          <span className="label">Paciente</span>
          <select value={patientId} onChange={e => setPatientId(e.target.value)} className="input-field">
            <option value="">Selecione um paciente</option>
            {patients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name}{patient.phone ? ` - ${patient.phone}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
            <span className="label">{isAnamnese ? 'Perguntas extras da anamnese' : 'Perguntas extras personalizadas'}</span>
            <textarea
              value={extraAnamneseQuestions}
              onChange={e => setExtraAnamneseQuestions(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="Uma pergunta por linha. Ex: Como costuma dormir?"
              className="input-field min-h-[110px] resize-y"
            />
            <span className="mt-1 block text-xs text-neutral-400">
              Essas perguntas entram só neste link enviado para o paciente.
            </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-4">
          <input
            type="checkbox"
            checked={sendWhatsApp}
            onChange={e => setSendWhatsApp(e.target.checked)}
            disabled={!selectedPatient?.phone}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-neutral-700">Enviar direto pelo WhatsApp</span>
            <span className="mt-0.5 block text-xs text-neutral-400">
              {selectedPatient?.phone ? `O link será enviado para ${selectedPatient.phone}.` : 'Paciente sem telefone cadastrado; o link será copiado.'}
            </span>
          </span>
        </label>

        <label className="block">
          <span className="label flex items-center gap-1.5">
            <Repeat2 className="w-3.5 h-3.5 text-neutral-400" />
            Repetir envio
          </span>
          <select
            value={recurrence}
            onChange={e => setRecurrence(e.target.value as typeof recurrence)}
            className="input-field"
          >
            <option value="none">Não repetir (só esta vez)</option>
            <option value="weekly">Toda semana</option>
            <option value="biweekly">De 15 em 15 dias</option>
            <option value="monthly">Todo mês</option>
          </select>
          {recurrence !== 'none' && (
            <span className="mt-1 block text-xs text-neutral-400">
              Um novo link é gerado e enviado automaticamente na frequência escolhida, sem você precisar lembrar. Pode pausar ou cancelar depois.
            </span>
          )}
        </label>

        <div className="rounded-xl border border-sage-100 bg-sage-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-sage-800">
            O link expira em 7 dias e fica vinculado a este paciente. Depois do envio, a resposta aparece no prontuário.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            type="button"
            onClick={send}
            disabled={!patientId || createAssignment.isPending}
            className="btn-primary text-sm"
          >
            {createAssignment.isPending ? 'Enviando...' : shouldSendWhatsApp ? 'Enviar' : 'Gerar link'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function InstrumentosPage() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<InstrumentCategory | 'all'>('all')
  const [ageFilter, setAgeFilter] = useState<AgeGroup | 'all'>('all')
  const [objective, setObjective] = useState<typeof OBJECTIVES[number]['value']>('all')
  const [selectedBattery, setSelectedBattery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InstrumentAssignment['status'] | 'all'>('all')
  const [patientFilter, setPatientFilter] = useState('all')
  const [selected, setSelected] = useState<Instrument | null>(null)
  const [sendingInstrument, setSendingInstrument] = useState<Instrument | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('usecognia.instrumentFavorites') ?? '[]')
    } catch {
      return []
    }
  })
  const { data: assignments = [] } = useInstrumentAssignments()

  useEffect(() => {
    window.localStorage.setItem('usecognia.instrumentFavorites', JSON.stringify(favoriteIds))
  }, [favoriteIds])

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds])
  const selectedBatteryConfig = BATTERIES.find(item => item.id === selectedBattery)
  const profession = useAuthStore(s => s.user?.profession)
  const catalog = useMemo(() => instrumentsFor(profession), [profession])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return catalog.filter(inst => {
      const matchBattery = !selectedBatteryConfig || (selectedBatteryConfig.instrumentIds as readonly string[]).includes(inst.id)
      const matchObjective = matchesObjective(inst, objective)
      const matchCat  = catFilter === 'all' || inst.category === catFilter
      const matchAge  = ageFilter === 'all' || inst.ageGroups.includes(ageFilter as AgeGroup) || inst.ageGroups.includes('all')
      const matchQ    = !q || inst.title.toLowerCase().includes(q) || inst.description.toLowerCase().includes(q) || inst.tags.some(t => t.toLowerCase().includes(q))
      return matchBattery && matchObjective && matchCat && matchAge && matchQ
    }).sort((a, b) => Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id)))
  }, [catalog, search, catFilter, ageFilter, objective, selectedBatteryConfig, favoriteSet])

  function toggleFavorite(id: string) {
    setFavoriteIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id])
  }

  const criticalAssignments = assignments.filter(item => getCriticalResponses(item.instrumentId, item.answers).length > 0)
  const pendingAssignments = assignments.filter(item => item.status === 'pending')
  const nextStep = criticalAssignments.length > 0
    ? `${criticalAssignments.length} resposta com ponto critico para revisar.`
    : pendingAssignments.length > 0
      ? `${pendingAssignments.length} formulario pendente para acompanhar.`
      : favoriteIds.length === 0
        ? 'Marque favoritos para acelerar seus envios mais comuns.'
        : 'Biblioteca pronta para novos envios.'

  return (
    <div className="animate-slide-up space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Instrumentos Clínicos</h1>
        <p className="page-subtitle">Formulários, escalas e registros para apoio clínico</p>
      </div>

      <ScheduleList />
      <InstrumentOpsDashboard assignments={assignments} />

      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-sage-600" />
          <div>
            <p className="text-sm font-semibold text-neutral-800">Proximo passo sugerido</p>
            <p className="text-xs text-neutral-400">{nextStep}</p>
          </div>
        </div>
        {criticalAssignments[0]?.patientId ? (
          <Link to={`/pacientes/${criticalAssignments[0].patientId}`} className="btn-secondary text-sm">Revisar agora</Link>
        ) : null}
      </div>

      <ObjectiveAndBatteryPanel
        objective={objective}
        selectedBattery={selectedBattery}
        onObjective={setObjective}
        onBattery={(value) => {
          setSelectedBattery(value)
          if (value) setObjective('all')
        }}
        showBatteries={hasPsychologyModules(profession)}
      />

      <AssignmentHistory
        assignments={assignments}
        statusFilter={statusFilter}
        patientFilter={patientFilter}
        onStatusFilter={setStatusFilter}
        onPatientFilter={setPatientFilter}
      />

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, descrição ou assunto..."
          className="input-field pl-9 py-2.5 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Categoria */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {ALL_CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCatFilter(value as InstrumentCategory | 'all')}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                catFilter === value ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Faixa etária */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {ALL_AGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setAgeFilter(value as AgeGroup | 'all')}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                ageFilter === value ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-neutral-400">
        {filtered.length} instrumento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        {selectedBatteryConfig ? ` na bateria ${selectedBatteryConfig.label}` : ''}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-neutral-400">Nenhum instrumento encontrado para os filtros selecionados.</p>
          <button
            onClick={() => { setSearch(''); setCatFilter('all'); setAgeFilter('all') }}
            className="mt-3 text-xs text-sage-600 hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((inst, i) => (
            <InstrumentCard
              key={inst.id}
              instrument={inst}
              index={i}
              favorite={favoriteSet.has(inst.id)}
              onToggleFavorite={() => toggleFavorite(inst.id)}
              onClick={() => setSelected(inst)}
            />
          ))}
        </div>
      )}

      {/* Nota CFP */}
      <p className="text-xs text-neutral-400 border-t border-neutral-100 pt-4">
        Testes psicológicos privativos devem ser utilizados exclusivamente por psicólogas(os) habilitados,
        conforme orientação do CFP e consulta ao{' '}
        <a
          href="https://satepsi.cfp.org.br/"
          target="_blank"
          rel="noreferrer"
          className="text-sage-600 hover:underline"
        >
          SATEPSI
        </a>
        . Alguns instrumentos podem ter regras próprias de uso, tradução e direitos autorais. Confirme a adequação antes de aplicar.
      </p>

      <InstrumentModal
        instrument={selected}
        onClose={() => setSelected(null)}
        onSend={(instrument) => {
          setSelected(null)
          setSendingInstrument(instrument)
        }}
      />
      <SendInstrumentModal instrument={sendingInstrument} onClose={() => setSendingInstrument(null)} />
    </div>
  )
}
