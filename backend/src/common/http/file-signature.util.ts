/**
 * Valida o tipo real de um arquivo pelos primeiros bytes (magic numbers),
 * em vez de confiar no mimetype declarado pelo cliente — usado para anexos
 * clínicos, onde um mimetype forjado não deve passar pela validação.
 */
export type AllowedFileType = 'application/pdf' | 'image/jpeg' | 'image/png'

export function detectFileSignature(buffer: Buffer): AllowedFileType | null {
  if (buffer.length < 4) return null

  // %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf'
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png'
  }
  return null
}
