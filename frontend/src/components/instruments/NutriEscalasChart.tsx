import { useInstrumentAssignments } from '@/hooks/api/instruments'

interface NutriEscalasChartProps {
  patientId: string
}

// PREDIMED: score alto = melhor (lógica invertida — score alto é bom)
const SCALES = [
  {
    id: 'predimed',
    label: 'PREDIMED',
    max: 14,
    lineColor: '#16a34a',
    threshMod: 10,   // score < 10 = moderada adesão
    threshSev: 7,    // score < 7 = baixa adesão
    // Lógica: score alto = bom. No gráfico, 100% no topo = melhor.
  },
] as const

type ScaleId = typeof SCALES[number]['id']

// PREDIMED: score alto = bom, score baixo = ruim
function severityLabel(score: number, threshMod: number, threshSev: number): string {
  if (score < threshSev) return 'Baixa adesão'
  if (score < threshMod) return 'Adesão moderada'
  return 'Alta adesão'
}

function pointColor(score: number, threshMod: number, threshSev: number): string {
  if (score < threshSev) return '#dc2626'
  if (score < threshMod) return '#d97706'
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

export default function NutriEscalasChart({ patientId }: NutriEscalasChartProps) {
  const { data: assignments = [], isLoading } = useInstrumentAssignments(patientId)

  const scalePoints: Record<ScaleId, { score: number; completedAt: string }[]> = {
    predimed: [],
  }

  for (const scale of SCALES) {
    scalePoints[scale.id] = assignments
      .filter(a => a.instrumentId === scale.id && a.status === 'completed' && a.score != null)
      .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
      .map(a => ({ score: a.score as number, completedAt: a.completedAt as string }))
  }

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
        <p className="text-sm text-neutral-400">Aplique o PREDIMED para ver a evolução da adesão à dieta</p>
        <p className="mt-1 text-xs text-neutral-300">
          Pelo menos 2 aplicações completas são necessárias para exibir o gráfico.
        </p>
      </div>
    )
  }

  // Eixo X: union de todas as datas, ordenadas
  const allDates = Array.from(
    new Set(
      activeScales.flatMap(s => scalePoints[s.id].map(p => p.completedAt.substring(0, 10)))
    )
  ).sort()

  // Dimensões do SVG
  const W = 580
  const H = 220
  const PL = 40
  const PR = 12
  const PT = 14
  const PB = 36
  const CW = W - PL - PR
  const CH = H - PT - PB

  const n = allDates.length

  // PREDIMED: score alto = bom. 100% no topo = melhor adesão.
  // yCoord(100) = PT (topo SVG) = melhor; yCoord(0) = PT+CH (base) = pior
  const yCoord = (pct: number) => PT + CH * (1 - pct / 100)

  const xCoord = (dateKey: string) => {
    const idx = allDates.indexOf(dateKey)
    return PL + (n === 1 ? CW / 2 : (idx / (n - 1)) * CW)
  }

  const gridPcts = [0, 25, 50, 75, 100]

  // Badge de tendência: para PREDIMED, ↑ = melhora (verde), ↓ = piora (vermelho)
  const trends: { label: string; bg: string; text: string }[] = []
  const scale = SCALES[0]
  const pts = scalePoints[scale.id]
  if (pts.length >= 2) {
    const first = pts[0].score
    const last = pts[pts.length - 1].score
    if (last > first) {
      trends.push({
        label: `↑ PREDIMED em melhora`,
        bg: 'bg-green-50 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
      })
    } else if (last < first) {
      trends.push({
        label: `↓ PREDIMED em queda`,
        bg: 'bg-red-50 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
      })
    }
  }

  return (
    <div className="rounded-2xl border border-[#DDE5DC] bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      {/* Badge de tendência */}
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
        aria-label="Gráfico de evolução da adesão à dieta mediterrânea (PREDIMED)"
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

        {/* Linha e pontos */}
        {activeScales.map(s => {
          const spts = scalePoints[s.id]
          const plotted = spts.map(p => ({
            ...p,
            pct: (p.score / s.max) * 100,
            dateKey: p.completedAt.substring(0, 10),
          }))

          const polylinePoints = plotted
            .map(p => `${xCoord(p.dateKey)},${yCoord(p.pct)}`)
            .join(' ')

          return (
            <g key={s.id}>
              <polyline
                points={polylinePoints}
                fill="none"
                stroke={s.lineColor}
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeOpacity="0.7"
              />

              {plotted.map((p, i) => {
                const cx = xCoord(p.dateKey)
                const cy = yCoord(p.pct)
                const pColor = pointColor(p.score, s.threshMod, s.threshSev)
                const sevLabel = severityLabel(p.score, s.threshMod, s.threshSev)
                const titleText = `${formatDateFull(p.completedAt)} — PREDIMED: ${p.score}/14 — ${sevLabel}`
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

        {/* Datas no eixo X */}
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

      {/* Legenda */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: scale.lineColor }}
          />
          PREDIMED
          <span className="text-neutral-400">(↑ melhor)</span>
        </span>
        <span className="ml-2 flex items-center gap-1.5 border-l border-neutral-200 pl-2 dark:border-neutral-700">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
          Alta adesão
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d97706]" />
          Moderada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
          Baixa adesão
        </span>
      </div>
    </div>
  )
}
