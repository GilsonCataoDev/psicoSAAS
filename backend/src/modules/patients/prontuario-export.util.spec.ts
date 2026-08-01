import { BadRequestException } from '@nestjs/common'
import { canIncludePrivateNotes, filterProntuarioSessions, normalizeProntuarioExportOptions } from './prontuario-export.util'

describe('prontuario export', () => {
  it('uses the professional export with every section by default', () => {
    const options = normalizeProntuarioExportOptions()

    expect(options.audience).toBe('professional')
    expect(options.sections.size).toBe(4)
  })

  it('filters evolutions by the selected period', () => {
    const options = normalizeProntuarioExportOptions({
      audience: 'patient',
      fromDate: '2026-02-01',
      toDate: '2026-02-28',
    })

    expect(filterProntuarioSessions([
      { id: '1', date: '2026-01-31' },
      { id: '2', date: '2026-02-10' },
      { id: '3', date: '2026-03-01' },
    ], options)).toEqual([{ id: '2', date: '2026-02-10' }])
  })

  it('never includes private notes in the patient copy', () => {
    expect(canIncludePrivateNotes(normalizeProntuarioExportOptions({ audience: 'patient' }))).toBe(false)
    expect(canIncludePrivateNotes(normalizeProntuarioExportOptions({ audience: 'professional' }))).toBe(true)
  })

  it('rejects an inverted period', () => {
    expect(() => normalizeProntuarioExportOptions({
      fromDate: '2026-03-01',
      toDate: '2026-02-01',
    })).toThrow(BadRequestException)
  })
})
