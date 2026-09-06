import { describe, it, expect } from 'vitest'
import { hasPhysiotherapyModules, hasPsychologyModules, councilLabel, PROFESSIONS } from './professions'

describe('hasPhysiotherapyModules', () => {
  it('libera os campos da COFFITO 414/2012 só para fisioterapia', () => {
    expect(hasPhysiotherapyModules('fisioterapia')).toBe(true)
  })

  it('não vaza os campos de fisioterapia para nenhuma outra profissão', () => {
    for (const profession of PROFESSIONS.filter(p => p !== 'fisioterapia')) {
      expect(hasPhysiotherapyModules(profession)).toBe(false)
    }
  })

  it('deixa terapia ocupacional de fora mesmo compartilhando o CREFITO', () => {
    // A 414/2012 alcança TO, mas o vocabulário do diagnóstico é outro — rotular
    // a tela dela como "cinesiofuncional" seria errado.
    expect(councilLabel('terapia_ocupacional')).toBe('CREFITO')
    expect(hasPhysiotherapyModules('terapia_ocupacional')).toBe(false)
  })

  it('assume psicologia quando a profissão está ausente (conta antiga)', () => {
    expect(hasPhysiotherapyModules(undefined)).toBe(false)
    expect(hasPhysiotherapyModules(null)).toBe(false)
    expect(hasPhysiotherapyModules('')).toBe(false)
  })

  it('é mutuamente exclusivo com os módulos de psicologia', () => {
    for (const profession of PROFESSIONS) {
      expect(hasPhysiotherapyModules(profession) && hasPsychologyModules(profession)).toBe(false)
    }
  })
})
