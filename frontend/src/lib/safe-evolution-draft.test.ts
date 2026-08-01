import { describe, expect, it } from 'vitest'
import { buildSafeEvolutionDraft } from './safe-evolution-draft'

describe('buildSafeEvolutionDraft', () => {
  it('preserves the professional summary without inventing clinical facts', () => {
    const summary = 'Paciente fictício relatou ansiedade leve e praticou respiração guiada.'
    const result = buildSafeEvolutionDraft({
      approachLabel: 'TCC — Terapia Cognitivo-Comportamental',
      lifeCycleLabel: 'Adulto (18–59 anos)',
      sessionSummary: summary,
      date: new Date(2026, 7, 1),
    })

    expect(result).toContain(summary)
    expect(result).toContain('REVISAR ANTES DE USAR')
    expect(result).toContain('[preencher ou remover]')
    expect(result).not.toMatch(/reestruturação cognitiva|demonstrou insight|prognóstico é|foram acordadas/i)
  })

  it('does not claim the selected approach was applied', () => {
    const result = buildSafeEvolutionDraft({
      approachLabel: 'Psicanálise',
      lifeCycleLabel: 'Adulto (18–59 anos)',
      sessionSummary: 'Foi relatada dificuldade de sono durante a semana.',
    })

    expect(result).toContain('Abordagem: Psicanálise')
    expect(result).not.toMatch(/sessão conduzida|escuta flutuante|transferência/i)
  })

  it('returns an empty string for an empty summary', () => {
    expect(buildSafeEvolutionDraft({
      approachLabel: 'Outra abordagem',
      lifeCycleLabel: 'Adulto',
      sessionSummary: '   ',
    })).toBe('')
  })
})
