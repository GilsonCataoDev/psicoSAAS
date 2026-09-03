import { termsFor } from './terms'

describe('termsFor (mensagens ao paciente)', () => {
  it('mantém o vocabulário histórico para psicologia', () => {
    const t = termsFor('psicologia')
    expect(t.session).toBe('sessão')
    expect(t.patient).toBe('paciente')
    expect(t.record).toBe('prontuário')
  })

  it('assume psicologia quando a profissão está ausente (conta antiga)', () => {
    expect(termsFor(undefined)).toEqual(termsFor('psicologia'))
    expect(termsFor(null)).toEqual(termsFor('psicologia'))
    expect(termsFor('')).toEqual(termsFor('psicologia'))
  })

  it('usa vocabulário genérico nas demais profissões', () => {
    for (const profession of ['nutricao', 'fisioterapia', 'odontologia', 'outro']) {
      const t = termsFor(profession)
      expect(t.session).toBe('atendimento')
      expect(t.patient).toBe('cliente')
      expect(t.record).toBe('ficha')
    }
  })

  describe('concordância de gênero', () => {
    // "sessão" é feminino e "atendimento" é masculino: sem isso as mensagens
    // saem com concordância errada ("Seu sessao foi confirmado").
    it('monta a frase de confirmação corretamente nas duas profissões', () => {
      const psi = termsFor('psicologia')
      const gen = termsFor('nutricao')
      expect(`${psi.sessionPossessivePlain} foi confirmad${psi.sessionAgreement}`)
        .toBe('Sua sessao foi confirmada')
      expect(`${gen.sessionPossessivePlain} foi confirmad${gen.sessionAgreement}`)
        .toBe('Seu atendimento foi confirmado')
    })

    it('monta a contração "da/do" corretamente', () => {
      expect(`d${termsFor('psicologia').sessionAgreement}`).toBe('da')
      expect(`d${termsFor('nutricao').sessionAgreement}`).toBe('do')
    })

    it('monta a frase de cancelamento corretamente', () => {
      const psi = termsFor('psicologia')
      const gen = termsFor('nutricao')
      expect(`${psi.sessionPlainCapitalized} cancelad${psi.sessionAgreement} pelo ${psi.patient}`)
        .toBe('Sessao cancelada pelo paciente')
      expect(`${gen.sessionPlainCapitalized} cancelad${gen.sessionAgreement} pelo ${gen.patient}`)
        .toBe('Atendimento cancelado pelo cliente')
    })
  })

  it('não usa acento nos campos destinados a WhatsApp/push', () => {
    for (const profession of ['psicologia', 'nutricao']) {
      const t = termsFor(profession)
      for (const value of [t.sessionPlain, t.sessionPlainCapitalized, t.sessionPossessivePlain]) {
        expect(value).toBe(value.normalize('NFD').replace(/[̀-ͯ]/g, ''))
      }
    }
  })
})
