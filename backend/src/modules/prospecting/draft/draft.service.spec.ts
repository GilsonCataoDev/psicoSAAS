import 'reflect-metadata'
import { DraftService } from './draft.service'
import { Prospect } from '../entities/prospect.entity'
import { ProspectSignal } from '../entities/prospect-signal.entity'

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: 'p1',
    professionalName: 'Ana Souza',
    website: 'exemplo.com.br',
    websiteDomain: 'exemplo.com.br',
    sourceType: 'own_site',
    sourceUrl: 'https://exemplo.com.br',
    status: 'approved',
    doNotContact: false,
    ...overrides,
  } as Prospect
}

function makeSignal(overrides: Partial<ProspectSignal> = {}): ProspectSignal {
  return {
    id: 's1', prospectId: 'p1', type: 'whatsapp_scheduling', points: 20,
    confidence: 'high', evidence: 'agendamento pelo whatsapp', evidenceUrl: 'https://exemplo.com.br',
    detector: 'whatsapp_scheduling', detectedAt: new Date(),
    ...overrides,
  } as ProspectSignal
}

describe('DraftService', () => {
  const svc = new DraftService()

  it('gera rascunho mencionando a fonte e um sinal comprovado', () => {
    const draft = svc.generate(makeProspect(), [makeSignal()])
    expect(draft).toContain('exemplo.com.br')
    expect(draft.toLowerCase()).toContain('whatsapp')
  })

  it('sempre oferece a opção de não receber contato', () => {
    const draft = svc.generate(makeProspect(), [makeSignal()])
    expect(draft.toLowerCase()).toMatch(/não volto a entrar em contato|prefere não receber/)
  })

  it('nunca afirma que a pessoa não usa sistema', () => {
    const draft = svc.generate(makeProspect(), [makeSignal({ type: 'no_online_agenda', points: 15 })])
    expect(draft.toLowerCase()).not.toMatch(/não usa sistema|planilha|recém-formado/)
  })

  it('recusa gerar rascunho quando doNotContact=true', () => {
    const prospect = makeProspect({ doNotContact: true })
    expect(() => svc.generate(prospect, [makeSignal()])).toThrow(/não contatar/i)
  })

  it('recusa gerar rascunho quando status não é approved', () => {
    const prospect = makeProspect({ status: 'discovered' })
    expect(() => svc.generate(prospect, [makeSignal()])).toThrow(/aprovação/i)
  })

  it('não tem nenhuma dependência capaz de enviar mensagens (só gera texto)', () => {
    // Garante estruturalmente que o serviço não pode disparar e-mail/WhatsApp:
    // não injeta EmailService, WhatsappService ou qualquer client de envio.
    const paramTypes = Reflect.getMetadata('design:paramtypes', DraftService) as unknown[] | undefined
    expect(paramTypes ?? []).toHaveLength(0)
  })

  it('menciona apenas um sinal, mesmo havendo vários positivos', () => {
    const draft = svc.generate(makeProspect(), [
      makeSignal({ type: 'whatsapp_scheduling', points: 20 }),
      makeSignal({ id: 's2', type: 'private_practice', points: 10 }),
    ])
    const mentions = ['whatsapp', 'atendimento é particular'].filter(term => draft.toLowerCase().includes(term))
    expect(mentions.length).toBe(1)
  })
})
