import axios from 'axios'
import { GenericHttpSearchProvider } from './generic-http-search.provider'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('GenericHttpSearchProvider', () => {
  let getMock: jest.Mock

  beforeEach(() => {
    getMock = jest.fn()
    mockedAxios.create.mockReturnValue({ get: getMock } as any)
    process.env.PROSPECTING_SEARCH_BASE_URL = 'https://search.example.com/v1'
    process.env.PROSPECTING_SEARCH_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.PROSPECTING_SEARCH_BASE_URL
    delete process.env.PROSPECTING_SEARCH_API_KEY
  })

  it('lança erro claro quando PROSPECTING_SEARCH_BASE_URL não está configurado', async () => {
    delete process.env.PROSPECTING_SEARCH_BASE_URL
    const provider = new GenericHttpSearchProvider()
    await expect(provider.search('query')).rejects.toThrow(/PROSPECTING_SEARCH_BASE_URL/)
  })

  it('converte resultados de results[] para SearchResult[]', async () => {
    getMock.mockResolvedValue({ data: { results: [{ title: 'A', url: 'https://a.com', snippet: 'desc' }] } })
    const provider = new GenericHttpSearchProvider()
    const results = await provider.search('query')
    expect(results).toHaveLength(1)
    expect(results[0].url).toBe('https://a.com')
    expect(results[0].source).toBe('http')
  })

  it('descarta itens sem url', async () => {
    getMock.mockResolvedValue({ data: { results: [{ title: 'Sem URL', snippet: 'x' }] } })
    const provider = new GenericHttpSearchProvider()
    const results = await provider.search('query')
    expect(results).toHaveLength(0)
  })

  it('tenta novamente em caso de erro e desiste após o limite de tentativas', async () => {
    getMock.mockRejectedValue(new Error('network error'))
    const provider = new GenericHttpSearchProvider()
    await expect(provider.search('query')).rejects.toThrow('network error')
    expect(getMock).toHaveBeenCalledTimes(2)
  })

  it('retorna itens com sucesso na segunda tentativa após uma falha', async () => {
    getMock
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ data: { items: [{ title: 'B', link: 'https://b.com', description: 'y' }] } })
    const provider = new GenericHttpSearchProvider()
    const results = await provider.search('query')
    expect(results).toHaveLength(1)
    expect(results[0].url).toBe('https://b.com')
  })
})
