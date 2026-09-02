import { describe, it, expect } from 'vitest'
import { termsFor } from './terms'
import { getNavigationItems, NAVIGATION_ITEMS } from '@/components/layout/navigation'

describe('termsFor', () => {
  it('mantém o vocabulário histórico para psicologia', () => {
    const t = termsFor('psicologia')
    expect(t.patientsCapitalized).toBe('Pacientes')
    expect(t.sessionsCapitalized).toBe('Sessões')
    expect(t.recordCapitalized).toBe('Prontuário')
  })

  it('assume psicologia quando a profissão está ausente (conta antiga)', () => {
    expect(termsFor(undefined)).toEqual(termsFor('psicologia'))
    expect(termsFor(null)).toEqual(termsFor('psicologia'))
    expect(termsFor('')).toEqual(termsFor('psicologia'))
  })

  it('usa vocabulário genérico para as demais profissões', () => {
    for (const profession of ['nutricao', 'fisioterapia', 'personal_trainer', 'outro']) {
      const t = termsFor(profession)
      expect(t.patientsCapitalized).toBe('Clientes')
      expect(t.sessionsCapitalized).toBe('Atendimentos')
      expect(t.recordCapitalized).toBe('Ficha')
    }
  })
})

describe('getNavigationItems', () => {
  it('devolve a navegação original para psicologia', () => {
    expect(getNavigationItems('psicologia')).toEqual(NAVIGATION_ITEMS)
    expect(getNavigationItems(undefined)).toEqual(NAVIGATION_ITEMS)
  })

  it('esconde módulos exclusivos de psicologia para outras profissões', () => {
    const rotas = getNavigationItems('nutricao').map(i => i.to)
    expect(rotas).not.toContain('/instrumentos')
    expect(rotas).not.toContain('/avaliacoes')
    // O resto da navegação continua intacto.
    expect(rotas).toContain('/pacientes')
    expect(rotas).toContain('/agenda')
    expect(rotas).toContain('/financeiro')
  })

  it('troca os rótulos de pacientes e sessões para outras profissões', () => {
    const itens = getNavigationItems('odontologia')
    expect(itens.find(i => i.to === '/pacientes')?.label).toBe('Clientes')
    expect(itens.find(i => i.to === '/sessoes')?.label).toBe('Atendimentos')
    // Rótulos que não mudam de vocabulário seguem iguais.
    expect(itens.find(i => i.to === '/financeiro')?.label).toBe('Financeiro')
  })
})
