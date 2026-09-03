import axios from 'axios'
import { GoogleCustomSearchProvider } from './google-custom-search.provider'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('GoogleCustomSearchProvider', () => {
  let getMock: jest.Mock

  beforeEach(() => {
    getMock = jest.fn()
    mockedAxios.create.mockReturnValue({ get: getMock } as any)
    mockedAxios.isAxiosError.mockReturnValue(false)
    process.env.PROSPECTING_SEARCH_API_KEY = 'test-key'
    process.env.PROSPECTING_SEARCH_ENGINE_ID = 'test-cx'
  })

  afterEach(() => {
    delete process.env.PROSPECTING_SEARCH_API_KEY
    delete process.env.PROSPECTING_SEARCH_ENGINE_ID
    jest.clearAllMocks()
  })

  it('lança erro claro quando faltam credenciais', async () => {
    delete process.env.PROSPECTING_SEARCH_ENGINE_ID
    const provider = new GoogleCustomSearchProvider()
    await expect(provider.search('query')).rejects.toThrow(/PROSPECTING_SEARCH_API_KEY.*PROSPECTING_SEARCH_ENGINE_ID/)
  })

  it('converte items[] do Google em SearchResult[]', async () => {
    getMock.mockResolvedValue({ data: { items: [{ title: 'A', link: 'https://a.com', snippet: 'desc' }] } })
    const provider = new GoogleCustomSearchProvider()
    const results = await provider.search('query')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ title: 'A', url: 'https://a.com', snippet: 'desc', source: 'google' })
  })

  it('envia key, cx e q como query params (não Bearer header)', async () => {
    getMock.mockResolvedValue({ data: { items: [] } })
    const provider = new GoogleCustomSearchProvider()
    await provider.search('psicóloga campinas', { maxResults: 5 })
    expect(getMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/customsearch/v1',
      expect.objectContaining({
        params: { key: 'test-key', cx: 'test-cx', q: 'psicóloga campinas', num: 5 },
      }),
    )
  })

  it('limita num a 10 mesmo se maxResults pedir mais (limite da API do Google)', async () => {
    getMock.mockResolvedValue({ data: { items: [] } })
    const provider = new GoogleCustomSearchProvider()
    await provider.search('query', { maxResults: 50 })
    expect(getMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ params: expect.objectContaining({ num: 10 }) }))
  })

  it('descarta itens sem link', async () => {
    getMock.mockResolvedValue({ data: { items: [{ title: 'Sem link', snippet: 'x' }] } })
    const provider = new GoogleCustomSearchProvider()
    const results = await provider.search('query')
    expect(results).toHaveLength(0)
  })

  it('propaga erro retornado no corpo (error.message do Google)', async () => {
    getMock.mockResolvedValue({ data: { error: { code: 400, message: 'API key inválida' } } })
    const provider = new GoogleCustomSearchProvider()
    await expect(provider.search('query')).rejects.toThrow(/API key inválida/)
  })

  it('não tenta novamente quando a cota diária é excedida (429)', async () => {
    const err: any = new Error('quota exceeded')
    err.response = { status: 429 }
    getMock.mockRejectedValue(err)
    mockedAxios.isAxiosError.mockReturnValue(true)
    const provider = new GoogleCustomSearchProvider()
    await expect(provider.search('query')).rejects.toThrow('quota exceeded')
    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it('tenta novamente em erro transitório e desiste após o limite', async () => {
    getMock.mockRejectedValue(new Error('network error'))
    const provider = new GoogleCustomSearchProvider()
    await expect(provider.search('query')).rejects.toThrow('network error')
    expect(getMock).toHaveBeenCalledTimes(2)
  })
})
