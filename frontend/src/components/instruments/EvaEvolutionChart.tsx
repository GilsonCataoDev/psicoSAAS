import { useInstrumentAssignments } from '@/hooks/api/instruments'

interface EvaEvolutionChartProps {
  patientId: string
}

// Thresholds clínicos da EVA (Escala Visual Analógica de Dor)
function scoreColor(score: number): string {
  if (score <= 3) return '#16a34a'  // verde — dor leve
  if (score <= 6) return '#d97706'  // âmbar — dor moderada
  return '#dc2626'                  // vermelho — dor intensa
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function EvaEvolutionChart({ patientId }: EvaEvolutionChartProps) {
  const { data: assignments = [], isLoading } = useInstrumentAssignments(patientId)

  const points = assignments
    .filter(a => a.instrumentId === 'eva-dor' && a.status === 'completed' && a.score != null)
    .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
    .map(a => ({ score: a.score as number, completedAt: a.completedAt as string }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-neutral-400">
        Carregando dados da EVA…
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-[#DDE5DC] bg-neutral-50 px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
        <p className="text-sm text-neutral-400">Nenhuma aplicação registrada ainda.</p>
        <p className="mt-1 text-xs text-neutral-300">
          Pelo menos 2 aplicações completas são necessárias para exibir o gráfico de evolução.
        </p>
      </div>
    )
  }

  // Dimensões do SVG
  const W = 560
  const H = 200
  const PL = 36  // padding left (espaço para labels Y)
  const PR = 12  // padding right
  const PT = 14  // padding top
  const PB = 36  // padding bottom (espaço para labels X)
  const CW = W - PL - PR  // largura do gráfico
  const CH = H - PT - PB  // altura do gráfico

  const n = points.length

  // 0 no topo = sem dor; 10 na base = dor máxima
  const yCoord = (score: number) => PT + (score / 10) * CH
  const xCoord = (i: number) => PL + (n === 1 ? CW / 2 : (i / (n - 1)) * CW)

  const gridValues = [0, 2, 4, 6, 8, 10]

  // Linha de tendência: último score < primeiro score → em melhora
  const emMelhora = points[points.length - 1].score < points[0].score

  const polylinePoints = points
    .map((p, i) => `${xCoord(i)},${yCoord(p.score)}`)
    .join(' ')

  return (
    <div className="rounded-2xl border border-[#DDE5DC] bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      {/* Badge de tendência */}
      {emMelhora && (
        <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
          ↓ Em melhora
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Gráfico de evolução da Escala Visual Analógica de Dor"
        role="img"
      >
        {/* Grid horizontal */}
        {gridValues.map(v => {
          const y = yCoord(v)
          return (
            <g key={v}>
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
                {v}
              </text>
            </g>
          )
        })}

        {/* Linha de conexão entre pontos */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="#a3b1a0"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Pontos de dados */}
        {points.map((p, i) => {
          const cx = xCoord(i)
          const cy = yCoord(p.score)
          const color = scoreColor(p.score)
          const label = `${formatDateFull(p.completedAt)} — Dor: ${p.score}/10`
          return (
            <g key={i}>
              {/* Círculo externo (borda branca para contraste) */}
              <circle cx={cx} cy={cy} r="6" fill="white" />
              <circle cx={cx} cy={cy} r="5" fill={color}>
                <title>{label}</title>
              </circle>
              {/* Score sobre o ponto */}
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={color}
              >
                {p.score}
              </text>
            </g>
          )
        })}

        {/* Labels do eixo X */}
        {points.map((p, i) => {
          const x = xCoord(i)
          const y = H - PB + 12
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {formatDateLabel(p.completedAt)}
            </text>
          )
        })}
      </svg>

      {/* Legenda de cores */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
          Leve (0–3)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d97706]" />
          Moderada (4–6)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
          Intensa (7–10)
        </span>
      </div>
    </div>
  )
}
