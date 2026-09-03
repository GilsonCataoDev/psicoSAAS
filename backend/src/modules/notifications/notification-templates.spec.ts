import {
  isMeaningfulAutomatedMessage,
  renderBookingConfirmationMessage,
  renderPaymentTemplate,
  renderReminderTemplate,
} from './notification-templates'

describe('notification templates', () => {
  it('rejeita mensagens vazias ou sem conteudo legivel', () => {
    expect(isMeaningfulAutomatedMessage('19:25')).toBe(false)
    expect(isMeaningfulAutomatedMessage('Confirmado para 19:25')).toBe(true)
  })

  it('renderiza a confirmacao com os dados permitidos', () => {
    const result = renderBookingConfirmationMessage(
      {
        patientName: 'Maria Souza',
        date: '30/07/2026',
        time: '19:25:00',
        modality: 'online',
      },
      {
        confirmationMessage: 'Ola {{primeiro_nome}}, consulta {{data}} as {{hora}} com {{profissional}} ({{modalidade}}).',
        psychologistName: 'Dra. Ana',
      },
    )

    expect(result).toBe('Ola Maria, consulta 30/07/2026 as 19:25 com Dra. Ana (online).')
  })

  it('nao produz confirmacao quando nao existe template', () => {
    expect(renderBookingConfirmationMessage({ patientName: 'Maria' })).toBeNull()
  })

  it('renderiza cobranca e inclui pedido de comprovante', () => {
    expect(renderPaymentTemplate(
      'Ola {{nome}}, valor {{valor}}, PIX {{pix}}.',
      'Maria Souza',
      150,
      'chave-pix',
      true,
    )).toContain('Pode me enviar o comprovante')
  })

  it('renderiza lembrete de consulta', () => {
    expect(renderReminderTemplate(
      '{{nome}}: {{data}} as {{hora}} ({{antecedencia}})',
      'Maria Souza',
      '30/07/2026',
      '19:25',
      '24h',
    )).toBe('Maria: 30/07/2026 as 19:25 (24h)')
  })
})
