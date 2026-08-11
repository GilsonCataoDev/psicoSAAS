import { MockSearchProvider } from './mock-search.provider'

describe('MockSearchProvider', () => {
  it('não faz nenhuma chamada de rede — apenas gera resultados sintéticos', async () => {
    const provider = new MockSearchProvider()
    const results = await provider.search('"psicóloga clínica" "Campinas" contato')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].source).toBe('own_site')
  })

  it('classifica corretamente resultados de busca do LinkedIn', async () => {
    const provider = new MockSearchProvider()
    const results = await provider.search('site:linkedin.com/in psicóloga clínica Campinas')
    expect(results[0].source).toBe('linkedin_search')
    expect(results[0].url).toContain('linkedin.com/in')
  })

  it('classifica corretamente resultados de busca do PsyMeet', async () => {
    const provider = new MockSearchProvider()
    const results = await provider.search('site:psymeetsocial.com psicóloga Campinas')
    expect(results[0].source).toBe('psymeet_search')
    expect(results[0].url).toContain('psymeetsocial.com')
  })

  it('respeita o limite maxResults', async () => {
    const provider = new MockSearchProvider()
    const results = await provider.search('"psicóloga" "Campinas"', { maxResults: 0 })
    expect(results.length).toBe(0)
  })

  it('cada resultado tem todos os campos obrigatórios de SearchResult', async () => {
    const provider = new MockSearchProvider()
    const [result] = await provider.search('"psicóloga clínica" "Campinas"')
    expect(result.title).toBeTruthy()
    expect(result.url).toBeTruthy()
    expect(result.snippet).toBeTruthy()
    expect(result.source).toBeTruthy()
    expect(typeof result.position).toBe('number')
    expect(result.discoveredAt).toBeInstanceOf(Date)
  })
})
