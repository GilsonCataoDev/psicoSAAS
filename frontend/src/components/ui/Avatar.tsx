import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  colorClass?: string
  size?: 'sm' | 'md' | 'lg'
  src?: string
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export default function Avatar({ name, colorClass = 'bg-sage-100 text-sage-700', size = 'md', src }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size])}
      />
    )
  }

  return (
    <div className={cn('rounded-full flex items-center justify-center font-semibold shrink-0', sizes[size], colorClass)}>
      {getInitials(name)}
    </div>
  )
}
