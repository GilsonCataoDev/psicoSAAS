import { Patient, TAG_LABELS } from '@/types'

function normalizeSearch(value: string | number | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function onlyDigits(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '')
}

export function patientMatchesSearch(patient: Patient, query: string) {
  const normalizedQuery = normalizeSearch(query)
  const digitQuery = onlyDigits(query)
  if (!normalizedQuery && !digitQuery) return true

  const searchable = [
    patient.name,
    patient.email,
    patient.phone,
    patient.notes,
    patient.pronouns,
    patient.status,
    patient.tags?.join(' '),
    patient.tags?.map(tag => TAG_LABELS[tag]).join(' '),
  ]

  const textMatch = searchable
    .map(normalizeSearch)
    .some(value => value.includes(normalizedQuery))

  const digitMatch = !!digitQuery && onlyDigits(patient.phone).includes(digitQuery)

  return textMatch || digitMatch
}
