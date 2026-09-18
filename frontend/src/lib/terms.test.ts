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

  it('usa vocabulário próprio para cada área mapeada', () => {
    expect(termsFor('nutricao')).toMatchObject({ patientsCapitalized: 'Pacientes', sessionsCapitalized: 'Consultas', recordCapitalized: 'Prontuário Nutricional' })
    expect(termsFor('fisioterapia')).toMatchObject({ patientsCapitalized: 'Pacientes', sessionsCapitalized: 'Sessões', recordCapitalized: 'Prontuário Fisioterapêutico' })
    expect(termsFor('personal_trainer')).toMatchObject({ patientsCapitalized: 'Alunos', sessionsCapitalized: 'Treinos', recordCapitalized: 'Ficha de Treino' })
    expect(termsFor('outro')).toMatchObject({ patientsCapitalized: 'Clientes', sessionsCapitalized: 'Atendimentos', recordCapitalized: 'Ficha' })
  })
})

describe('termsFor em páginas públicas', () => {
  // As páginas de agendamento, confirmação e portal são abertas pelo paciente
  // sem sessão: a profissão chega no payload da API, não do usuário logado.
  it('usa a profissão vinda da API quando ela existe', () => {
    expect(termsFor('nutricao').sessionCapitalized).toBe('Consulta')
    expect(termsFor('nutricao').patient).toBe('paciente')
    expect(termsFor('psicologia').sessionCapitalized).toBe('Sessão')
    expect(termsFor('psicologia').patient).toBe('paciente')
  })

  it('cai no padrão de psicologia se a API não devolver profissão (payload antigo)', () => {
    expect(termsFor(undefined).sessionCapitalized).toBe('Sessão')
    expect(termsFor(undefined).patient).toBe('paciente')
  })
})

describe('getNavigationItems', () => {
  it('devolve a navegação filtrada para psicologia (sem módulos de outras profissões)', () => {
    // '/estoque' tem professionGate de estética — psicologia não o enxerga
    const expected = NAVIGATION_ITEMS.filter(item => !item.professionGate || item.professionGate('psicologia'))
    expect(getNavigationItems('psicologia')).toEqual(expected)
    expect(getNavigationItems(undefined)).toEqual(expected)
    // garantia direta: estoque some para psicologia
    expect(getNavigationItems('psicologia').map(i => i.to)).not.toContain('/estoque')
  })

  it('esconde módulos exclusivos de psicologia para profissões sem catálogo', () => {
    // odontologia não tem instrumentos nem avaliações
    const rotasOdonto = getNavigationItems('odontologia').map(i => i.to)
    expect(rotasOdonto).not.toContain('/instrumentos')
    expect(rotasOdonto).not.toContain('/avaliacoes')
    expect(rotasOdonto).not.toContain('/estoque')
    expect(rotasOdonto).toContain('/pacientes')
    expect(rotasOdonto).toContain('/agenda')
    expect(rotasOdonto).toContain('/financeiro')
  })

  it('mostra /instrumentos para psicologia, fisioterapia, nutricao e estetica', () => {
    expect(getNavigationItems('psicologia').map(i => i.to)).toContain('/instrumentos')
    expect(getNavigationItems('fisioterapia').map(i => i.to)).toContain('/instrumentos')
    expect(getNavigationItems('nutricao').map(i => i.to)).toContain('/instrumentos')
    expect(getNavigationItems('estetica').map(i => i.to)).toContain('/instrumentos')
  })

  it('nunca mostra /avaliacoes fora da psicologia', () => {
    for (const p of ['nutricao', 'fisioterapia', 'estetica', 'odontologia']) {
      expect(getNavigationItems(p).map(i => i.to)).not.toContain('/avaliacoes')
    }
  })

  it('mostra /estoque apenas para estética', () => {
    expect(getNavigationItems('estetica').map(i => i.to)).toContain('/estoque')
    for (const p of ['psicologia', 'fisioterapia', 'nutricao', 'odontologia']) {
      expect(getNavigationItems(p).map(i => i.to)).not.toContain('/estoque')
    }
  })

  it('troca os rótulos de pacientes e sessões para outras profissões', () => {
    const itens = getNavigationItems('odontologia')
    expect(itens.find(i => i.to === '/pacientes')?.label).toBe('Pacientes')
    expect(itens.find(i => i.to === '/sessoes')?.label).toBe('Consultas')
    // Rótulos que não mudam de vocabulário seguem iguais.
    expect(itens.find(i => i.to === '/financeiro')?.label).toBe('Financeiro')
  })
})
