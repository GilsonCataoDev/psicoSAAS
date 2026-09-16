import { useSessions } from '@/hooks/useApi'
import type { Session } from '@/types'

interface FuncionalChartProps {
  patientId: string
}

function funcColor(score: number): string {
  if (score <= 20) return '#dc2626'  // grave
  if (score <= 40) return '#ea580c'  // moderado
  if (score <= 60) return '#ca8a04'  // leve
  if (score <= 80) return '#65a30d'  // bom
  return '#16a34a'                   // ótimo
}

function formatDateLabel(iso: string): string {
  const [, mm, dd] = iso.split('-')
  return `${dd}/${mm}`
}

function formatDateFull(iso: string): string {
  const [yyyy, mm, dd] = iso.split('-')
  return `${dd}/${mm}/${yyyy}`
}

export default function FuncionalChart({ patientId }: FuncionalChartProps) {
  const { data: sessions = [], isLoading } = useSessions({ patientId, includeClinical: true })

  const points = (sessions as Session[])
    .filter((s: Session) => s.physioFunctional != null || s.physioStrength != null || s.physioRom != null)
    .sort((a: Session, b: Session) => a.date.localeCompare(b.date))
    .map((s: Session) => ({
      date:             s.date,
      functional:       s.physioFunctional ?? null,
      strength:         s.physioStrength   ?? null,
      rom:              s.physioRom        ?? null,
    }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-neutral-400">
        Carregando medidas funcionais…
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-[#DDE5DC] bg-neutral-50 px-4 py-8 text-center dark:border-white/10 dark:bg-white/5">
        <p className="text-sm text-neutral-400">Nenhuma medida funcional registrada ainda.</p>
        <p className="mt-1 text-xs text-neutral-300">
          Pelo menos 2 atendimentos com medida preenchida são necessários para exibir o gráfico.
        </p>
      </div>
    )
  }

  const n = points.length

  // Pontuação funcional (eixo Y esquerdo 0–100)
  const funcValues = points.map(p => p.functional).filter((v): v is number => v != null)
  const hasFunc    = funcValues.length >= 2
  const yMinF = 0
  const yMaxF = 100

  // Força MRC (eixo Y direito 0–5)
  const strValues = points.map(p => p.strength).filter((v): v is number => v != null)
  const hasStr    = strValues.length >= 2
  const yMinS = 0
  const yMaxS = 5

  // ADM em graus (escala independente)
  const romValues = points.map(p => p.rom).filter((v): v is number => v != null)
  const hasRom    = romValues.length >= 2
  const minRom    = hasRom ? Math.min(...romValues) : 0
  const maxRom    = hasRom ? Math.max(...romValues) : 360
  const padRom    = Math.max((maxRom - minRom) * 0.15, 5)
  const yMinR     = Math.max(0, minRom - padRom)
  const yMaxR     = maxRom + padRom

  // Dimensões SVG
  const W  = 560
  const H  = 220
  const PL = 44
  const PR = hasStr ? 44 : 12
  const PT = 16
  const PB = 40
  const CW = W - PL - PR
  const CH = H - PT - PB

  const xCoord   = (i: number)  => PL + (n === 1 ? CW / 2 : (i / (n - 1)) * CW)
  const yCoordF  = (v: number)  => PT + ((yMaxF - v) / (yMaxF - yMinF)) * CH
  const yCoordS  = (v: number)  => PT + ((yMaxS - v) / (yMaxS - yMinS)) * CH
  const yCoordR  = (v: number)  => PT + ((yMaxR - v) / (yMaxR - yMinR)) * CH

  // Polyline points strings
  const funcLine = hasFunc
    ? points
        .filter(p => p.functional != null)
        .map((p, i) => `${xCoord(i)},${yCoordF(p.functional as number)}`)
        .join(' ')
    : ''

  const strLine = hasStr
    ? points
        .filter(p => p.strength != null)
        .map((p, i) => `${xCoord(i)},${yCoordS(p.strength as number)}`)
        .join(' ')
    : ''

  const romLine = hasRom
    ? points
        .filter(p => p.rom != null)
        .map((p, i) => `${xCoord(i)},${yCoordR(p.rom as number)}`)
        .join(' ')
    : ''

  // Badge de tendência funcional
  const funcPoints = points.filter(p => p.functional != null)
  const firstFunc  = funcPoints[0]?.functional ?? null
  const lastFunc   = funcPoints[funcPoints.length - 1]?.functional ?? null
  const funcDiff   = firstFunc != null && lastFunc != null ? lastFunc - firstFunc : null
  const hasBadge   = funcDiff != null && Math.abs(funcDiff) >= 0.5

  // Grid horizontal (5 steps)
  const gridSteps  = 4
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) =>
    yMinF + ((yMaxF - yMinF) / gridSteps) * i,
  )

  return (
    <div className="rounded-2xl border border-[#DDE5DC] bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      {/* Badge de tendência funcional */}
      {hasBadge && funcDiff != null && (
        <div
          className={`mb-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            funcDiff > 0
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}
        >
          {funcDiff > 0 ? '↑' : '↓'} {funcDiff > 0 ? '+' : ''}{funcDiff.toFixed(1)} pts
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        aria-label="Gráfico de evolução funcional"
        role="img"
      >
        {/* Grid horizontal */}
        {gridValues.map((v, gi) => {
          const y = yCoordF(v)
          return (
            <g key={gi}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#DDE5DC" strokeWidth="1" />
              <text x={PL - 5} y={y} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#9ca3af">
                {v.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Label eixo Y esquerdo — Pontuação Funcional */}
        <text
          x={10}
          y={PT + CH / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="9"
          fill="#9ca3af"
          transform={`rotate(-90, 10, ${PT + CH / 2})`}
        >
          Func. (0–100)
        </text>

        {/* Label eixo Y direito — Força MRC */}
        {hasStr && (
          <>
            {Array.from({ length: gridSteps + 1 }, (_, i) => {
              const v = yMinS + ((yMaxS - yMinS) / gridSteps) * i
              const y = yCoordS(v)
              return (
                <text key={i} x={W - PR + 5} y={y} textAnchor="start" dominantBaseline="middle" fontSize="9" fill="#7c3aed">
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
              fill="#7c3aed"
              transform={`rotate(90, ${W - 10}, ${PT + CH / 2})`}
            >
              MRC (0–5)
            </text>
          </>
        )}

        {/* Linha ADM (pontilhada âmbar) */}
        {hasRom && (
          <polyline
            points={romLine}
            fill="none"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeDasharray="2 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Linha Força MRC (tracejada roxa) */}
        {hasStr && (
          <polyline
            points={strLine}
            fill="none"
            stroke="#7c3aed"
            strokeWidth="1.5"
            strokeDasharray="5 3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Linha Pontuação Funcional (azul sólida) */}
        {hasFunc && (
          <polyline
            points={funcLine}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Pontos de pontuação funcional */}
        {hasFunc && points.map((p, i) => {
          if (p.functional == null) return null
          const cx    = xCoord(i)
          const cy    = yCoordF(p.functional)
          const color = funcColor(p.functional)
          const label = `${formatDateFull(p.date)} — Func. ${p.functional}${p.strength != null ? ` · Força MRC ${p.strength}` : ''}${p.rom != null ? ` · ADM ${p.rom}°` : ''}`
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="6" fill="white" />
              <circle cx={cx} cy={cy} r="5" fill={color}>
                <title>{label}</title>
              </circle>
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
                {p.functional.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Labels do eixo X */}
        {points.map((p, i) => (
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
          <span className="inline-block h-0.5 w-5 bg-[#2563eb]" />
          Func. (0–100)
        </span>
        {hasStr && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-5"
              style={{ borderTop: '2px dashed #7c3aed', display: 'inline-block', height: 0 }}
            />
            Força MRC (0–5)
          </span>
        )}
        {hasRom && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-5"
              style={{ borderTop: '2px dotted #d97706', display: 'inline-block', height: 0 }}
            />
            ADM (graus)
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
          0–20 grave
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ea580c]" />
          21–40 moderado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ca8a04]" />
          41–60 leve
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#65a30d]" />
          61–80 bom
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
          81–100 ótimo
        </span>
      </div>

      {/* Nota de rodapé */}
      <p className="mt-2 text-xs text-neutral-400">
        Pontuação funcional: informe Berg (0–56), Tinetti (0–28) ou outra escala adotada
      </p>
    </div>
  )
}
