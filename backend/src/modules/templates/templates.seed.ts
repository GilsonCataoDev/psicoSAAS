import { TemplateType } from './entities/template.entity'

export const DEFAULT_TEMPLATES: Array<{
  type: TemplateType
  name: string
  content: string
  tags: string[]
}> = [
  {
    type: 'patient_form',
    name: 'Prontuario inicial estruturado',
    tags: ['onboarding', 'paciente', 'prontuario'],
    content: JSON.stringify({
      fields: [
        { id: 'name', label: 'Nome completo', type: 'text', required: true },
        { id: 'email', label: 'E-mail', type: 'email', required: false },
        { id: 'phone', label: 'Telefone / WhatsApp', type: 'tel', required: true },
        { id: 'birthDate', label: 'Data de nascimento', type: 'date', required: false },
        { id: 'pronouns', label: 'Pronomes', type: 'text', required: false },
        { id: 'mainDemand', label: 'Motivo principal da busca', type: 'textarea', required: false },
        { id: 'currentContext', label: 'Contexto atual e principais dificuldades', type: 'textarea', required: false },
        { id: 'previousCare', label: 'Atendimentos psicológicos/psiquiátricos anteriores', type: 'textarea', required: false },
        { id: 'medications', label: 'Medicamentos em uso', type: 'textarea', required: false },
        { id: 'riskNotes', label: 'Pontos de atenção/risco relatados', type: 'textarea', required: false },
        { id: 'emergencyContact', label: 'Contato de emergência', type: 'text', required: false },
      ],
    }),
  },
  {
    type: 'session_note',
    name: 'Evolucao clinica estruturada',
    tags: ['onboarding', 'sessao', 'prontuario'],
    content: JSON.stringify({
      durationOptions: [30, 45, 50, 60],
      modalityOptions: ['presencial', 'online'],
      moodOptions: ['muito_dificil', 'dificil', 'neutro', 'positivo', 'muito_positivo'],
      presenceOptions: ['presenca', 'ausencia', 'atraso'],
      fields: [
        { id: 'date', label: 'Data', type: 'date', default: 'today' },
        { id: 'duration', label: 'Duracao', type: 'select', options: [30, 45, 50, 60] },
        { id: 'modality', label: 'Modalidade', type: 'select', options: ['presencial', 'online'] },
        { id: 'presence', label: 'Presenca', type: 'select', options: ['presenca', 'ausencia', 'atraso'] },
        { id: 'mood', label: 'Estado emocional observado/relatado', type: 'select', options: [1, 2, 3, 4, 5] },
        { id: 'tags', label: 'Temas abordados', type: 'tags' },
        { id: 'summary', label: 'Resumo objetivo da sessao', type: 'textarea' },
        { id: 'interventions', label: 'Intervencoes/tecnicas utilizadas', type: 'textarea' },
        { id: 'patientResponse', label: 'Resposta do paciente', type: 'textarea' },
        { id: 'nextSteps', label: 'Plano e proximos passos', type: 'textarea' },
        { id: 'privateHypotheses', label: 'Hipoteses e observacoes privadas', type: 'textarea' },
      ],
    }),
  },
  {
    type: 'document',
    name: 'Declaracao de comparecimento',
    tags: ['documento', 'declaracao'],
    content: 'DECLARACAO DE COMPARECIMENTO\n\nDeclaro, para os devidos fins, que {{paciente}} compareceu a atendimento psicologico em {{data}}, no horario de {{hora}}, com duracao aproximada de {{duracao}} minutos.\n\nEste documento nao informa diagnostico, conteudo clinico ou detalhes do atendimento, preservando o sigilo profissional.\n\n{{profissional}}\nCRP {{crp}}',
  },
  {
    type: 'whatsapp_message',
    name: 'Confirmacao de sessao',
    tags: ['whatsapp', 'confirmacao', 'anti-falta'],
    content: 'Ola, {{nome}}! Passando para confirmar sua sessao em {{data}} as {{hora}}. Se precisar remarcar, me avise com antecedencia para organizarmos o horario.',
  },
  {
    type: 'receipt',
    name: 'Recibo simples',
    tags: ['recibo', 'financeiro'],
    content: 'RECIBO DE PRESTACAO DE SERVICO\n\nRecebi de {{nome}} o valor de {{valor}}, referente a atendimento psicologico realizado em {{data}}, na modalidade {{modalidade}}.\n\nProfissional: {{profissional}}\nCRP: {{crp}}\n\nAssinado digitalmente em {{data}}.',
  },
]
