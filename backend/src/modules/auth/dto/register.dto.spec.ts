import 'reflect-metadata'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { RegisterDto } from './register.dto'

function makeDto(overrides: Partial<Record<string, unknown>> = {}) {
  return plainToInstance(RegisterDto, {
    name: 'Ana Souza',
    email: 'ana@example.com',
    phone: '11987654321',
    password: 'Senha123!',
    termsAccepted: true,
    ...overrides,
  })
}

describe('RegisterDto — CRP condicional (isStudent)', () => {
  it('rejeita quando não é estudante e não envia CRP', async () => {
    const errors = await validate(makeDto())
    expect(errors.some(e => e.property === 'crp')).toBe(true)
  })

  it('rejeita CRP em formato inválido quando não é estudante', async () => {
    const errors = await validate(makeDto({ crp: 'abc' }))
    expect(errors.some(e => e.property === 'crp')).toBe(true)
  })

  it('aceita CRP válido quando não é estudante', async () => {
    const errors = await validate(makeDto({ crp: '06/123456' }))
    expect(errors.some(e => e.property === 'crp')).toBe(false)
  })

  it('aceita isStudent=true sem CRP nenhum (pula a validação de formato)', async () => {
    const errors = await validate(makeDto({ isStudent: true }))
    expect(errors.some(e => e.property === 'crp')).toBe(false)
  })

  it('aceita isStudent=true mesmo com CRP em branco explícito', async () => {
    const errors = await validate(makeDto({ isStudent: true, crp: '' }))
    expect(errors.some(e => e.property === 'crp')).toBe(false)
  })
})
