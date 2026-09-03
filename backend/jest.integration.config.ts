import type { Config } from 'jest'

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFiles: ['<rootDir>/test/env-setup.ts'],
  // Cada `beforeAll` cria seu próprio NestApplication com synchronize+dropSchema
  // (test/env-setup.ts) contra o mesmo banco de teste — maxWorkers:1 evita que
  // duas suítes derrubem o schema uma da outra ao mesmo tempo.
  maxWorkers: 1,
}

export default config
