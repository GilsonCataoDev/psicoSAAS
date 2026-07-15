import { secretsMatch, hashToken, generateCsrfToken } from './encrypt.util'

describe('secretsMatch', () => {
  it('aceita segredos iguais', () => {
    expect(secretsMatch('meu-segredo-webhook', 'meu-segredo-webhook')).toBe(true)
  })

  it('rejeita segredos diferentes', () => {
    expect(secretsMatch('errado', 'meu-segredo-webhook')).toBe(false)
  })

  it('rejeita segredos de comprimentos diferentes sem lançar', () => {
    expect(secretsMatch('curto', 'um-segredo-bem-mais-longo-que-o-outro')).toBe(false)
  })

  it('rejeita quando o valor recebido está ausente', () => {
    expect(secretsMatch(undefined, 'esperado')).toBe(false)
    expect(secretsMatch('', 'esperado')).toBe(false)
  })

  it('falha fechado quando o segredo esperado não está configurado', () => {
    expect(secretsMatch('qualquer', undefined)).toBe(false)
    expect(secretsMatch('qualquer', '')).toBe(false)
  })
})

describe('hashToken', () => {
  it('é determinístico e não retorna o próprio token', () => {
    const token = 'token-de-reset-123'
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).not.toContain(token)
    expect(hashToken(token)).toHaveLength(64) // SHA-256 hex
  })
})

describe('generateCsrfToken', () => {
  const OLD_SECRET = process.env.JWT_SECRET
  beforeAll(() => { process.env.JWT_SECRET = 'segredo-de-teste-com-32-caracteres!!' })
  afterAll(() => { process.env.JWT_SECRET = OLD_SECRET })

  it('gera tokens distintos para usuários distintos', () => {
    expect(generateCsrfToken('user-a')).not.toBe(generateCsrfToken('user-b'))
  })

  it('gera token diferente quando o csrfSeed muda (rotação por sessão)', () => {
    expect(generateCsrfToken('user-a', 'seed-1')).not.toBe(generateCsrfToken('user-a', 'seed-2'))
    expect(generateCsrfToken('user-a', 'seed-1')).not.toBe(generateCsrfToken('user-a'))
  })
})
