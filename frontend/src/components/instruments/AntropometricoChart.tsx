import { useSessions } from '@/hooks/useApi'

interface AntropometricoChartProps {
  patientId: string
}

function imcColor(imc: number): string {
  if (imc < 18.5) return '#2563eb'   // abaixo do peso — azul
  if (imc < 25)   return '#16a34a'   // normal — verde
  if (imc < 30)   return '#d97706'   // sobrepeso — amarelo
  return '#dc2626'                   // obesidade — vermelho
}

function imcLabel(imc: number): string {
  if (imc < 18.5) return 'Abaixo do peso'
  if (imc < 25)   return 'Normal'
  if (imc < 30)   return 'Sobrepeso'
  return 'Obesidade'
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

function formatDateFull(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AntropometricoChart({ patientId }: AntropometricoChartProps) {
  const { data: sessions = [], isLoading } = useSessions({ patientId, includeClinical: true })

  // Pontos com peso registrado, ordenados por data ASC
  const points = sessions
    .filter(s => s.nutritionWeight != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      date:               s.date,
      weight:             s.nutritionWeight as number,
      height:             s.nutritionHeight ?? null,
      waistCirc:          s.nutritionWaistCirc ?? null,
    }))

  // Altura mais recente com valor preenchido
  const latestHeight = [...points].reverse().find(p => p.height != null)?.height ?? null

  // Calcula IMC usando altura mais recente disponível
  const pointsWithImc = points.map(p => {
    const h = p.height ?? latestHeight
    const imc = h != null && h > 0 ? p.weight / Math.pow(h / 100, 2) : null
    return { ...p, imc }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-neutral-400">
        Carregando medidas…
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-[#DDE5DC] bg-neutral-50 px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
        <p className="text-sm text-neutral-400">Nenhuma medida de peso registrada ainda.</p>
        <p className="mt-1 text-xs text-neutral-300">
          Pelo menos 2 consultas com peso preenchido são necessárias para exibir o gráfico.
        </p>
      </div>
    )
  }

  const n = points.length
  const weightValues = pointsWithImc.map(p => p.weight)
  const minW = Math.min(...weightValues)
  const maxW = Math.max(...weightValues)
  const padW = Math.max((maxW - minW) * 0.15, 2)
  const yMinW = minW - padW
  const yMaxW = maxW + padW

  const imcValues = pointsWithImc.map(p => p.imc).filter((v): v is number => v != null)
  const hasImc = imcValues.length >= 2
  const minImc = hasImc ? Math.min(...imcValues) : 0
  const maxImc = hasImc ? Math.max(...imcValues) : 40
  const padImc = Math.max((maxImc - minImc) * 0.15, 1)
  const yMinImc = minImc - padImc
  const yMaxImc = maxImc + padImc

  const waistValues = pointsWithImc.map(p => p.waistCirc).filter((v): v is number => v != null)
  const hasWaist = waistValues.length >= 2
  const minWaist = hasWaist ? Math.min(...waistValues) : 0
  const maxWaist = hasWaist ? Math.max(...waistValues) : 120
  const padWaist = Math.max((maxWaist - minWaist) * 0.15, 2)
  const yMinWaist = minWaist - padWaist
  const yMaxWaist = maxWaist + padWaist

  // Dimensões SVG
  const W  = 560
  const H  = 220
  const PL = 44
  const PR = hasImc ? 44 : 12
  const PT = 16
  const PB = 40
  const CW = W - PL - PR
  const CH = H - PT - PB

  const xCoord = (i: number) => PL + (n === 1 ? CW / 2 : (i / (n - 1)) * CW)
  const yCoordW = (v: number) => PT + ((yMaxW - v) / (yMaxW - yMinW)) * CH
  const yCoordImc = (v: number) => PT + ((yMaxImc - v) / (yMaxImc - yMinImc)) * CH
  const yCoordWaist = (v: number) => PT + ((yMaxWaist - v) / (yMaxWaist - yMinWaist)) * CH

  const weightLine = pointsWithImc
    .map((p, i) => `${xCoord(i)},${yCoordW(p.weight)}`)
    .join(' ')

  const imcLine = hasImc
    ? pointsWithImc
        .filter(p => p.imc != null)
        .map((p, i) => `${xCoord(i)},${yCoordImc(p.imc as number)}`)
        .join(' ')
    : ''

  const waistLine = hasWaist
    ? pointsWithImc
        .filter(p => p.waistCirc != null)
        .map((p, i) => `${xCoord(i)},${yCoordWaist(p.waistCirc as number)}`)
        .join(' ')
    : ''

  const firstWeight = pointsWithImc[0].weight
  const lastWeight  = pointsWithImc[pointsWithImc.length - 1].weight
  const weightDiff  = lastWeight - firstWeight
  const hasBadge    = Math.abs(weightDiff) >= 0.1

  // Grid lines para eixo peso
  const gridSteps = 4
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) =>
    yMinW + ((yMaxW - yMinW) / gridSteps) * i,
  )

  return (
    <div className="rounded-2xl border border-[#DDE5DC] bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      {/* Badge de tendência de peso */}
      {hasBadge && (
        <div
          className={`mb-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            weightDiff < 0
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          }`}
        >
          {weightDiff < 0 ? '↓' : '↑'} {weightDiff < 0 ? 'Perdeu' : 'Ganhou'} {Math.abs(weightDiff).toFixed(1)}kg
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Gráfico de evolução antropométrica"
        role="img"
      >
        {/* Grid horizontal */}
        {gridValues.map((v, gi) => {
          const y = yCoordW(v)
          return (
            <g key={gi}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#DDE5DC" strokeWidth="1" />
              <text x={PL - 5} y={y} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#9ca3af">
                {v.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Label eixo Y esquerdo */}
        <text
          x={10}
          y={PT + CH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fill="#9ca3af"
          transform={`rotate(-90, 10, ${PT + CH / 2})`}
        >
          Peso (kg)
        </text>

        {/* Label eixo Y direito — IMC */}
        {hasImc && (
          <>
            {Array.from({ length: gridSteps + 1 }, (_, i) => {
              const v = yMinImc + ((yMaxImc - yMinImc) / gridSteps) * i
              const y = yCoordImc(v)
              return (
                <text key={i} x={W - PR + 5} y={y} textAnchor="start" dominantBaseline="middle" fontSize="9" fill="#6366f1">
                  {v.toFixed(1)}
                </text>
              )
            })}
            <text
              x={W - 10}
              y={PT + CH / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fill="#6366f1"
              transform={`rotate(90, ${W - 10}, ${PT + CH / 2})`}
            >
              IMC
            </text>
          </>
        )}

        {/* Linha de circunferência abdominal (tracejada) */}
        {hasWaist && (
          <polyline
            points={waistLine}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Linha de IMC */}
        {hasImc && (
          <polyline
            points={imcLine}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Linha de peso */}
        <polyline
          points={weightLine}
          fill="none"
          stroke="#a3b1a0"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Pontos de peso */}
        {pointsWithImc.map((p, i) => {
          const cx    = xCoord(i)
          const cy    = yCoordW(p.weight)
          const color = p.imc != null ? imcColor(p.imc) : '#a3b1a0'
          const label = `${formatDateFull(p.date)} — ${p.weight}kg${p.imc != null ? ` · IMC ${p.imc.toFixed(1)} (${imcLabel(p.imc)})` : ''}`
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="6" fill="white" />
              <circle cx={cx} cy={cy} r="5" fill={color}>
                <title>{label}</title>
              </circle>
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
                {p.weight.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Labels do eixo X */}
        {pointsWithImc.map((p, i) => (
          <text
            key={i}
            x={xCoord(i)}
            y={H - PB + 14}
            textAnchor="middle"
            fontSize="9"
            fill="#9ca3af"
          >
            {formatDateLabel(p.date)}
          </text>
        ))}
      </svg>

      {/* Legenda */}
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
          Abaixo do peso (IMC&nbsp;&lt;&nbsp;18,5)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
          Normal (18,5–24,9)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#d97706]" />
          Sobrepeso (25–29,9)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
          Obesidade (≥&nbsp;30)
        </span>
        {hasWaist && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-0.5 w-5 bg-[#f59e0b]"
              style={{ borderTop: '2px dashed #f59e0b', background: 'transparent' }}
            />
            Circ. abdominal
          </span>
        )}
        {hasImc && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 bg-[#6366f1]" />
            IMC (eixo direito)
          </span>
        )}
      </div>
    </div>
  )
}
