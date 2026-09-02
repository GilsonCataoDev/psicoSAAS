import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * A janela de edição direta da evolução é decidida pelo backend
 * (EDIT_LOCK_DAYS, em sessions.service.ts), mas o frontend recalcula a mesma
 * regra para desabilitar o campo antes de o usuário tentar salvar.
 *
 * Se os dois divergirem, a tela libera uma edição que o servidor recusa — o
 * profissional escreve, salva e leva erro. O próprio comentário no frontend já
 * dizia "mantido em sincronia com EDIT_LOCK_DAYS no backend", ou seja, alguém
 * conhecia o acoplamento e o documentou em vez de travá-lo.
 */

const REPO = join(__dirname, '..', '..', '..', '..')

function readBackendEditLockDays(): number {
  const source = readFileSync(join(REPO, 'backend/src/modules/sessions/sessions.service.ts'), 'utf8')
  const match = source.match(/EDIT_LOCK_DAYS\s*=\s*(\d+)/)
  if (!match) throw new Error('EDIT_LOCK_DAYS não encontrado em sessions.service.ts')
  return Number(match[1])
}

function readFrontendEditLockDays(): number {
  const source = readFileSync(join(REPO, 'frontend/src/pages/ProntuarioPage.tsx'), 'utf8')
  // `cutoff.setDate(cutoff.getDate() - 7)` dentro de isPastEditLock
  const match = source.match(/setDate\(\s*\w+\.getDate\(\)\s*-\s*(\d+)\s*\)/)
  if (!match) throw new Error('cálculo do prazo de edição não encontrado em ProntuarioPage.tsx')
  return Number(match[1])
}

describe('contrato do prazo de edição da evolução', () => {
  it('frontend e backend usam a mesma janela de dias', () => {
    expect(readFrontendEditLockDays()).toBe(readBackendEditLockDays())
  })

  it('a janela é um número de dias plausível', () => {
    const days = readBackendEditLockDays()
    expect(Number.isInteger(days)).toBe(true)
    expect(days).toBeGreaterThan(0)
    expect(days).toBeLessThanOrEqual(90)
  })
})
