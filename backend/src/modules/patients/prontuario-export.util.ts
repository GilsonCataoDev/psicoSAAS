import { BadRequestException } from '@nestjs/common'
import {
  PRONTUARIO_EXPORT_SECTIONS,
  ProntuarioExportSection,
} from './dto/export-prontuario.dto'

export type ProntuarioExportOptions = {
  audience?: 'professional' | 'patient'
  fromDate?: string
  toDate?: string
  sections?: ProntuarioExportSection[]
}

export type NormalizedProntuarioExportOptions = {
  audience: 'professional' | 'patient'
  fromDate?: string
  toDate?: string
  sections: Set<ProntuarioExportSection>
}

function isValidDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function normalizeProntuarioExportOptions(
  options: ProntuarioExportOptions = {},
): NormalizedProntuarioExportOptions {
  if (options.fromDate && !isValidDate(options.fromDate)) {
    throw new BadRequestException('Data inicial invalida.')
  }
  if (options.toDate && !isValidDate(options.toDate)) {
    throw new BadRequestException('Data final invalida.')
  }
  if (options.fromDate && options.toDate && options.fromDate > options.toDate) {
    throw new BadRequestException('A data inicial deve ser anterior a data final.')
  }

  return {
    audience: options.audience ?? 'professional',
    fromDate: options.fromDate,
    toDate: options.toDate,
    sections: new Set(options.sections?.length ? options.sections : PRONTUARIO_EXPORT_SECTIONS),
  }
}

export function filterProntuarioSessions<T extends { date: string }>(
  sessions: T[],
  options: NormalizedProntuarioExportOptions,
) {
  return sessions.filter(session => {
    const date = session.date.slice(0, 10)
    return (!options.fromDate || date >= options.fromDate)
      && (!options.toDate || date <= options.toDate)
  })
}

export function canIncludePrivateNotes(options: NormalizedProntuarioExportOptions) {
  return options.audience === 'professional'
}
