export type PricingFeature = {
  icon: string
  title: string
  subtitle: string
}

export type PricingPlan = {
  id: 'free' | 'essencial' | 'pro'
  name: string
  price: string
  pricePeriod: string
  priceAnnual?: string
  description: string
  badge: string | null
  featured?: boolean
  features: PricingFeature[]
  roi: {
    items: string[]
    note: string
  } | null
  cta: string
  ctaSubtext: string
}

export const PRICING_HERO = {
  title: 'Escolha o nivel de automacao que reduz suas faltas',
  subtitle: 'Cada plano e um nivel de automacao. Quanto mais faltas voce quer evitar, mais o sistema trabalha para voce.',
  context: 'Psicologos solo perdem em media 10 horas por semana com agenda, confirmacao e cobranca. Escolha quanto disso voce quer automatizar.',
  trialCta: 'Teste 7 dias gratis no Essencial ou Pro',
  trialSubtext: 'Sem cartao de credito • Cancele a qualquer hora',
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Gratis',
    price: 'Gratis',
    pricePeriod: 'Sem prazo para expirar',
    description: 'Experimente como voce esta perdendo horas por semana',
    badge: null,
    features: [
      { icon: '✅', title: 'Veja todos os seus atendimentos de uma vez', subtitle: 'Agenda basica' },
      { icon: '✅', title: 'Comece com ate 10 pacientes simultaneos', subtitle: 'Ate 10 pacientes' },
      { icon: '✅', title: 'Pacientes marcam diretamente sem voce digitar', subtitle: 'Link publico simples' },
      { icon: '✅', title: 'Acompanhe quanto ganhou este mes', subtitle: 'Financeiro basico' },
      { icon: '❌', title: 'Sem documentos e PDF', subtitle: 'Limitacao' },
      { icon: '❌', title: 'Sem instrumentos clinicos', subtitle: 'Limitacao' },
      { icon: '❌', title: 'Sem WhatsApp automatico', subtitle: 'Limitacao' },
    ],
    cta: 'Comece gratis agora',
    ctaSubtext: 'Sem cartao • Sem compromisso • 10 min de setup',
    roi: null,
  },
  {
    id: 'essencial',
    name: 'Essencial',
    price: '79',
    pricePeriod: '/mes',
    priceAnnual: 'R$ 63/mes, cobrado por ano',
    description: 'Reduza faltas com lembretes automaticos e organize sua rotina',
    badge: null,
    features: [
      { icon: '✅', title: 'Gerencie ate 50 pacientes sem perder ninguem', subtitle: 'Ate 50 pacientes' },
      { icon: '✅', title: 'Pacientes confirmam presenca em 1 clique', subtitle: 'Link publico de agendamento' },
      { icon: '✅', title: 'Documentos que o CFP reconhece sem gasto extra', subtitle: 'Documentos e PDF com verificacao' },
      { icon: '✅', title: 'Saiba quanto faturou e quanto falta receber', subtitle: 'Financeiro basico' },
      { icon: '✅', title: 'Mensagem pronta no WhatsApp em 1 clique', subtitle: 'WhatsApp com template' },
    ],
    roi: {
      items: [
        '⏱️ Economize 5+ horas por semana',
        '🎯 Evite 2-3 faltas por mes',
        '💰 Proteja R$ 500-750/mes em receita',
      ],
      note: 'Seu investimento se paga em 1 dia',
    },
    cta: 'Teste 7 dias gratis',
    ctaSubtext: 'Depois R$ 79/mes\nCancele a qualquer hora',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '149',
    pricePeriod: '/mes',
    priceAnnual: 'R$ 119/mes, cobrado por ano',
    description: 'Reduza 40% de faltas e cresca sem deixar paciente cair',
    badge: '🌟 MAIS POPULAR',
    featured: true,
    features: [
      { icon: '✅', title: 'Sem limite de pacientes, cresca o quanto quiser', subtitle: 'Pacientes ilimitados' },
      { icon: '✅', title: 'Gere documentos ilimitados, recibos, relatorios e contratos', subtitle: 'Documentos ilimitados' },
      { icon: '✅', title: 'Instrumentos do CFP integrados, PHQ-9, GAD-7 e outros', subtitle: 'Instrumentos clinicos' },
      { icon: '✅', title: 'WhatsApp automatico sem voce digitar nada', subtitle: 'WhatsApp automatico 100%' },
      { icon: '✅', title: 'Mensagens podem soar como voce', subtitle: 'Modelos WhatsApp personalizados' },
      { icon: '✅', title: 'Envie link de cobranca para o paciente pagar em 1 clique', subtitle: 'Financeiro Pro com links' },
      { icon: '✅', title: 'Lembretes automaticos 24h e 1h antes', subtitle: 'Lembretes automaticos' },
      { icon: '✅', title: 'Dashboard mostrando faltas evitadas e receita protegida', subtitle: 'Relatorios avancados' },
    ],
    roi: {
      items: [
        '⏱️ Economize 10+ horas por semana',
        '🎯 Evite 5-8 faltas por mes',
        '💰 Proteja R$ 1.250-2.000/mes em receita',
        '📊 Reduza inadimplencia em 30%',
      ],
      note: '🔥 Seu investimento se paga em 3 atendimentos',
    },
    cta: 'Teste 7 dias gratis',
    ctaSubtext: 'Depois R$ 149/mes\nPaga a si mesma em 3 atendimentos\nCancele a qualquer hora',
  },
]

export const PRICING_COMPARISON = {
  title: 'QUAL A DIFERENCA REAL?',
  sections: [
    { title: 'WhatsApp', essencial: 'Voce digita cada confirmacao com template pronto', pro: '100% automatico. Voce nao faz nada' },
    { title: 'Lembretes', essencial: 'Voce lembra quando quiser', pro: '24h e 1h antes, automatico' },
    { title: 'Cobranca', essencial: 'Voce cria documento e envia', pro: 'Link automatico. Paciente clica e paga' },
    { title: 'Relatorios', essencial: 'Voce conta na mao', pro: 'Dashboard em tempo real' },
    { title: 'Escalabilidade', essencial: 'Ate 50 pacientes', pro: '50+, 100+. O sistema aguenta' },
  ],
}

export const PRICING_FAQ = [
  { question: 'Posso cancelar a qualquer hora?', answer: 'Sim. Sem multa, sem aviso previo. Basta cancelar em 1 clique.' },
  { question: 'Preciso de cartao para testar?', answer: 'Nao. Os 7 dias de trial sao gratis. So pedimos cartao quando voce decide continuar.' },
  { question: 'Meus dados estao seguros?', answer: 'Sim. Dados criptografados, backup automatico, auditoria LGPD e exportacao em 1 clique.' },
  { question: 'Posso mudar de plano depois?', answer: 'Sim. Voce pode fazer upgrade ou downgrade a qualquer momento.' },
  { question: 'Qual e a diferenca entre Essencial e Pro?', answer: 'Essencial ajuda voce a operar com templates. Pro automatiza lembretes, mensagens, cobrancas e relatorios.' },
  { question: 'E se eu tiver 50+ pacientes?', answer: 'Ate 50 pacientes, Essencial funciona bem. Acima disso, Pro e o plano indicado.' },
  { question: 'Voces oferecem suporte?', answer: 'Free tem suporte por email. Essencial tem prioridade maior. Pro tem atendimento mais rapido e suporte por WhatsApp.' },
  { question: 'Posso usar em mais de um dispositivo?', answer: 'Sim. Celular, tablet e computador sincronizados.' },
  { question: 'E se eu cancelar durante o trial?', answer: 'Nada sera cobrado. Seus dados ficam salvos por 30 dias caso mude de ideia.' },
  { question: 'Voces tem plano anual com desconto?', answer: 'Sim. Essencial e Pro exibem o valor mensal equivalente no anual.' },
]
