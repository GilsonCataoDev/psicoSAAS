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

describe('termsFor em páginas públicas', () => {
  // As páginas de agendamento, confirmação e portal são abertas pelo paciente
  // sem sessão: a profissão chega no payload da API, não do usuário logado.
  it('usa a profissão vinda da API quando ela existe', () => {
    expect(termsFor('nutricao').sessionCapitalized).toBe('Atendimento')
    expect(termsFor('nutricao').patient).toBe('cliente')
    expect(termsFor('psicologia').sessionCapitalized).toBe('Sessão')
    expect(termsFor('psicologia').patient).toBe('paciente')
  })

  it('cai no padrão de psicologia se a API não devolver profissão (payload antigo)', () => {
    expect(termsFor(undefined).sessionCapitalized).toBe('Sessão')
    expect(termsFor(undefined).patient).toBe('paciente')
  })
})

describe('getNavigationItems', () => {
  it('devolve a navegação original para psicologia', () => {
    expect(getNavigationItems('psicologia')).toEqual(NAVIGATION_ITEMS)
    expect(getNavigationItems(undefined)).toEqual(NAVIGATION_ITEMS)
  })

  it('esconde módulos exclusivos de psicologia para profissões sem catálogo', () => {
    // odontologia não tem instrumentos nem avaliações
    const rotasOdonto = getNavigationItems('odontologia').map(i => i.to)
    expect(rotasOdonto).not.toContain('/instrumentos')
    expect(rotasOdonto).not.toContain('/avaliacoes')
    expect(rotasOdonto).toContain('/pacientes')
    expect(rotasOdonto).toContain('/agenda')
    expect(rotasOdonto).toContain('/financeiro')
  })

  it('mostra /instrumentos para psicologia, fisioterapia e nutricao', () => {
    expect(getNavigationItems('psicologia').map(i => i.to)).toContain('/instrumentos')
    expect(getNavigationItems('fisioterapia').map(i => i.to)).toContain('/instrumentos')
    expect(getNavigationItems('nutricao').map(i => i.to)).toContain('/instrumentos')
  })

  it('nunca mostra /avaliacoes fora da psicologia', () => {
    for (const p of ['nutricao', 'fisioterapia', 'odontologia']) {
      expect(getNavigationItems(p).map(i => i.to)).not.toContain('/avaliacoes')
    }
  })

  it('troca os rótulos de pacientes e sessões para outras profissões', () => {
    const itens = getNavigationItems('odontologia')
    expect(itens.find(i => i.to === '/pacientes')?.label).toBe('Clientes')
    expect(itens.find(i => i.to === '/sessoes')?.label).toBe('Atendimentos')
    // Rótulos que não mudam de vocabulário seguem iguais.
    expect(itens.find(i => i.to === '/financeiro')?.label).toBe('Financeiro')
  })
})
