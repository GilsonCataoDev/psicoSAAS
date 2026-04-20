import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: ptBR })
}

export function formatDateRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Hoje'
  if (isTomorrow(d)) return 'Amanhã'
  if (isYesterday(d)) return 'Ontem'
  return format(d, "dd 'de' MMMM", { locale: ptBR })
}

export function formatTime(time: string): string {
  return time.substring(0, 5)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export const AVATAR_COLORS = [
  'bg-sage-200 text-sage-700',
  'bg-mist-200 text-mist-700',
  'bg-warm-200 text-warm-700',
  'bg-sand-200 text-sand-700',
  'bg-purple-200 text-purple-700',
  'bg-pink-200 text-pink-700',
  'bg-cyan-200 text-cyan-700',
  'bg-amber-200 text-amber-700',
]

export function pickAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural}`
}
