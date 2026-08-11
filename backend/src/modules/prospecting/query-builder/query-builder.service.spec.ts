import { QueryBuilderService, NEGATIVE_TERMS } from './query-builder.service'

describe('QueryBuilderService', () => {
  const svc = new QueryBuilderService()

  it('gera query de site próprio com cidade e termos negativos', () => {
    const [query] = svc.build({ city: 'Campinas', sources: ['own_site'] })
    expect(query).toContain('Campinas')
    expect(query).toContain('-paciente')
    expect(query).toContain('-vaga')
  })

  it('gera query com operador site: para LinkedIn', () => {
    const queries = svc.build({ city: 'Campinas', sources: ['linkedin_search'] })
    expect(queries.some(q => q.includes('site:linkedin.com/in'))).toBe(true)
  })

  it('gera queries com operador site: para PsyMeet (dois domínios)', () => {
    const queries = svc.build({ city: 'São Paulo', sources: ['psymeet_search'] })
    expect(queries.some(q => q.includes('site:psymeetsocial.com'))).toBe(true)
    expect(queries.some(q => q.includes('site:psymeet.com.br'))).toBe(true)
  })

  it('inclui estado quando informado', () => {
    const [query] = svc.build({ city: 'Curitiba', state: 'PR', sources: ['own_site'] })
    expect(query).toContain('PR')
  })

  it('remove duplicatas quando múltiplas fontes geram a mesma query', () => {
    const queries = svc.build({ city: 'Campinas', sources: ['own_site', 'own_site'] as any })
    expect(new Set(queries).size).toBe(queries.length)
  })

  it('todos os termos negativos definidos estão disponíveis para exclusão', () => {
    expect(NEGATIVE_TERMS).toEqual(expect.arrayContaining(['paciente', 'CRP', 'CFP', 'vaga', 'PDF']))
  })
})
