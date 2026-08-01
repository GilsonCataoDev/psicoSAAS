import { describe, expect, it } from 'vitest'
import {
  LEGACY_NOTES_MAX_FILE_SIZE,
  validateLegacyNoteDrafts,
  validateLegacyNoteFiles,
} from './legacy-notes-migration'

const file = (name: string, type = 'image/jpeg', size = 1000) => ({ name, type, size }) as File

describe('legacy notes migration validation', () => {
  it('accepts one or two supported pages', () => {
    expect(validateLegacyNoteFiles([file('pagina-1.jpg')])).toBeNull()
    expect(validateLegacyNoteFiles([file('pagina-1.jpg'), file('pagina-2.png', 'image/png')])).toBeNull()
  })

  it('rejects more than two pages, unsupported types and oversized files', () => {
    expect(validateLegacyNoteFiles([file('1.jpg'), file('2.jpg'), file('3.jpg')])).toContain('máximo duas')
    expect(validateLegacyNoteFiles([file('nota.txt', 'text/plain')])).toContain('não é PDF')
    expect(validateLegacyNoteFiles([file('grande.pdf', 'application/pdf', LEGACY_NOTES_MAX_FILE_SIZE + 1)])).toContain('10 MB')
  })

  it('requires a date and reviewed transcription for every evolution', () => {
    expect(validateLegacyNoteDrafts([{ id: '1', date: '', summary: 'Registro' }])).toContain('data')
    expect(validateLegacyNoteDrafts([{ id: '1', date: '2026-07-01', summary: '  ' }])).toContain('Transcreva')
    expect(validateLegacyNoteDrafts([{ id: '1', date: '2026-07-01', summary: 'Registro revisado' }])).toBeNull()
  })

  it('rejects future sessions', () => {
    expect(validateLegacyNoteDrafts([{ id: '1', date: '2999-01-01', summary: 'Registro revisado' }])).toContain('futuro')
  })
})
