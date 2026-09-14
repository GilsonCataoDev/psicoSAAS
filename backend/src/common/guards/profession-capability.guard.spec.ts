import 'reflect-metadata'
import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ProfessionCapabilityGuard } from './profession-capability.guard'

function context(profession?: string, authenticated = true) {
  return {
    getHandler: () => class Handler {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => (authenticated ? { user: { profession } } : {}) }),
  } as any
}

describe('ProfessionCapabilityGuard', () => {
  it('permite a ferramenta para a profissão habilitada', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue('instruments') } as unknown as Reflector
    expect(new ProfessionCapabilityGuard(reflector).canActivate(context('psicologia'))).toBe(true)
  })

  it('nega no servidor uma ferramenta fora da profissão habilitada', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue('neuropsych_assessments') } as unknown as Reflector
    expect(() => new ProfessionCapabilityGuard(reflector).canActivate(context('nutricao')))
      .toThrow(ForbiddenException)
  })

  it('não restringe rotas sem capacidade declarada', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector
    expect(new ProfessionCapabilityGuard(reflector).canActivate(context('nutricao'))).toBe(true)
  })

  it('não concede acesso restrito sem usuário autenticado', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue('instruments') } as unknown as Reflector
    expect(new ProfessionCapabilityGuard(reflector).canActivate(context(undefined, false))).toBe(false)
  })
})
