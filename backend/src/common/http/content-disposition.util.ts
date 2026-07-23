export function pdfAttachment(filename: string): string {
  return contentDisposition(filename, 'documento.pdf')
}

export function csvAttachment(filename: string): string {
  return contentDisposition(filename, 'arquivo.csv')
}

function contentDisposition(filename: string, defaultFilename: string): string {
  const fallback = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/["\\]/g, '')
    .replace(/[^a-zA-Z0-9_. -]/g, '_')
    .trim() || defaultFilename

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}
