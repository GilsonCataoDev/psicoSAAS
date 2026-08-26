export const PRODUCT_HELP_ROUTES = [
  '/dashboard',
  '/pacientes',
  '/agenda',
  '/agendamentos',
  '/sessoes',
  '/documentos',
  '/financeiro',
  '/configuracoes',
  '/instrumentos',
  '/avaliacoes',
  '/planos',
] as const

export type ProductHelpRoute = typeof PRODUCT_HELP_ROUTES[number]

export type ProductHelpTopic = {
  keywords: string[]
  path: ProductHelpRoute
  answer: string
}

export const PRODUCT_HELP_TOPICS: ProductHelpTopic[] = [
  {
    keywords: ['inicio', 'painel', 'dashboard', 'resumo'],
    path: '/dashboard',
    answer: 'Abra Início para acompanhar agenda, pacientes e indicadores principais do consultório.',
  },
  {
    keywords: ['paciente', 'pacientes', 'cadastrar', 'cadastro', 'editar', 'excluir'],
    path: '/pacientes',
    answer: 'Abra Pacientes. Lá você pode cadastrar, buscar e abrir a ficha de cada paciente para editar seus dados e acompanhar o histórico.',
  },
  {
    keywords: ['agenda', 'agendar', 'consulta', 'horario', 'horário'],
    path: '/agenda',
    answer: 'Abra Agenda para criar uma consulta, escolher paciente, data e horário e acompanhar os próximos atendimentos.',
  },
  {
    keywords: ['agenda publica', 'agenda pública', 'link publico', 'link público', 'disponibilidade'],
    path: '/agendamentos',
    answer: 'Abra Agenda pública para configurar horários disponíveis, copiar seu link de agendamento e acompanhar solicitações.',
  },
  {
    keywords: ['sessao', 'sessão', 'evolucao', 'evolução', 'prontuario', 'prontuário'],
    path: '/sessoes',
    answer: 'Abra Sessões para registrar o atendimento. Para ver o histórico completo, abra a ficha do paciente e acesse o prontuário.',
  },
  {
    keywords: ['documento', 'documentos', 'atestado', 'declaracao', 'declaração', 'assinatura'],
    path: '/documentos',
    answer: 'Abra Documentos para criar, revisar, assinar e localizar documentos vinculados aos pacientes.',
  },
  {
    keywords: ['financeiro', 'pagamento', 'receita', 'despesa', 'cobranca', 'cobrança', 'pacote'],
    path: '/financeiro',
    answer: 'Abra Financeiro para registrar recebimentos e despesas e acompanhar pagamentos por sessão ou pacote.',
  },
  {
    keywords: ['configuracao', 'configuração', 'ajuste', 'perfil', 'whatsapp', 'google agenda', 'lembrete'],
    path: '/configuracoes',
    answer: 'Abra Ajustes para alterar perfil, lembretes, mensagens, integrações, pagamentos, privacidade e segurança.',
  },
  {
    keywords: ['instrumento', 'instrumentos', 'escala', 'questionario', 'questionário'],
    path: '/instrumentos',
    answer: 'Abra Instrumentos para atribuir e acompanhar escalas disponíveis no seu plano. O sistema não reproduz testes protegidos.',
  },
  {
    keywords: ['avaliacao', 'avaliação', 'neuropsicologica', 'neuropsicológica', 'bateria'],
    path: '/avaliacoes',
    answer: 'Abra Avaliações para planejar e organizar avaliações neuropsicológicas. Esse recurso está disponível no plano Pro.',
  },
  {
    keywords: ['plano', 'preco', 'preço', 'assinatura', 'pro', 'gratis', 'grátis'],
    path: '/planos',
    answer: 'Abra Planos para comparar os recursos do plano Grátis e do Pro e gerenciar sua assinatura.',
  },
]

export const PRODUCT_HELP_CONTEXT = PRODUCT_HELP_TOPICS
  .map(topic => `${topic.path}: ${topic.answer}`)
  .join('\n')
