export const LEGACY_NOTES_MAX_FILES = 2
export const LEGACY_NOTES_MAX_FILE_SIZE = 10 * 1024 * 1024
export const LEGACY_NOTES_MAX_ENTRIES = 20

export const LEGACY_NOTES_ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const

type FileLike = Pick<File, 'name' | 'size' | 'type'>

export type LegacyNoteDraft = {
  id: string
  date: string
  summary: string
  created?: boolean
}

export function validateLegacyNoteFiles(files: FileLike[]): string | null {
  if (files.length === 0) return 'Selecione ao menos uma foto ou PDF.'
  if (files.length > LEGACY_NOTES_MAX_FILES) return 'Selecione no máximo duas páginas.'

  for (const file of files) {
    if (!LEGACY_NOTES_ALLOWED_TYPES.includes(file.type as typeof LEGACY_NOTES_ALLOWED_TYPES[number])) {
      return `O arquivo "${file.name}" não é PDF, JPG ou PNG.`
    }
    if (file.size > LEGACY_NOTES_MAX_FILE_SIZE) {
      return `O arquivo "${file.name}" deve ter no máximo 10 MB.`
    }
  }
  return null
}

export function validateLegacyNoteDrafts(drafts: LegacyNoteDraft[]): string | null {
  if (drafts.length === 0) return 'Adicione ao menos uma evolução.'
  if (drafts.length > LEGACY_NOTES_MAX_ENTRIES) return `Adicione no máximo ${LEGACY_NOTES_MAX_ENTRIES} evoluções por migração.`

  const today = new Date().toISOString().slice(0, 10)
  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return `Informe a data da evolução ${index + 1}.`
    if (draft.date > today) return `A data da evolução ${index + 1} não pode estar no futuro.`
    if (!draft.summary.trim()) return `Transcreva o conteúdo da evolução ${index + 1}.`
    if (draft.summary.trim().length > 12000) return `A evolução ${index + 1} deve ter no máximo 12.000 caracteres.`
  }
  return null
}
