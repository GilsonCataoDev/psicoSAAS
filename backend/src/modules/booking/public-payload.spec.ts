import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * `GET /public/booking/:slug` nao exige autenticacao: tudo que ele devolve fica
 * visivel para qualquer pessoa com o link.
 *
 * O payload era montado espalhando a entidade (`...pageData`), o que expunha a
 * `pixKey` do profissional — no Brasil, quase sempre o CPF — sem que a pagina
 * publica usasse esse campo para nada.
 *
 * Este teste trava a allowlist: campo sensivel novo nao entra por descuido de
 * um spread.
 */
describe('payload publico da pagina de agendamento', () => {
  const source = readFileSync(join(__dirname, 'booking.service.ts'), 'utf8')

  /**
   * Corpo de getPublicPage SEM comentarios — o comentario que documenta este
   * cuidado cita `pixKey` e `...pageData` de proposito, e faria o teste casar
   * com a propria explicacao em vez do codigo.
   */
  const getPublicPage = (() => {
    const start = source.indexOf('async getPublicPage(')
    const end = source.indexOf('async getAvailableSlots(', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    return source
      .slice(start, end)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
  })()

  it('nao devolve a chave PIX do profissional', () => {
    expect(getPublicPage).not.toMatch(/\bpixKey\b/)
  })

  it('monta o retorno campo a campo, sem espalhar a entidade', () => {
    // `...pageData` / `...page` traria qualquer coluna nova da tabela para a
    // rota publica automaticamente — inclusive as sensiveis.
    expect(getPublicPage).not.toMatch(/\.\.\.\s*pageData/)
    expect(getPublicPage).not.toMatch(/\.\.\.\s*page\b/)
  })

  it('continua entregando o que a pagina publica precisa', () => {
    for (const field of ['psychologistName', 'profession', 'allowOnline', 'allowPresencial', 'sessionPrice', 'slug']) {
      expect(getPublicPage).toContain(field)
    }
  })
})
