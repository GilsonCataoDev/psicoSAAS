import axios from 'axios'
import { TavilySearchProvider } from './tavily-search.provider'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('TavilySearchProvider', () => {
  let postMock: jest.Mock

  beforeEach(() => {
    postMock = jest.fn()
    mockedAxios.create.mockReturnValue({ post: postMock } as any)
    mockedAxios.isAxiosError.mockReturnValue(false)
    process.env.PROSPECTING_SEARCH_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.PROSPECTING_SEARCH_API_KEY
    jest.clearAllMocks()
  })

  it('lança erro claro quando falta a API key', async () => {
    delete process.env.PROSPECTING_SEARCH_API_KEY
    const provider = new TavilySearchProvider()
    await expect(provider.search('query')).rejects.toThrow(/PROSPECTING_SEARCH_API_KEY/)
  })

  it('converte results[] do Tavily em SearchResult[]', async () => {
    postMock.mockResolvedValue({ data: { results: [{ title: 'A', url: 'https://a.com', content: 'desc' }] } })
    const provider = new TavilySearchProvider()
    const results = await provider.search('query')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ title: 'A', url: 'https://a.com', snippet: 'desc', source: 'tavily' })
  })

  it('envia query e max_results no corpo, com Bearer no header', async () => {
    postMock.mockResolvedValue({ data: { results: [] } })
    const provider = new TavilySearchProvider()
    await provider.search('psicóloga campinas', { maxResults: 5 })
    expect(postMock).toHaveBeenCalledWith(
      'https://api.tavily.com/search',
      { query: 'psicóloga campinas', max_results: 5 },
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) }),
    )
  })

  it('limita max_results a 20 mesmo se pedirem mais', async () => {
    postMock.mockResolvedValue({ data: { results: [] } })
    const provider = new TavilySearchProvider()
    await provider.search('query', { maxResults: 100 })
    expect(postMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ max_results: 20 }), expect.any(Object))
  })

  it('descarta itens sem url', async () => {
    postMock.mockResolvedValue({ data: { results: [{ title: 'Sem url', content: 'x' }] } })
    const provider = new TavilySearchProvider()
    const results = await provider.search('query')
    expect(results).toHaveLength(0)
  })

  it('não tenta novamente quando a cota é excedida (429/432)', async () => {
    const err: any = new Error('quota exceeded')
    err.response = { status: 432 }
    postMock.mockRejectedValue(err)
    mockedAxios.isAxiosError.mockReturnValue(true)
    const provider = new TavilySearchProvider()
    await expect(provider.search('query')).rejects.toThrow('quota exceeded')
    expect(postMock).toHaveBeenCalledTimes(1)
  })

  it('tenta novamente em erro transitório e desiste após o limite', async () => {
    postMock.mockRejectedValue(new Error('network error'))
    const provider = new TavilySearchProvider()
    await expect(provider.search('query')).rejects.toThrow('network error')
    expect(postMock).toHaveBeenCalledTimes(2)
  })
})
