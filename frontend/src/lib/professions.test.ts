import { describe, it, expect } from 'vitest'
import { hasPhysiotherapyModules, hasPsychologyModules, hasNutritionModules, hasAestheticsModules, hasInstrumentsModule, hasProfessionCapability, councilLabel, PROFESSIONS } from './professions'

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

describe('hasNutritionModules', () => {
  it('libera o catálogo e calculadoras só para nutricao', () => {
    expect(hasNutritionModules('nutricao')).toBe(true)
  })

  it('não vaza para nenhuma outra profissão', () => {
    for (const profession of PROFESSIONS.filter(p => p !== 'nutricao')) {
      expect(hasNutritionModules(profession)).toBe(false)
    }
  })

  it('assume false quando a profissão está ausente (conta antiga = psicologia)', () => {
    expect(hasNutritionModules(undefined)).toBe(false)
    expect(hasNutritionModules(null)).toBe(false)
  })

  it('é mutuamente exclusivo com psicologia e fisioterapia', () => {
    for (const profession of PROFESSIONS) {
      const flags = [hasPsychologyModules(profession), hasPhysiotherapyModules(profession), hasNutritionModules(profession)]
      expect(flags.filter(Boolean).length).toBeLessThanOrEqual(1)
    }
  })
})

describe('hasAestheticsModules', () => {
  it('libera módulo estético só para estetica', () => {
    expect(hasAestheticsModules('estetica')).toBe(true)
  })

  it('não vaza para nenhuma outra profissão', () => {
    for (const p of PROFESSIONS.filter(p => p !== 'estetica')) {
      expect(hasAestheticsModules(p)).toBe(false)
    }
  })

  it('assume false quando profissão está ausente (conta antiga = psicologia)', () => {
    expect(hasAestheticsModules(undefined)).toBe(false)
    expect(hasAestheticsModules(null)).toBe(false)
  })

  it('é mutuamente exclusivo com psicologia, fisioterapia e nutricao', () => {
    for (const p of PROFESSIONS) {
      const flags = [hasPsychologyModules(p), hasPhysiotherapyModules(p), hasNutritionModules(p), hasAestheticsModules(p)]
      expect(flags.filter(Boolean).length).toBeLessThanOrEqual(1)
    }
  })
})

describe('hasInstrumentsModule', () => {
  it('habilita instrumentos para psicologia, fisioterapia e nutricao', () => {
    expect(hasInstrumentsModule('psicologia')).toBe(true)
    expect(hasInstrumentsModule('fisioterapia')).toBe(true)
    expect(hasInstrumentsModule('nutricao')).toBe(true)
  })

  it('não habilita para profissões sem catálogo', () => {
    for (const p of ['terapia_ocupacional', 'odontologia', 'fonoaudiologia', 'estetica'] as const) {
      expect(hasInstrumentsModule(p)).toBe(false)
    }
  })
})

describe('hasProfessionCapability', () => {
  it('retorna false para profissão desconhecida fora do sistema', () => {
    // 'odontologia' não tem entradas de capability registradas
    expect(hasProfessionCapability('odontologia', 'instruments')).toBe(false)
  })

  it('null/undefined caem em psicologia (conta antiga) — capabilities da profissão padrão', () => {
    // ?? coage apenas null/undefined → DEFAULT_PROFESSION; '' permanece '' (profissão inválida)
    expect(hasProfessionCapability(null, 'instruments')).toBe(true)
    expect(hasProfessionCapability(undefined, 'instruments')).toBe(true)
  })

  it('string vazia não libera módulo — comportamento consistente com hasPsychologyModules', () => {
    expect(hasProfessionCapability('', 'instruments')).toBe(false)
  })

  it('retorna false para capability inexistente mesmo em profissão válida', () => {
    // Nenhuma profissão deve ter uma capability inventada
    for (const profession of PROFESSIONS) {
      expect(hasProfessionCapability(profession, 'inexistente' as never)).toBe(false)
    }
  })
})
