import { DedupeService, normalizeDomain, normalizeEmail, normalizePhone, normalizeName, canonicalUrl } from './dedupe.service'
import { Prospect } from '../entities/prospect.entity'

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: 'p1',
    website: null,
    professionalEmail: null,
    professionalPhone: null,
    sourceUrl: 'https://source.example.com/a',
    professionalName: null,
    city: null,
    linkedinUrl: null,
    psymeetUrl: null,
    ...overrides,
  } as Prospect
}

describe('normalizers', () => {
  it('normaliza domínio removendo www e protocolo', () => {
    expect(normalizeDomain('https://www.exemplo.com.br/pagina')).toBe('exemplo.com.br')
    expect(normalizeDomain('exemplo.com.br')).toBe('exemplo.com.br')
    expect(normalizeDomain(null)).toBeNull()
  })

  it('normaliza e-mail para minúsculo e sem espaços', () => {
    expect(normalizeEmail(' Contato@Exemplo.com ')).toBe('contato@exemplo.com')
  })

  it('normaliza telefone removendo formatação e código do país', () => {
    expect(normalizePhone('+55 (19) 99876-5432')).toBe('19998765432')
    expect(normalizePhone('(19) 99876-5432')).toBe('19998765432')
  })

  it('normaliza nome removendo acentos e caixa', () => {
    expect(normalizeName('Ana Cláudia')).toBe('ana claudia')
  })

  it('gera url canônica sem protocolo/www/barra final', () => {
    expect(canonicalUrl('https://www.exemplo.com/perfil/')).toBe('exemplo.com/perfil')
  })
})

describe('DedupeService.findMatch', () => {
  const dedupe = new DedupeService()

  it('casa por domínio normalizado', () => {
    const existing = [makeProspect({ website: 'https://www.exemplo.com.br' })]
    const match = dedupe.findMatch({ website: 'https://exemplo.com.br/contato' }, existing)
    expect(match).toBe(existing[0])
  })

  it('casa por e-mail profissional quando domínio não bate', () => {
    const existing = [makeProspect({ professionalEmail: 'ana@gmail.com' })]
    const match = dedupe.findMatch({ professionalEmail: 'Ana@Gmail.com' }, existing)
    expect(match).toBe(existing[0])
  })

  it('casa por telefone normalizado', () => {
    const existing = [makeProspect({ professionalPhone: '19998765432' })]
    const match = dedupe.findMatch({ professionalPhone: '+55 19 99876-5432' }, existing)
    expect(match).toBe(existing[0])
  })

  it('casa por URL canônica da fonte', () => {
    const existing = [makeProspect({ sourceUrl: 'https://www.diretorio.com/perfil/ana/' })]
    const match = dedupe.findMatch({ sourceUrl: 'https://diretorio.com/perfil/ana' }, existing)
    expect(match).toBe(existing[0])
  })

  it('casa por nome + cidade quando não há outros identificadores', () => {
    const existing = [makeProspect({ professionalName: 'Ana Cláudia', city: 'Campinas', sourceUrl: 'https://a.com' })]
    const match = dedupe.findMatch({ professionalName: 'ana claudia', city: 'campinas', sourceUrl: 'https://b.com' }, existing)
    expect(match).toBe(existing[0])
  })

  it('casa por URL do LinkedIn', () => {
    const existing = [makeProspect({ linkedinUrl: 'https://www.linkedin.com/in/ana-psi' })]
    const match = dedupe.findMatch({ linkedinUrl: 'https://linkedin.com/in/ana-psi', sourceUrl: 'https://x.com' }, existing)
    expect(match).toBe(existing[0])
  })

  it('casa por URL do PsyMeet', () => {
    const existing = [makeProspect({ psymeetUrl: 'https://psymeetsocial.com/perfil/ana' })]
    const match = dedupe.findMatch({ psymeetUrl: 'https://psymeetsocial.com/perfil/ana', sourceUrl: 'https://x.com' }, existing)
    expect(match).toBe(existing[0])
  })

  it('retorna null quando não há nenhum identificador em comum', () => {
    const existing = [makeProspect({ website: 'https://outro.com', professionalEmail: 'x@y.com' })]
    const match = dedupe.findMatch({ website: 'https://diferente.com', professionalEmail: 'z@w.com', sourceUrl: 'https://novo.com' }, existing)
    expect(match).toBeNull()
  })

  it('respeita a ordem de prioridade: domínio antes de nome+cidade', () => {
    const other = makeProspect({ id: 'p-other', professionalName: 'Ana', city: 'Campinas', sourceUrl: 'https://c.com' })
    const target = makeProspect({ id: 'p-target', website: 'https://mesmo-dominio.com' })
    const match = dedupe.findMatch(
      { website: 'https://mesmo-dominio.com', professionalName: 'Ana', city: 'Campinas', sourceUrl: 'https://d.com' },
      [other, target],
    )
    expect(match?.id).toBe('p-target')
  })
})
