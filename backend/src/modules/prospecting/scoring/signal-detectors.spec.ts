import { detectSignals } from './signal-detectors'

describe('detectSignals', () => {
  it('detecta agendamento pelo WhatsApp com evidência e URL de origem', () => {
    const signals = detectSignals({
      text: 'faça o agendamento pelo whatsapp e venha nos visitar',
      sourceType: 'own_site',
      sourceUrl: 'https://exemplo.com.br',
    })
    const found = signals.find(s => s.type === 'whatsapp_scheduling')
    expect(found).toBeDefined()
    expect(found?.points).toBe(20)
    expect(found?.evidence).toContain('whatsapp')
    expect(found?.evidenceUrl).toBe('https://exemplo.com.br')
  })

  it('todo sinal carrega tipo, pontos, evidência, url, detector e confiança', () => {
    const signals = detectSignals({
      text: 'atendimento particular, agende pelo whatsapp',
      sourceType: 'own_site',
      sourceUrl: 'https://exemplo.com.br',
    })
    for (const s of signals) {
      expect(s.type).toBeTruthy()
      expect(typeof s.points).toBe('number')
      expect(s.evidence).toBeTruthy()
      expect(s.detector).toBeTruthy()
      expect(['low', 'medium', 'high']).toContain(s.confidence)
    }
  })

  it('detecta portal do paciente como sinal negativo', () => {
    const signals = detectSignals({
      text: 'acesse o portal do paciente para ver seus documentos',
      sourceType: 'own_site',
      sourceUrl: 'https://exemplo.com.br',
    })
    const found = signals.find(s => s.type === 'patient_portal_found')
    expect(found?.points).toBe(-30)
    expect(signals.find(s => s.type === 'no_patient_portal')).toBeUndefined()
  })

  it('usa linguagem de ausência de evidência, nunca afirmação categórica', () => {
    const signals = detectSignals({
      text: 'psicóloga clínica com consultório particular em são paulo',
      sourceType: 'own_site',
      sourceUrl: 'https://exemplo.com.br',
    })
    const noPortal = signals.find(s => s.type === 'no_patient_portal')
    expect(noPortal?.evidence).toMatch(/não há evidência pública/i)
    expect(noPortal?.evidence).not.toMatch(/não usa sistema|planilha|recém-formado/i)
  })

  it('detecta sistema de gestão conhecido com penalidade de -50', () => {
    const signals = detectSignals({
      text: 'utilizamos o iclinic para gerenciar nossos atendimentos',
      sourceType: 'own_site',
      sourceUrl: 'https://exemplo.com.br',
    })
    const found = signals.find(s => s.type === 'known_management_system')
    expect(found?.points).toBe(-50)
  })

  it('atribui +10 para perfil público no PsyMeet sem afirmar recém-formado', () => {
    const signals = detectSignals({ sourceType: 'psymeet_search', sourceUrl: 'https://psymeetsocial.com/x' })
    const found = signals.find(s => s.type === 'psymeet_profile')
    expect(found?.points).toBe(10)
    expect(found?.evidence).not.toMatch(/recém-formado/i)
  })

  it('marca ambiguous_result quando não há menção a psicólogo em nenhum texto', () => {
    const signals = detectSignals({
      text: 'agenda seu horário de manicure aqui',
      sourceType: 'own_site',
      sourceUrl: 'https://exemplo.com.br',
    })
    expect(signals.find(s => s.type === 'ambiguous_result')?.points).toBe(-50)
  })

  it('marca no_professional_contact quando não há e-mail, telefone nem redes', () => {
    const signals = detectSignals({
      text: 'psicóloga clínica em campinas',
      sourceType: 'own_site',
      sourceUrl: 'https://exemplo.com.br',
    })
    expect(signals.find(s => s.type === 'no_professional_contact')?.points).toBe(-30)
  })

  it('não marca no_professional_contact quando há e-mail público', () => {
    const signals = detectSignals({
      text: 'psicóloga clínica em campinas',
      email: 'contato@gmail.com',
      sourceType: 'own_site',
      sourceUrl: 'https://exemplo.com.br',
    })
    expect(signals.find(s => s.type === 'no_professional_contact')).toBeUndefined()
    expect(signals.find(s => s.type === 'public_free_email')?.points).toBe(10)
  })
})
