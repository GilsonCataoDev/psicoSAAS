import { cn } from '@/lib/utils'

type BrandLogoProps = {
  compact?: boolean
  light?: boolean
  className?: string
}

export default function BrandLogo({ compact = false, light = false, className }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 48 48"
        className="h-9 w-9 shrink-0"
        role="img"
        aria-label="UseCognia"
      >
        <defs>
          <linearGradient id="cognia-mark" x1="8" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B3EFF" />
            <stop offset="1" stopColor="#4DA8DA" />
          </linearGradient>
        </defs>
        <path
          d="M28 7.5C16.6 7.5 8 15.5 8 24s8.6 16.5 20 16.5"
          fill="none"
          stroke="url(#cognia-mark)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M28.5 14.5c4.6 0 8.5 3.6 8.8 8.2 2.9.8 5.1 3.5 5.1 6.7 0 3.7-2.9 6.8-6.6 7"
          fill="none"
          stroke="url(#cognia-mark)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M28 18.5v16M28 24l8-4.5M28 24l8.5 5M28 31l6 4"
          fill="none"
          stroke="#5B3EFF"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {[['28', '24'], ['36', '19.5'], ['36.5', '29'], ['34', '35'], ['28', '31']].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.1" fill="#5B3EFF" />
        ))}
      </svg>
      {!compact && (
        <span className={cn('font-display text-xl font-bold tracking-tight', light ? 'text-white' : 'text-neutral-900')}>
          Use<span className={light ? 'text-white' : 'text-sage-500'}>Cognia</span>
        </span>
      )}
    </div>
  )
}
