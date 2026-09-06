import { useId } from 'react'

type BrandLogoProps = {
  compact?: boolean
  light?: boolean
  className?: string
}

export default function BrandLogo({ compact = false, light = false, className }: BrandLogoProps) {
  const id = `mark-${useId().replace(/:/g, '')}`

  const nodeTop = light ? '#3EFFC0' : '#1D6B50'
  const nodeAlt = light ? '#7BAAE8' : '#2F7657'
  const stroke = light ? `url(#${id})` : '#2F7657'

  return (
    <div className={['flex items-center gap-2.5', className].filter(Boolean).join(' ')}>
      <svg viewBox="0 0 48 48" className="h-9 w-9 shrink-0" role="img" aria-label="UseCognia" fill="none">
        <defs>
          <linearGradient id={id} x1="14" y1="10" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3EFFC0" />
            <stop offset="1" stopColor="#4DA8DA" />
          </linearGradient>
        </defs>
        {/* Crescent arc */}
        <path d="M12 30 Q24 44 36 30" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
        {/* Top ring arc */}
        <path d="M14 22 A10 10 0 0 1 34 22" stroke={stroke} strokeWidth="1.2" opacity="0.6" />
        {/* X connecting lines */}
        <line x1="18" y1="31" x2="30" y2="12" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        <line x1="30" y1="31" x2="18" y2="12" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        <line x1="14" y1="22" x2="34" y2="22" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        {/* Nodes */}
        <circle cx="24" cy="12" r="2.8" fill={nodeTop} />
        <circle cx="14" cy="22" r="2.8" fill={nodeAlt} />
        <circle cx="34" cy="22" r="2.8" fill={nodeTop} />
        <circle cx="18" cy="31" r="2.8" fill={nodeAlt} />
        <circle cx="30" cy="31" r="2.8" fill={nodeAlt} />
      </svg>
      {!compact && (
        <span className={`font-display text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-neutral-900'}`}>
          Use<span className={light ? 'text-[#3EFFC0]' : 'text-[#2F7657] dark:text-[#B7DFCD]'}>Cognia</span>
        </span>
      )}
    </div>
  )
}
