import { Injectable } from '@nestjs/common'
import { Prospect } from '../entities/prospect.entity'

export interface DedupeCandidate {
  website?: string | null
  professionalEmail?: string | null
  professionalPhone?: string | null
  sourceUrl?: string | null
  professionalName?: string | null
  city?: string | null
  linkedinUrl?: string | null
  psymeetUrl?: string | null
}

export function normalizeDomain(url?: string | null): string | null {
  if (!url) return null
  try {
    const { hostname } = new URL(url.includes('://') ? url : `https://${url}`)
    return hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null
  return email.trim().toLowerCase()
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  // Remove código do país 55 quando presente, mantém DDD+número.
  return digits.length > 11 && digits.startsWith('55') ? digits.slice(2) : digits
}

export function normalizeName(name?: string | null): string | null {
  if (!name) return null
  return name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function canonicalUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url.includes('://') ? url : `https://${url}`)
    return `${parsed.hostname.toLowerCase().replace(/^www\./, '')}${parsed.pathname.replace(/\/$/, '')}`
  } catch {
    return null
  }
}

/**
 * Aplica a cadeia de deduplicação na ordem especificada: domínio normalizado,
 * e-mail profissional, telefone normalizado, URL canônica, nome+cidade,
 * URLs do LinkedIn/PsyMeet. Retorna o primeiro prospect existente que casar
 * com qualquer regra, ou null se nenhum casar (novo lead).
 */
@Injectable()
export class DedupeService {
  findMatch(candidate: DedupeCandidate, existing: Prospect[]): Prospect | null {
    const candidateDomain = normalizeDomain(candidate.website)
    if (candidateDomain) {
      const match = existing.find(p => normalizeDomain(p.website) === candidateDomain)
      if (match) return match
    }

    const candidateEmail = normalizeEmail(candidate.professionalEmail)
    if (candidateEmail) {
      const match = existing.find(p => normalizeEmail(p.professionalEmail) === candidateEmail)
      if (match) return match
    }

    const candidatePhone = normalizePhone(candidate.professionalPhone)
    if (candidatePhone) {
      const match = existing.find(p => normalizePhone(p.professionalPhone) === candidatePhone)
      if (match) return match
    }

    const candidateCanonical = canonicalUrl(candidate.sourceUrl)
    if (candidateCanonical) {
      const match = existing.find(p => canonicalUrl(p.sourceUrl) === candidateCanonical)
      if (match) return match
    }

    const candidateName = normalizeName(candidate.professionalName)
    const candidateCity = normalizeName(candidate.city)
    if (candidateName && candidateCity) {
      const match = existing.find(p =>
        normalizeName(p.professionalName) === candidateName && normalizeName(p.city) === candidateCity)
      if (match) return match
    }

    if (candidate.linkedinUrl) {
      const match = existing.find(p => p.linkedinUrl && canonicalUrl(p.linkedinUrl) === canonicalUrl(candidate.linkedinUrl))
      if (match) return match
    }
    if (candidate.psymeetUrl) {
      const match = existing.find(p => p.psymeetUrl && canonicalUrl(p.psymeetUrl) === canonicalUrl(candidate.psymeetUrl))
      if (match) return match
    }

    return null
  }
}
