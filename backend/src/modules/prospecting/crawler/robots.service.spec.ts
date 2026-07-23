import axios from 'axios'
import { RobotsService } from './robots.service'
import { SsrfGuard } from './ssrf-guard'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('RobotsService', () => {
  let ssrf: { assertSafeUrl: jest.Mock }
  let robots: RobotsService

  beforeEach(() => {
    ssrf = { assertSafeUrl: jest.fn().mockResolvedValue(new URL('https://proprio-site.com.br/robots.txt')) }
    robots = new RobotsService(ssrf as unknown as SsrfGuard)
    mockedAxios.get.mockReset()
  })

  it('permite acesso quando robots.txt não existe (404)', async () => {
    mockedAxios.get.mockResolvedValue({ status: 404, data: '' })
    const allowed = await robots.isAllowed('https://proprio-site.com.br/contato')
    expect(allowed).toBe(true)
  })

  it('bloqueia caminho listado em Disallow para User-agent *', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: 'User-agent: *\nDisallow: /contato\n',
    })
    const allowed = await robots.isAllowed('https://proprio-site.com.br/contato')
    expect(allowed).toBe(false)
  })

  it('permite caminho não listado em Disallow', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: 'User-agent: *\nDisallow: /admin\n',
    })
    const allowed = await robots.isAllowed('https://proprio-site.com.br/contato')
    expect(allowed).toBe(true)
  })

  it('Allow mais específico vence Disallow mais genérico', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: 'User-agent: *\nDisallow: /\nAllow: /contato\n',
    })
    const allowed = await robots.isAllowed('https://proprio-site.com.br/contato')
    expect(allowed).toBe(true)
    const blocked = await robots.isAllowed('https://proprio-site.com.br/outra-pagina')
    expect(blocked).toBe(false)
  })

  it('falha fechada (bloqueia) quando robots.txt não pode ser buscado', async () => {
    mockedAxios.get.mockRejectedValue(new Error('timeout'))
    const allowed = await robots.isAllowed('https://proprio-site.com.br/contato')
    expect(allowed).toBe(false)
  })

  it('falha fechada quando a URL não passa no SSRF guard', async () => {
    ssrf.assertSafeUrl.mockRejectedValue(new Error('bloqueado por SSRF'))
    const allowed = await robots.isAllowed('https://proprio-site.com.br/contato')
    expect(allowed).toBe(false)
  })
})
