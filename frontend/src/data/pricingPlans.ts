export type PricingFeature = {
  type: 'included' | 'excluded'
  title: string
  subtitle: string
}

export type PricingRoiItem = {
  type: 'time' | 'attendance' | 'revenue' | 'collection'
  text: string
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
    items: PricingRoiItem[]
    note: string
  } | null
  cta: string
  ctaSubtext: string
}

export const PRICING_HERO = {
  title: 'Escolha como quer usar o UseCognia',
  subtitle: 'Organize agenda, pacientes, prontuario e financeiro sem transformar a rotina clinica em planilha.',
  context: 'Comece gratis, evolua para uma rotina profissional no Essencial ou automatize comunicacao, cobrancas e IA no Pro.',
  trialCta: 'Acesso Beta gratuito',
  trialSubtext: 'Sem cartao nesta fase. Feedback direto com a equipe.',
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Grátis',
    price: 'Grátis',
    pricePeriod: 'Sem prazo para expirar',
    description: 'Para estagiarios e profissionais testarem a rotina sem custo',
    badge: null,
    features: [
      { type: 'included', title: 'Veja todos os seus atendimentos de uma vez', subtitle: 'Agenda basica' },
      { type: 'included', title: 'Comece com ate 10 pacientes simultaneos', subtitle: 'Ate 10 pacientes' },
      { type: 'included', title: 'Pacientes marcam diretamente sem voce digitar', subtitle: 'Link publico simples' },
      { type: 'included', title: 'Acompanhe quanto ganhou este mes', subtitle: 'Financeiro basico' },
      { type: 'excluded', title: 'Sem documentos e PDF', subtitle: 'Limitacao' },
      { type: 'excluded', title: 'Sem instrumentos clinicos', subtitle: 'Limitacao' },
      { type: 'excluded', title: 'Sem WhatsApp automatico', subtitle: 'Limitacao' },
    ],
    cta: 'Comece gratis agora',
    ctaSubtext: 'Sem cartao. Sem compromisso. 10 min de setup.',
    roi: null,
  },
  {
    id: 'essencial',
    name: 'Essencial',
    price: '79',
    pricePeriod: '/mes',
    priceAnnual: 'R$ 63/mes, cobrado por ano',
    description: 'Para organizar agenda, pacientes, prontuario, documentos e financeiro sem automacao',
    badge: null,
    features: [
      { type: 'included', title: 'Gerencie ate 50 pacientes sem perder ninguem', subtitle: 'Ate 50 pacientes' },
      { type: 'included', title: 'Pacientes confirmam presenca em 1 clique', subtitle: 'Link publico de agendamento' },
      { type: 'included', title: 'Gere documentos e PDFs com verificacao', subtitle: 'Ate 200 documentos' },
      { type: 'included', title: 'Saiba quanto faturou e quanto falta receber', subtitle: 'Financeiro basico' },
      { type: 'included', title: 'Abra mensagens prontas no WhatsApp em 1 clique', subtitle: 'WhatsApp manual com template' },
    ],
    roi: {
      items: [
        { type: 'time', text: 'Economize tempo centralizando a rotina' },
        { type: 'attendance', text: 'Reduza esquecimentos com agenda e link publico' },
        { type: 'revenue', text: 'Acompanhe valores em aberto sem planilha solta' },
      ],
      note: 'Ideal para sair do caderno, WhatsApp solto e planilhas',
    },
    cta: 'Contratar Essencial',
    ctaSubtext: 'Cartao necessario. Cobranca conforme o plano.',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '149',
    pricePeriod: '/mes',
    priceAnnual: 'R$ 119/mes, cobrado por ano',
    description: 'Para automatizar lembretes, cobrancas, instrumentos e apoio por IA',
    badge: 'Mais escolhido',
    featured: true,
    features: [
      { type: 'included', title: 'Sem limite de pacientes, cresca o quanto quiser', subtitle: 'Pacientes ilimitados' },
      { type: 'included', title: 'Gere documentos ilimitados, recibos, relatorios e contratos', subtitle: 'Documentos ilimitados' },
      { type: 'included', title: 'Instrumentos do CFP integrados, PHQ-9, GAD-7 e outros', subtitle: 'Instrumentos clinicos' },
      { type: 'included', title: 'WhatsApp automatico sem voce digitar nada', subtitle: 'WhatsApp automatico 100%' },
      { type: 'included', title: 'Mensagens podem soar como voce', subtitle: 'Modelos WhatsApp personalizados' },
      { type: 'included', title: 'Envie link de cobranca para o paciente pagar em 1 clique', subtitle: 'Financeiro Pro com links' },
      { type: 'included', title: 'Lembretes automaticos 24h e 1h antes', subtitle: 'Lembretes automaticos' },
      { type: 'included', title: 'Grave e transcreva sessoes com IA, com limite mensal', subtitle: 'IA clinica assistiva' },
      { type: 'included', title: 'Dashboard mostrando faltas evitadas e receita protegida', subtitle: 'Relatorios avancados' },
    ],
    roi: {
      items: [
        { type: 'time', text: 'Automatize lembretes, cobrancas e follow-up' },
        { type: 'attendance', text: 'Diminua faltas com mensagens 24h e 1h antes' },
        { type: 'revenue', text: 'Recupere pagamentos pendentes com menos trabalho manual' },
        { type: 'collection', text: 'Use IA como apoio para transcricao e resumo' },
      ],
      note: 'Seu investimento se paga em 3 atendimentos',
    },
    cta: 'Contratar Pro',
    ctaSubtext: 'Cartao necessario. Cobranca conforme o plano.',
  },
]

export const PRICING_COMPARISON = {
  title: 'QUAL A DIFERENCA REAL?',
  sections: [
    { title: 'WhatsApp', essencial: 'Voce abre mensagens prontas manualmente', pro: 'O sistema envia automaticamente' },
    { title: 'Lembretes', essencial: 'Controle manual pela agenda', pro: '24h e 1h antes, automatico' },
    { title: 'Cobranca', essencial: 'Controle financeiro manual', pro: 'Link e mensagem de cobranca em 1 clique' },
    { title: 'IA', essencial: 'Sem gravacao/transcricao por IA', pro: 'Gravacao, transcricao e rascunho de evolucao' },
    { title: 'Escalabilidade', essencial: 'Ate 50 pacientes', pro: '50+, 100+. O sistema aguenta' },
  ],
}

export const PRICING_FAQ = [
  { question: 'Posso cancelar a qualquer hora?', answer: 'Sim. Sem multa, sem aviso previo. Basta cancelar em 1 clique.' },
  { question: 'Preciso de cartao para testar?', answer: 'Nao durante o Beta. O objetivo desta fase e validar o produto com psicologos e estagiarios clinicos.' },
  { question: 'Meus dados estao seguros?', answer: 'Sim. Dados criptografados, backup automatico e exportacao em 1 clique.' },
  { question: 'Posso mudar de plano depois?', answer: 'Sim. Voce pode fazer upgrade ou downgrade a qualquer momento.' },
  { question: 'Qual e a diferenca entre Essencial e Pro?', answer: 'Essencial organiza a rotina com agenda, pacientes, documentos e financeiro. Pro automatiza WhatsApp, lembretes, cobrancas, instrumentos e IA.' },
  { question: 'E se eu tiver 50+ pacientes?', answer: 'Ate 50 pacientes, Essencial funciona bem. Acima disso, Pro e o plano indicado.' },
  { question: 'Voces oferecem suporte?', answer: 'Free tem suporte por email. Essencial tem prioridade maior. Pro tem atendimento mais rapido e suporte por WhatsApp.' },
  { question: 'Posso usar em mais de um dispositivo?', answer: 'Sim. Celular, tablet e computador sincronizados.' },
  { question: 'E se eu sair do Beta?', answer: 'Voce pode parar de usar quando quiser. Antes de uma futura cobranca, a politica comercial sera comunicada com clareza.' },
  { question: 'Voces tem plano anual com desconto?', answer: 'Sim. Essencial e Pro exibem o valor mensal equivalente no anual.' },
]
