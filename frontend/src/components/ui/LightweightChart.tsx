import { useId, useLayoutEffect, useRef, useState } from 'react'

type ChartDatum = {
  label: string
  value: number
}

type LightweightChartProps = {
  data: ChartDatum[]
  height?: number
  color?: string
  fillOpacity?: number
  min?: number
  max?: number
  showYAxis?: boolean
  formatValue?: (value: number) => string
}

const FALLBACK_WIDTH = 320

function buildPoints(data: ChartDatum[], width: number, height: number, min?: number, max?: number) {
  const values = data.map(item => Number(item.value) || 0)
  const minValue = min ?? Math.min(0, ...values)
  const maxValue = max ?? Math.max(1, ...values)
  const range = Math.max(1, maxValue - minValue)
  const left = 36
  const right = 12
  const top = 8
  const bottom = 24
  const plotWidth = width - left - right
  const chartHeight = height - top - bottom

  return data.map((item, index) => {
    const x = left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth)
    const y = top + (1 - ((Number(item.value) || 0) - minValue) / range) * chartHeight
    return { ...item, x, y }
  })
}

function smoothPath(points: ReturnType<typeof buildPoints>) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    const prev = points[index - 1]
    const midX = (prev.x + point.x) / 2
    return `${path} C ${midX} ${prev.y}, ${midX} ${point.y}, ${point.x} ${point.y}`
  }, '')
}

/** Mede a largura real do container em pixels CSS, evitando esticar o viewBox
 * (preserveAspectRatio="none" com largura fixa distorce texto/traços). */
function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(FALLBACK_WIDTH)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    // Medição síncrona imediata — não depende do primeiro callback do
    // ResizeObserver, que pode não disparar em abas em background/inativas.
    const initial = el.getBoundingClientRect().width
    if (initial > 0) setWidth(initial)

    const observer = new ResizeObserver(entries => {
      const measured = entries[0]?.contentRect.width
      if (measured && measured > 0) setWidth(measured)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

export default function LightweightChart({
  data,
  height = 140,
  color = '#4DA8DA',
  fillOpacity = 0.18,
  min,
  max,
  showYAxis = false,
  formatValue = value => String(value),
}: LightweightChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const [containerRef, width] = useContainerWidth()
  const safeData = data.length > 0 ? data : [{ label: '', value: 0 }]
  const points = buildPoints(safeData, width, height, min, max)
  const linePath = smoothPath(points)
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${height - 24} L ${points[0].x} ${height - 24} Z`
    : ''
  const values = safeData.map(item => Number(item.value) || 0)
  const maxValue = max ?? Math.max(1, ...values)
  const minValue = min ?? Math.min(0, ...values)

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="100%"
        role="img"
        aria-label="Grafico de tendencia"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={fillOpacity} />
            <stop offset="95%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {showYAxis && [maxValue, (maxValue + minValue) / 2, minValue].map((tick, index) => (
          <g key={`${tick}-${index}`}>
            <line
              x1="36"
              x2={width - 12}
              y1={8 + index * ((height - 32) / 2)}
              y2={8 + index * ((height - 32) / 2)}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
            <text x="0" y={12 + index * ((height - 32) / 2)} fill="#a3a3a3" fontSize="11">
              {formatValue(tick)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />

        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="3" fill={color}>
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </circle>
            <text x={point.x} y={height - 7} textAnchor="middle" fill="#a3a3a3" fontSize="11">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
