import { describe, expect, it } from 'vitest'
import { INSTRUMENTS } from './instrument-catalog'

describe('instrument catalog', () => {
  it('mantém identificadores únicos', () => {
    const ids = INSTRUMENTS.map(instrument => instrument.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('mantém os metadados obrigatórios preenchidos', () => {
    for (const instrument of INSTRUMENTS) {
      expect(instrument.title.trim()).not.toBe('')
      expect(instrument.description.trim()).not.toBe('')
      expect(instrument.template.trim()).not.toBe('')
      expect(instrument.ageGroups.length).toBeGreaterThan(0)
    }
  })

  it('preserva a anamnese adulta usada pelo fluxo principal', () => {
    expect(INSTRUMENTS).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'anamnese-adulto',
        category: 'formulario',
        ageGroups: expect.arrayContaining(['adulto']),
      }),
    ]))
  })
})
