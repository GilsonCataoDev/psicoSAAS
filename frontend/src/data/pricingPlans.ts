import { PLAN_CATALOG, type PlanCatalogEntry } from '@/config/planCatalog'

export type PricingFeature = {
  type: 'included' | 'excluded'
  title: string
  subtitle: string
}

export type PricingRoiItem = {
  type: 'time' | 'attendance' | 'revenue' | 'collection'
  text: string
}

export type PricingPlan = PlanCatalogEntry & {
  pricePeriod: string
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
  context: 'Comece gratis e evolua conforme precisar. Recursos de IA, WhatsApp e pagamentos dependem dos provedores externos estarem configurados e disponiveis.',
  trialCta: 'Comecar no plano gratis',
  trialSubtext: 'Sem cartao. Ideal para testar a rotina com ate 10 pacientes.',
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    ...PLAN_CATALOG[0],
    pricePeriod: 'Sem prazo para expirar',
    description: 'Para psicologos com CRP ativo testarem a rotina sem custo',
    badge: null,
    features: [
      { type: 'included', title: 'Veja todos os seus atendimentos de uma vez', subtitle: 'Agenda basica' },
      { type: 'included', title: 'Comece com ate 10 pacientes simultaneos', subtitle: 'Ate 10 pacientes' },
      { type: 'included', title: 'Pacientes marcam diretamente sem voce digitar', subtitle: 'Link publico simples' },
      { type: 'included', title: 'Acompanhe quanto ganhou este mes', subtitle: 'Financeiro basico' },
      { type: 'excluded', title: 'Sem documentos e PDF', subtitle: 'Limitacao' },
      { type: 'excluded', title: 'Sem instrumentos clinicos', subtitle: 'Limitacao' },
      { type: 'excluded', title: 'Sem WhatsApp automatico', subtitle: 'Limitacao' },
      { type: 'excluded', title: 'Sem transcricao de sessoes por IA', subtitle: 'Limitacao' },
    ],
    cta: 'Comece gratis agora',
    ctaSubtext: 'Sem cartao. Sem compromisso. 10 min de setup.',
    roi: null,
  },
  {
    ...PLAN_CATALOG[1],
    pricePeriod: '/mes',
    description: 'Tudo em um so lugar: agenda, pacientes, prontuario, documentos, financeiro, WhatsApp automatico e IA',
    badge: 'Plano unico',
    featured: true,
    features: [
      { type: 'included', title: 'Sem limite de pacientes, cresca o quanto quiser', subtitle: 'Pacientes ilimitados' },
      { type: 'included', title: 'Pacientes confirmam presenca em 1 clique', subtitle: 'Link publico de agendamento' },
      { type: 'included', title: 'Gere declaracoes, recibos, relatorios, atestados e encaminhamentos', subtitle: 'Documentos ilimitados com verificacao' },
      { type: 'included', title: 'Saiba quanto faturou e quanto falta receber', subtitle: 'Financeiro completo' },
      { type: 'included', title: 'Use escalas clinicas disponibilizadas no sistema, como PHQ-9 e GAD-7', subtitle: 'Uso e interpretacao sob responsabilidade profissional' },
      { type: 'included', title: 'Organize avaliações neuropsicológicas do planejamento ao relatório final', subtitle: 'Módulo neuropsicológico e Copiloto clínico' },
      { type: 'included', title: 'Envie mensagens automaticas com a integracao conectada', subtitle: 'WhatsApp sujeito a configuracao e disponibilidade' },
      { type: 'included', title: 'Mensagens podem soar como voce', subtitle: 'Modelos WhatsApp personalizados' },
      { type: 'included', title: 'Envie link de cobranca para o paciente pagar em 1 clique', subtitle: 'Cobranca com links' },
      { type: 'included', title: 'Lembretes automaticos 24h e 1h antes', subtitle: 'Lembretes automaticos' },
      { type: 'included', title: 'Grave, transcreva e gere rascunhos com IA quando habilitada', subtitle: 'Ate 120 min/mes de transcricao' },
      { type: 'included', title: 'Sala de video gerada na hora, ou cole seu link de Meet/Zoom se preferir', subtitle: 'Sessoes online (Jitsi automatico, opcional)' },
      { type: 'included', title: 'Acompanhe faltas, comparecimento e receita registrada', subtitle: 'Relatorios avancados' },
    ],
    roi: {
      items: [
        { type: 'time', text: 'Automatize lembretes, cobrancas e follow-up' },
        { type: 'attendance', text: 'Diminua faltas com mensagens 24h e 1h antes' },
        { type: 'revenue', text: 'Recupere pagamentos pendentes com menos trabalho manual' },
        { type: 'collection', text: 'Use IA como apoio para transcricao e resumo clinico' },
      ],
      note: 'Resultados dependem da rotina e do uso de cada profissional',
    },
    cta: 'Contratar Pro',
    ctaSubtext: 'Cartao necessario. Cobranca mensal.',
  },
]

export const PRICING_COMPARISON = {
  title: 'QUAL A DIFERENCA REAL?',
  sections: [
    { title: 'WhatsApp', free: 'Sem WhatsApp automatico', pro: 'Envio automatico quando a integracao estiver conectada' },
    { title: 'Lembretes', free: 'Sem lembretes automaticos', pro: '24h e 1h antes, quando o WhatsApp estiver disponivel' },
    { title: 'Cobranca', free: 'Financeiro basico, sem cobranca automatizada', pro: 'Link e mensagem quando o provedor de pagamentos estiver configurado' },
    { title: 'IA', free: 'Sem transcricao/rascunho por IA', pro: 'Ate 120 min/mes de transcricao, quando a IA estiver habilitada' },
    { title: 'Sessao online', free: 'Sem sala de video integrada', pro: 'Sala Jitsi automatica ao marcar online (pode desativar e usar seu proprio link)' },
    { title: 'Documentos', free: 'Sem documentos/PDF', pro: 'Documentos ilimitados com verificacao' },
    { title: 'Instrumentos clinicos', free: 'Nao disponivel', pro: 'Escalas e instrumentos clinicos' },
    { title: 'Escalabilidade', free: 'Ate 10 pacientes ativos', pro: '50+, 100+. O sistema aguenta' },
  ],
}

export const PRICING_FAQ = [
  { question: 'Posso cancelar a qualquer hora?', answer: 'Sim. O cancelamento pode ser solicitado pelo sistema e segue o ciclo de cobranca e os Termos de Uso vigentes.' },
  { question: 'Preciso de cartao para começar?', answer: 'Nao. O plano Gratis nao exige cartao e permite organizar ate 10 pacientes.' },
  { question: 'Como meus dados sao protegidos?', answer: 'O UseCognia aplica HTTPS, controle de acesso, isolamento entre contas, criptografia de campos sensiveis, backup cifrado e exportacao autenticada. Nenhum sistema e absolutamente seguro.' },
  { question: 'Posso mudar de plano depois?', answer: 'Sim. Voce pode fazer upgrade ou downgrade a qualquer momento entre Gratis e Pro.' },
  { question: 'O que o Pro inclui?', answer: 'Tudo: pacientes ilimitados, documentos, financeiro, WhatsApp automatico, lembretes, cobranca, instrumentos clinicos, avaliacao neuropsicologica e IA.' },
  { question: 'E se eu tiver mais de 10 pacientes?', answer: 'O plano Gratis vai ate 10 pacientes. Acima disso, o Pro e o plano indicado, com pacientes ilimitados.' },
  { question: 'Voces oferecem suporte?', answer: 'Sim. O canal atual e usecognia@gmail.com. O prazo de resposta pode variar conforme a demanda.' },
  { question: 'Posso usar em mais de um dispositivo?', answer: 'Sim. Celular, tablet e computador sincronizados.' },
  { question: 'Posso ficar no plano Gratis?', answer: 'Sim. Voce pode continuar no Gratis enquanto os limites atenderem sua rotina.' },
  { question: 'A cobranca do plano Pro e mensal?', answer: 'Sim. Hoje o Pro e cobrado mensalmente.' },
]
