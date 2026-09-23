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
    keywords: ['inicio', 'painel', 'dashboard', 'resumo', 'indicador'],
    path: '/dashboard',
    answer: 'Abra Início para acompanhar agenda do dia, pacientes ativos, próximos atendimentos e indicadores principais do consultório.',
  },
  {
    keywords: ['paciente', 'pacientes', 'cadastrar', 'cadastro', 'editar', 'excluir', 'ficha'],
    path: '/pacientes',
    answer: 'Abra Pacientes para cadastrar, buscar ou abrir a ficha de cada paciente. Na ficha você edita dados, vê o histórico de sessões, prontuário, documentos e financeiro do paciente.',
  },
  {
    keywords: ['agenda', 'agendar', 'consulta', 'horario', 'horário', 'marcar'],
    path: '/agenda',
    answer: 'Abra Agenda para criar um agendamento: escolha o paciente, a data e o horário. Você também visualiza e cancela atendimentos futuros por aqui.',
  },
  {
    keywords: ['agenda publica', 'agenda pública', 'link publico', 'link público', 'disponibilidade', 'agendamento online', 'self-service'],
    path: '/agendamentos',
    answer: 'Abra Agenda pública para configurar seus horários disponíveis e gerar o link que o paciente usa para agendar sozinho, sem precisar entrar em contato.',
  },
  {
    keywords: ['sessao', 'sessão', 'evolucao', 'evolução', 'prontuario', 'prontuário', 'registro', 'atendimento'],
    path: '/sessoes',
    answer: 'Abra Sessões para registrar o atendimento: humor, resumo clínico, próximos passos e notas privadas. Para ver o histórico completo, abra a ficha do paciente e acesse o prontuário.',
  },
  {
    keywords: ['ditar', 'ditado', 'voz', 'microfone', 'falar', 'digitar por voz'],
    path: '/sessoes',
    answer: 'O botão "Ditar" aparece ao lado dos campos de texto nas sessões. Clique nele, fale, e o texto é inserido automaticamente via reconhecimento de voz do navegador. Funciona em Chrome e Edge sem custo extra.',
  },
  {
    keywords: ['gravar', 'gravacao', 'gravação', 'transcrever', 'transcricao', 'transcrição', 'audio', 'áudio', 'whisper'],
    path: '/sessoes',
    answer: 'O botão "Gravar sessão" (plano Pro) grava o áudio do microfone ou da chamada e envia para transcrição automática via IA. Após a transcrição, você pode copiar o texto para as notas ou pedir um resumo em IA.',
  },
  {
    keywords: ['resumo', 'resumir', 'ia', 'inteligencia artificial', 'inteligência artificial', 'rascunho', 'gerar texto', 'copiloto'],
    path: '/sessoes',
    answer: 'Após gravar e transcrever a sessão (plano Pro), clique em "Gerar resumo com IA". O sistema cria um rascunho de evolução clínica que você revisa antes de salvar. O rascunho nunca é salvo automaticamente.',
  },
  {
    keywords: ['documento', 'documentos', 'atestado', 'declaracao', 'declaração', 'encaminhamento', 'assinatura', 'qr code', 'verificar'],
    path: '/documentos',
    answer: 'Abra Documentos para criar atestados, declarações e encaminhamentos. Os documentos têm QR code de verificação e podem ser assinados digitalmente e enviados por e-mail ao paciente.',
  },
  {
    keywords: ['financeiro', 'pagamento', 'receita', 'despesa', 'cobranca', 'cobrança', 'pacote', 'recebimento', 'pix'],
    path: '/financeiro',
    answer: 'Abra Financeiro para registrar recebimentos e despesas, criar pacotes de sessões e acompanhar o status de pagamento por paciente.',
  },
  {
    keywords: ['configuracao', 'configuração', 'ajuste', 'perfil', 'conta', 'foto'],
    path: '/configuracoes',
    answer: 'Abra Ajustes para alterar nome, foto de perfil, especialidade, e dados do consultório.',
  },
  {
    keywords: ['whatsapp', 'lembrete', 'notificacao', 'notificação', 'mensagem automatica', 'mensagem automática'],
    path: '/configuracoes',
    answer: 'Abra Ajustes > Integrações para conectar o WhatsApp e ativar lembretes automáticos de agendamento enviados ao paciente antes da consulta.',
  },
  {
    keywords: ['google agenda', 'google calendar', 'sincronizar', 'sincronizacao', 'sincronização', 'calendario', 'calendário'],
    path: '/configuracoes',
    answer: 'Abra Ajustes > Integrações para conectar o Google Agenda. Os agendamentos do UseCognia aparecem automaticamente no seu Google Calendar.',
  },
  {
    keywords: ['instrumento', 'instrumentos', 'escala', 'questionario', 'questionário', 'phq', 'gad', 'bdi', 'enviar para paciente'],
    path: '/instrumentos',
    answer: 'Abra Instrumentos para atribuir escalas ao paciente. O paciente recebe um link e responde pelo celular. O resultado e a pontuação aparecem automaticamente para você. O sistema não reproduz testes protegidos.',
  },
  {
    keywords: ['avaliacao', 'avaliação', 'neuropsicologica', 'neuropsicológica', 'bateria', 'laudo', 'relatorio neuropsico'],
    path: '/avaliacoes',
    answer: 'Abra Avaliações (plano Pro) para planejar baterias neuropsicológicas, registrar resultados de cada procedimento e usar o Copiloto de IA para apoio na integração clínica. O profissional revisa e assina o laudo.',
  },
  {
    keywords: ['plano', 'preco', 'preço', 'assinatura', 'pro', 'gratis', 'grátis', 'upgrade', 'assinar'],
    path: '/planos',
    answer: 'Abra Planos para comparar os recursos do plano Grátis (até 10 pacientes) e do Pro (ilimitado + IA + avaliações neuropsicológicas) e gerenciar sua assinatura.',
  },
  {
    keywords: ['portal', 'portal do paciente', 'paciente acessar', 'link do paciente'],
    path: '/pacientes',
    answer: 'Cada paciente tem um portal individual. Abra a ficha do paciente e copie o link do portal para compartilhar. Por lá o paciente vê documentos e responde instrumentos sem precisar criar conta.',
  },
]

export const PRODUCT_HELP_CONTEXT = `
O UseCognia é um sistema de gestão clínica para psicólogos, fisioterapeutas e nutricionistas. Funcionalidades principais:

SESSÕES E PRONTUÁRIO
- Registrar sessão: abrir Sessões, preencher data, paciente, humor, resumo e próximos passos.
- Ditado por voz: botão "Ditar" ao lado dos campos de texto nas sessões — usa o microfone do navegador sem custo.
- Gravação com IA (Pro): botão "Gravar sessão" grava o áudio, transcreve via Whisper e oferece "Gerar resumo com IA". O rascunho é separado da evolução e precisa ser revisado antes de salvar.
- Prontuário: histórico completo de sessões na ficha do paciente.

AGENDA E AGENDAMENTOS
- Agenda interna: criar e visualizar agendamentos de qualquer paciente.
- Agenda pública (self-service): link gerado em Agendamentos para o paciente marcar sozinho.
- Google Calendar: sincronização automática via Ajustes > Integrações.
- WhatsApp: lembretes automáticos antes da consulta via Ajustes > Integrações.

DOCUMENTOS
- Criar atestados, declarações e encaminhamentos com geração por IA (rascunho revisável).
- QR code de verificação e envio por e-mail.

INSTRUMENTOS CLÍNICOS
- Atribuir escalas (PHQ-9, GAD-7, BDI-II etc.) ao paciente, que responde por link público.
- Pontuação e interpretação automáticas; alerta de item crítico (ex: risco de suicídio no PHQ-9).

AVALIAÇÕES NEUROPSICOLÓGICAS (Pro)
- Planejar bateria, registrar resultados e usar Copiloto de IA para apoio na integração clínica.
- Profissional revisa e assina o laudo final.

FINANCEIRO
- Registrar recebimentos, despesas e criar pacotes de sessões.

PORTAL DO PACIENTE
- Link individual por paciente para acessar documentos e responder instrumentos sem criar conta.

PLANOS
- Grátis: até 10 pacientes, agenda, sessões, documentos.
- Pro: pacientes ilimitados, transcrição e resumo por IA, avaliações neuropsicológicas, Copiloto.

${PRODUCT_HELP_TOPICS.map(topic => `${topic.path}: ${topic.answer}`).join('\n')}
`.trim()
