import { redactDirectIdentifiers, redactPatientName, sanitizeClinicalText } from './neuropsych-identifier-redaction'

describe('redactDirectIdentifiers', () => {
  it('remove CPF em formatos com e sem pontuação', () => {
    expect(redactDirectIdentifiers('CPF do responsável: 123.456.789-01')).not.toContain('123.456.789-01')
    expect(redactDirectIdentifiers('CPF 12345678901 informado')).not.toContain('12345678901')
  })

  it('remove e-mail', () => {
    const out = redactDirectIdentifiers('contato: joao.silva@example.com para retorno')
    expect(out).not.toContain('joao.silva@example.com')
    expect(out).toContain('[e-mail removido]')
  })

  it('remove telefone em formatos comuns', () => {
    expect(redactDirectIdentifiers('Contato (11) 98765-4321 para retorno')).not.toContain('98765-4321')
    expect(redactDirectIdentifiers('Telefone: 11987654321')).not.toContain('11987654321')
  })

  it('remove CEP', () => {
    expect(redactDirectIdentifiers('mora perto do CEP 01310-100')).not.toContain('01310-100')
  })

  it('remove endereço com logradouro e número', () => {
    const out = redactDirectIdentifiers('reside na Rua das Flores, nº 123, bairro Centro')
    expect(out).not.toContain('Rua das Flores, nº 123')
    expect(out).toContain('[endereço removido]')
  })

  it('remove data de nascimento quando próxima de palavra-chave', () => {
    const out = redactDirectIdentifiers('Data de nascimento: 14/03/1990, encaminhado pela escola')
    expect(out).not.toContain('14/03/1990')
  })

  it('não remove datas de sessão isoladas sem contexto de nascimento', () => {
    const out = redactDirectIdentifiers('Sessão realizada em 10/03/2026 com boa adesão')
    expect(out).toContain('10/03/2026')
  })

  it('remove URL de portal ou documento', () => {
    const out = redactDirectIdentifiers('Ver documento em https://usecognia.com.br/verificar/abc123')
    expect(out).not.toContain('https://usecognia.com.br/verificar/abc123')
  })

  it('remove UUID', () => {
    const out = redactDirectIdentifiers('registro vinculado a 3b048fba-6a7e-4b2d-bfbb-353dfcc17f77')
    expect(out).not.toContain('3b048fba-6a7e-4b2d-bfbb-353dfcc17f77')
  })

  it('remove token longo alfanumérico', () => {
    const out = redactDirectIdentifiers('token de acesso: aZ9k2mQpL7vR3xN8wT1yB4cD6eF')
    expect(out).not.toContain('aZ9k2mQpL7vR3xN8wT1yB4cD6eF')
  })

  it('preserva texto clínico normal sem identificadores', () => {
    const clean = 'Paciente relata melhora na ansiedade após início das sessões semanais.'
    expect(redactDirectIdentifiers(clean)).toBe(clean)
  })

  it('retorna undefined/vazio sem lançar erro', () => {
    expect(redactDirectIdentifiers(undefined)).toBeUndefined()
    expect(redactDirectIdentifiers('')).toBe('')
  })
})

describe('redactPatientName', () => {
  it('remove nome completo e partes do nome (3+ letras)', () => {
    const out = redactPatientName('João disse que Maria Souza o apoiou muito', 'Maria Souza')
    expect(out).not.toContain('Maria Souza')
    expect(out).not.toContain('Maria')
    expect(out).not.toContain('Souza')
    expect(out).toContain('João')
  })

  it('é case-insensitive', () => {
    const out = redactPatientName('conversei com maria souza ontem', 'Maria Souza')
    expect(out?.toLowerCase()).not.toContain('maria souza')
  })

  it('ignora partes curtas do nome (preposições/iniciais)', () => {
    const out = redactPatientName('Ana de Sá conversou sobre a rotina', 'Ana de Sá')
    // "de" e "Sá" têm menos de 3 letras e não devem gerar remoções indevidas de palavras comuns
    expect(out).toContain('de')
  })

  it('não falha sem nome disponível', () => {
    expect(redactPatientName('texto qualquer', undefined)).toBe('texto qualquer')
  })
})

describe('sanitizeClinicalText — nenhum padrão sensível sobrevive à sanitização completa', () => {
  const SENSITIVE_SAMPLE = [
    'Paciente Maria Souza, CPF 123.456.789-01, RG 12.345.678-9,',
    'telefone (11) 98765-4321, e-mail maria.souza@example.com,',
    'CEP 01310-100, reside na Rua das Flores, nº 123,',
    'data de nascimento 14/03/1990.',
    'Documento em https://usecognia.com.br/verificar/3b048fba-6a7e-4b2d-bfbb-353dfcc17f77',
    'token de sessão: aZ9k2mQpL7vR3xN8wT1yB4cD6eF',
  ].join(' ')

  it('não deixa nenhum dos padrões sensíveis no texto final', () => {
    const sanitized = sanitizeClinicalText(SENSITIVE_SAMPLE, 'Maria Souza')!
    expect(sanitized).not.toContain('Maria Souza')
    expect(sanitized).not.toContain('123.456.789-01')
    expect(sanitized).not.toContain('12.345.678-9')
    expect(sanitized).not.toContain('98765-4321')
    expect(sanitized).not.toContain('maria.souza@example.com')
    expect(sanitized).not.toContain('01310-100')
    expect(sanitized).not.toContain('Rua das Flores, nº 123')
    expect(sanitized).not.toContain('14/03/1990')
    expect(sanitized).not.toContain('3b048fba-6a7e-4b2d-bfbb-353dfcc17f77')
    expect(sanitized).not.toContain('aZ9k2mQpL7vR3xN8wT1yB4cD6eF')
    expect(sanitized).not.toContain('usecognia.com.br/verificar')
  })
})
