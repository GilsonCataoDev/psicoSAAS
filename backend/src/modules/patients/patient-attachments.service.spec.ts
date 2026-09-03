import { contentMatchesMime } from './patient-attachments.service'

const PDF  = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(16)])
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)])
const PNG  = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)])
const HTML = Buffer.concat([Buffer.from('<script>alert(1)</script>'), Buffer.alloc(16)])

describe('contentMatchesMime', () => {
  it('aceita PDF real declarado como application/pdf', () => {
    expect(contentMatchesMime(PDF, 'application/pdf')).toBe(true)
  })

  it('aceita JPEG real declarado como image/jpeg', () => {
    expect(contentMatchesMime(JPEG, 'image/jpeg')).toBe(true)
    expect(contentMatchesMime(JPEG, 'image/jpg')).toBe(true)
  })

  it('aceita PNG real declarado como image/png', () => {
    expect(contentMatchesMime(PNG, 'image/png')).toBe(true)
  })

  it('rejeita HTML disfarçado de imagem (mimetype mentiroso)', () => {
    expect(contentMatchesMime(HTML, 'image/png')).toBe(false)
    expect(contentMatchesMime(HTML, 'image/jpeg')).toBe(false)
    expect(contentMatchesMime(HTML, 'application/pdf')).toBe(false)
  })

  it('rejeita conteúdo trocado entre formatos permitidos', () => {
    expect(contentMatchesMime(PNG, 'application/pdf')).toBe(false)
    expect(contentMatchesMime(PDF, 'image/png')).toBe(false)
  })

  it('rejeita MIME fora da lista permitida mesmo com conteúdo válido', () => {
    expect(contentMatchesMime(PDF, 'text/html')).toBe(false)
  })

  it('rejeita buffers vazios ou minúsculos', () => {
    expect(contentMatchesMime(Buffer.alloc(0), 'application/pdf')).toBe(false)
    expect(contentMatchesMime(Buffer.from('ab'), 'image/png')).toBe(false)
  })
})
