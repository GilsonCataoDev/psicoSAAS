import axios from 'axios'
import { SiteCrawlerService } from './site-crawler.service'
import { SsrfGuard } from './ssrf-guard'
import { RobotsService } from './robots.service'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('SiteCrawlerService — limites de coleta', () => {
  let ssrf: SsrfGuard
  let robots: { isAllowed: jest.Mock }
  let crawler: SiteCrawlerService

  beforeEach(() => {
    process.env.PROSPECTING_CRAWL_DELAY_MS = '0'
    process.env.PROSPECTING_MAX_PAGES_PER_DOMAIN = '1'
    ssrf = new SsrfGuard()
    // Evita depender de DNS real em teste: a validação de SSRF em si já é
    // coberta isoladamente por ssrf-guard.spec.ts.
    jest.spyOn(ssrf, 'assertSafeUrl').mockImplementation(async (url: string) => new URL(url))
    robots = { isAllowed: jest.fn().mockResolvedValue(true) }
    crawler = new SiteCrawlerService(ssrf, robots as unknown as RobotsService)
    mockedAxios.get.mockReset()
  })

  it('nunca acessa diretamente domínios do LinkedIn', async () => {
    const pages = await crawler.crawlSite('https://www.linkedin.com/in/alguem')
    expect(pages).toEqual([])
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('nunca acessa diretamente domínios do PsyMeet', async () => {
    const pages1 = await crawler.crawlSite('https://psymeetsocial.com/perfil/x')
    const pages2 = await crawler.crawlSite('https://psymeet.com.br/perfil/x')
    expect(pages1).toEqual([])
    expect(pages2).toEqual([])
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('não acessa página quando robots.txt não permite', async () => {
    robots.isAllowed.mockResolvedValue(false)
    const pages = await crawler.crawlSite('https://proprio-site.com.br')
    expect(pages).toEqual([])
    expect(mockedAxios.get).not.toHaveBeenCalled()
  })

  it('acessa site próprio quando robots.txt permite e retorna HTML', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      data: '<html>ola</html>',
    })
    const pages = await crawler.crawlSite('https://proprio-site.com.br')
    expect(pages.length).toBeGreaterThan(0)
    expect(pages[0].html).toContain('ola')
  })

  it('ignora páginas que não sejam text/html', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      headers: { 'content-type': 'application/pdf' },
      data: '%PDF-1.4',
    })
    const pages = await crawler.crawlSite('https://proprio-site.com.br')
    expect(pages).toEqual([])
  })
})
