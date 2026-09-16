import { useInstrumentAssignments } from '@/hooks/api/instruments'

interface EscalasEvolutionChartProps {
  patientId: string
}

const SCALES = [
  { id: 'phq9',   label: 'PHQ-9',   max: 27, lineColor: '#16a34a', threshMod: 10, threshSev: 20 },
  { id: 'gad7',   label: 'GAD-7',   max: 21, lineColor: '#7c3aed', threshMod: 10, threshSev: 15 },
  { id: 'dass21', label: 'DASS-21', max: 108, lineColor: '#ea580c', threshMod: 45, threshSev: 78 },
] as const

type ScaleId = typeof SCALES[number]['id']

function severityLabel(score: number, threshMod: number, threshSev: number): string {
  if (score >= threshSev) return 'Grave'
  if (score >= threshMod) return 'Moderado'
  return 'Leve'
}

function pointColor(score: number, threshMod: number, threshSev: number): string {
  if (score >= threshSev) return '#dc2626'
  if (score >= threshMod) return '#d97706'
  return '#16a34a'
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatDateFull(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function EscalasEvolutionChart({ patientId }: EscalasEvolutionChartProps) {
  const { data: assignments = [], isLoading } = useInstrumentAssignments(patientId)

  // Build per-scale point arrays
  const scalePoints: Record<ScaleId, { score: number; completedAt: string }[]> = {
    phq9: [],
    gad7: [],
    dass21: [],
  }

  for (const scale of SCALES) {
    scalePoints[scale.id] = assignments
      .filter(a => a.instrumentId === scale.id && a.status === 'completed' && a.score != null)
      .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
      .map(a => ({ score: a.score as number, completedAt: a.completedAt as string }))
  }

  // Only keep scales with ≥2 points
  const activeScales = SCALES.filter(s => scalePoints[s.id].length >= 2)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-neutral-400">
        Carregando dados das escalas…
      </div>
    )
  }

  if (activeScales.length === 0) {
    return (
      <div className="rounded-2xl border border-[#DDE5DC] bg-neutral-50 px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
        <p className="text-sm text-neutral-400">Aplique PHQ-9 ou GAD-7 para ver a evolução</p>
        <p className="mt-1 text-xs text-neutral-300">
          Pelo menos 2 aplicações completas de uma mesma escala são necessárias para exibir o gráfico.
        </p>
      </div>
    )
  }

  // Build common X axis: union of all dates from active scales, sorted
  const allDates = Array.from(
    new Set(
      activeScales.flatMap(s => scalePoints[s.id].map(p => p.completedAt.substring(0, 10)))
    )
  ).sort()

  // SVG dimensions
  const W = 580
  const H = 220
  const PL = 40  // left padding for Y labels
  const PR = 12  // right padding
  const PT = 14  // top padding
  const PB = 36  // bottom padding for X labels
  const CW = W - PL - PR
  const CH = H - PT - PB

  const n = allDates.length

  // Y: 0 at bottom (no symptom), 100% at top (max severity)
  // SVG y=0 is top, so invert
  const yCoord = (pct: number) => PT + CH * (1 - pct / 100)

  const xCoord = (dateKey: string) => {
    const idx = allDates.indexOf(dateKey)
    return PL + (n === 1 ? CW / 2 : (idx / (n - 1)) * CW)
  }

  const gridPcts = [0, 25, 50, 75, 100]

  // Trend badges
  const trends: { label: string; color: string; bg: string; text: string }[] = []
  for (const scale of activeScales) {
    const pts = scalePoints[scale.id]
    const first = pts[0].score
    const last = pts[pts.length - 1].score
    if (last < first) {
      trends.push({
        label: `↓ ${scale.label} em queda`,
        color: scale.lineColor,
        bg: 'bg-green-50 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
      })
    } else if (last > first) {
      trends.push({
        label: `↑ ${scale.label} em alta`,
        color: scale.lineColor,
        bg: 'bg-red-50 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
      })
    }
  }

  return (
    <div className="rounded-2xl border border-[#DDE5DC] bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      {/* Trend badges */}
      {trends.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {trends.map(t => (
            <span
              key={t.label}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.bg} ${t.text}`}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Gráfico de evolução das escalas psicológicas"
        role="img"
      >
        {/* Grid horizontal */}
        {gridPcts.map(pct => {
          const y = yCoord(pct)
          return (
            <g key={pct}>
              <line
                x1={PL}
                y1={y}
                x2={W - PR}
                y2={y}
                stroke="#DDE5DC"
                strokeWidth="1"
              />
              <text
                x={PL - 5}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="9"
                fill="#9ca3af"
              >
                {pct}%
              </text>
            </g>
          )
        })}

        {/* Lines and points per scale */}
        {activeScales.map(scale => {
          const pts = scalePoints[scale.id]
          const plotted = pts.map(p => ({
            ...p,
            pct: (p.score / scale.max) * 100,
            dateKey: p.completedAt.substring(0, 10),
          }))

          const polylinePoints = plotted
            .map(p => `${xCoord(p.dateKey)},${yCoord(p.pct)}`)
            .join(' ')

          return (
            <g key={scale.id}>
              {/* Connection line */}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke={scale.lineColor}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeOpacity="0.7"
              />

              {/* Data points */}
              {plotted.map((p, i) => {
                const cx = xCoord(p.dateKey)
                const cy = yCoord(p.pct)
                const pColor = pointColor(p.score, scale.threshMod, scale.threshSev)
                const sevLabel = severityLabel(p.score, scale.threshMod, scale.threshSev)
                const titleText = `${formatDateFull(p.completedAt)} — ${scale.label}: ${p.score} — ${sevLabel}`
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="6" fill="white" />
                    <circle cx={cx} cy={cy} r="5" fill={pColor}>
                      <title>{titleText}</title>
                    </circle>
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill={pColor}
                    >
                      {p.score}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* X axis date labels */}
        {allDates.map(dateKey => {
          const x = xCoord(dateKey)
          const y = H - PB + 12
          return (
            <text
              key={dateKey}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {formatDateLabel(dateKey)}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
        {activeScales.map(scale => (
          <span key={scale.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: scale.lineColor }}
            />
            {scale.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2 border-l border-neutral-200 dark:border-neutral-700 pl-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
          Leve
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d97706]" />
          Moderado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
          Grave
        </span>
      </div>
    </div>
  )
}
