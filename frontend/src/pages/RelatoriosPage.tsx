import { useState } from 'react'
import {
  BarChart3, Users, TrendingUp, Calendar, Download, Lock,
  CheckCircle, XCircle, Wifi, UserMinus, Clock, FileText,
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import LightweightChart from '@/components/ui/LightweightChart'
import { useDashboard } from '@/hooks/api/dashboard'
import { useAuthStore } from '@/store/auth'
import { useTerms } from '@/hooks/useTerms'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function RelatoriosPage() {
  const { data: s, isLoading } = useDashboard()
  const user = useAuthStore(st => st.user)
  const t = useTerms()
  const [exporting, setExporting] = useState(false)

  const locked = s?.advancedAnalyticsLocked === true

  async function handleExport() {
    setExporting(true)
    try {
      const res = await api.get('/data-export', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `relatorio-cognia-${stamp}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err: any) {
      const msg = err?.response?.status === 429
        ? 'Limite de exportações atingido. Tente novamente em até 1 hora.'
        : 'Não foi possível gerar o relatório.'
      toast.error(msg)
    } finally {
      setExporting(false)
    }
  }

  const chartData = (s?.revenueChart ?? []).map((d: any) => ({
    label: d.mes,
    value: d.valor,
  }))

  const ind = s?.clinicIndicators
  const roi = s?.roi

  return (
    <div className="animate-slide-up space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Indicadores clínicos do mês atual</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-60"
        >
          {exporting
            ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            : <Download className="w-4 h-4" />}
          Exportar PDF
        </button>
      </div>

      {/* Stats principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={t.patientsCapitalized + ' ativos'}
          value={isLoading ? '—' : (s?.activePatients ?? 0)}
          icon={<Users className="w-4 h-4" />}
          accent="sage"
        />
        <StatCard
          label={t.sessionsCapitalized + ' no mês'}
          value={isLoading ? '—' : (s?.sessionsThisMonth ?? 0)}
          icon={<Calendar className="w-4 h-4" />}
          accent="mist"
        />
        <StatCard
          label="Receita do mês"
          value={isLoading ? '—' : formatCurrency(s?.monthRevenue ?? 0)}
          sub={s?.pendingAmount ? `${formatCurrency(s.pendingAmount)} pendente` : undefined}
          icon={<TrendingUp className="w-4 h-4" />}
          accent="sage"
        />
        <StatCard
          label={t.patientsCapitalized + ' inativos'}
          value={isLoading ? '—' : (s?.inactivePatients ?? 0)}
          sub="+30 dias sem atendimento"
          icon={<UserMinus className="w-4 h-4" />}
          accent={s?.inactivePatients ? 'amber' : 'sage'}
        />
      </div>

      {/* Gráfico de receita */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-medium text-neutral-800 dark:text-white">Receita — últimos 6 meses</p>
            <p className="text-xs text-neutral-400 mt-0.5">Apenas pagamentos confirmados</p>
          </div>
          {locked && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-1 rounded-lg">
              <Lock className="w-3 h-3" /> Pro
            </span>
          )}
        </div>
        {locked ? (
          <LockedSection label="Gráfico de receita histórica disponível no plano Pro" />
        ) : (
          <LightweightChart
            data={chartData}
            height={160}
            formatValue={v => formatCurrency(v)}
            showYAxis
          />
        )}
      </div>

      {/* Indicadores clínicos */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-sage-600" />
          <p className="font-medium text-neutral-800 dark:text-white">Indicadores clínicos</p>
          {locked && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-1 rounded-lg">
              <Lock className="w-3 h-3" /> Pro
            </span>
          )}
        </div>
        {locked ? (
          <LockedSection label="Indicadores de comparecimento, faltas e atendimentos disponíveis no plano Pro" />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <IndicatorTile
                icon={<CheckCircle className="w-4 h-4 text-sage-600" />}
                label="Comparecimento"
                value={`${ind?.attendanceRate ?? 0}%`}
                bg="bg-sage-50 dark:bg-sage-500/10"
              />
              <IndicatorTile
                icon={<XCircle className="w-4 h-4 text-rose-500" />}
                label="Taxa de faltas"
                value={`${ind?.noShowRate ?? 0}%`}
                bg="bg-rose-50 dark:bg-rose-500/10"
              />
              <IndicatorTile
                icon={<Wifi className="w-4 h-4 text-mist-600" />}
                label="Online"
                value={`${ind?.onlineRate ?? 0}%`}
                bg="bg-mist-50 dark:bg-mist-500/10"
              />
              <IndicatorTile
                icon={<Users className="w-4 h-4 text-neutral-500" />}
                label={t.sessionsCapitalized + '/' + t.patient}
                value={`${ind?.avgSessionsPerActivePatient ?? 0}`}
                bg="bg-neutral-50 dark:bg-neutral-700/30"
              />
            </div>
            {((ind?.noShows ?? 0) + (ind?.cancelled ?? 0)) > 0 && (
              <p className="text-xs text-neutral-400">
                {ind?.noShows} falta{ind?.noShows === 1 ? '' : 's'} e {ind?.cancelled} cancelamento{ind?.cancelled === 1 ? '' : 's'} este mês ·{' '}
                {ind?.completedAppointments} {t.sessions} realizad{t.sessions === 'sessões' ? 'as' : 'os'} de {ind?.totalAppointments} agendad{t.sessions === 'sessões' ? 'as' : 'os'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ROI / Impacto */}
      {!locked && (roi?.remindersSent ?? 0) + (roi?.absencesCount ?? 0) > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-sage-600" />
            <p className="font-medium text-neutral-800 dark:text-white">Impacto da automação — mês atual</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <IndicatorTile
              icon={<Clock className="w-4 h-4 text-sage-600" />}
              label="Tempo economizado"
              value={`${Math.round(((roi?.estimatedMinutesSaved ?? 0) / 60) * 10) / 10}h`}
              sub="em lembretes automáticos"
              bg="bg-sage-50 dark:bg-sage-500/10"
            />
            <IndicatorTile
              icon={<CheckCircle className="w-4 h-4 text-mist-600" />}
              label="Lembretes enviados"
              value={`${roi?.remindersSent ?? 0}`}
              bg="bg-mist-50 dark:bg-mist-500/10"
            />
            <IndicatorTile
              icon={<XCircle className="w-4 h-4 text-rose-500" />}
              label="Faltas registradas"
              value={`${roi?.absencesCount ?? roi?.earlyCancellations ?? 0}`}
              sub={roi?.absencesAmount ? formatCurrency(roi.absencesAmount) : undefined}
              bg="bg-rose-50 dark:bg-rose-500/10"
            />
          </div>
        </div>
      )}

      {/* Upsell quando bloqueado */}
      {locked && (
        <div className="card border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-neutral-800 dark:text-white">Análise avançada disponível no plano Pro</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-300 mt-0.5">
                Gráfico de receita histórica, taxa de comparecimento, faltas, atendimentos online e impacto das automações.
              </p>
              <a href="/planos" className="mt-2 inline-block text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline">
                Ver planos →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function IndicatorTile({ icon, label, value, sub, bg }: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  bg?: string
}) {
  return (
    <div className={`rounded-xl p-3 ${bg ?? 'bg-neutral-50 dark:bg-neutral-700/30'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs text-neutral-500 dark:text-neutral-300">{label}</p>
      </div>
      <p className="text-xl font-semibold text-neutral-800 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function LockedSection({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8 gap-2 text-sm text-neutral-400 dark:text-neutral-500">
      <Lock className="w-4 h-4" />
      {label}
    </div>
  )
}
