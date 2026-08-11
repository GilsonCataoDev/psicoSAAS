import { DeepPartial } from 'typeorm'
import { User } from '../../src/modules/auth/entities/user.entity'

let counter = 0

/** Builder de usuário de teste — `passwordHash` deve vir pronto (ver createTestUser em test/setup.ts). */
export function userFactory(overrides: DeepPartial<User> = {}): DeepPartial<User> {
  counter += 1
  return {
    name: `Psicóloga Teste ${counter}`,
    email: `psi-teste-${counter}-${Date.now()}@example.com`,
    passwordHash: overrides.passwordHash ?? 'placeholder-hash',
    isActive: true,
    emailVerified: true,
    crp: '06/123456',
    isStudent: false,
    ...overrides,
  }
}
