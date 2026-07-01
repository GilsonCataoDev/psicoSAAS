import { useId } from 'react'

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

const VIEWBOX_WIDTH = 640

function buildPoints(data: ChartDatum[], height: number, min?: number, max?: number) {
  const values = data.map(item => Number(item.value) || 0)
  const minValue = min ?? Math.min(0, ...values)
  const maxValue = max ?? Math.max(1, ...values)
  const range = Math.max(1, maxValue - minValue)
  const left = 36
  const right = 12
  const top = 8
  const bottom = 24
  const width = VIEWBOX_WIDTH - left - right
  const chartHeight = height - top - bottom

  return data.map((item, index) => {
    const x = left + (data.length === 1 ? width / 2 : (index / (data.length - 1)) * width)
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
  const safeData = data.length > 0 ? data : [{ label: '', value: 0 }]
  const points = buildPoints(safeData, height, min, max)
  const linePath = smoothPath(points)
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${height - 24} L ${points[0].x} ${height - 24} Z`
    : ''
  const values = safeData.map(item => Number(item.value) || 0)
  const maxValue = max ?? Math.max(1, ...values)
  const minValue = min ?? Math.min(0, ...values)

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
      width="100%"
      height="100%"
      role="img"
      aria-label="Grafico de tendencia"
      preserveAspectRatio="none"
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
            x2={VIEWBOX_WIDTH - 12}
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
  )
}
