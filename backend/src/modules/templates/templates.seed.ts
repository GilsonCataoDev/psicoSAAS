import { TemplateType } from './entities/template.entity'

export const DEFAULT_TEMPLATES: Array<{
  type: TemplateType
  name: string
  content: string
  tags: string[]
}> = [
  {
    type: 'patient_form',
    name: 'Prontuario inicial simples',
    tags: ['onboarding', 'paciente', 'prontuario'],
    content: JSON.stringify({
      fields: [
        { id: 'name', label: 'Nome completo', type: 'text', required: true },
        { id: 'email', label: 'E-mail', type: 'email', required: false },
        { id: 'phone', label: 'Telefone / WhatsApp', type: 'tel', required: true },
        { id: 'birthDate', label: 'Data de nascimento', type: 'date', required: false },
        { id: 'mainDemand', label: 'Queixa principal', type: 'textarea', required: false },
      ],
    }),
  },
  {
    type: 'session_note',
    name: 'Nota de sessao rapida',
    tags: ['onboarding', 'sessao', 'prontuario'],
    content: JSON.stringify({
      durationOptions: [30, 45, 60],
      modalityOptions: ['presencial', 'teleconferencia'],
      moodOptions: ['muito_dificil', 'dificil', 'neutro', 'positivo', 'muito_positivo'],
      presenceOptions: ['presenca', 'ausencia', 'atraso'],
      fields: [
        { id: 'date', label: 'Data', type: 'date', default: 'today' },
        { id: 'duration', label: 'Duracao', type: 'select', options: [30, 45, 60] },
        { id: 'modality', label: 'Modalidade', type: 'select', options: ['presencial', 'teleconferencia'] },
        { id: 'mood', label: 'Estado emocional', type: 'select', options: [1, 2, 3, 4, 5] },
        { id: 'tags', label: 'Temas abordados', type: 'tags' },
        { id: 'presence', label: 'Presenca', type: 'select', options: ['presenca', 'ausencia', 'atraso'] },
        { id: 'nextSession', label: 'Proxima sessao', type: 'date' },
      ],
    }),
  },
  {
    type: 'document',
    name: 'Declaracao de comparecimento',
    tags: ['documento', 'declaracao'],
    content: 'Declaro, para os devidos fins, que {{paciente}} compareceu a atendimento psicologico em {{data}}, no horario de {{hora}}, com duracao aproximada de {{duracao}} minutos.',
  },
  {
    type: 'whatsapp_message',
    name: 'Confirmacao de sessao',
    tags: ['whatsapp', 'confirmacao', 'anti-falta'],
    content: 'Ola, {{nome}}! Sua sessao esta confirmada para {{data}} as {{hora}}. Se precisar cancelar ou remarcar, me avise com antecedencia.',
  },
  {
    type: 'receipt',
    name: 'Recibo simples',
    tags: ['recibo', 'financeiro'],
    content: 'RECIBO DE PRESTACAO DE SERVICO\n\nPaciente: {{nome}}\nData: {{data}}\nValor: {{valor}}\nModalidade: {{modalidade}}\nAssinado digitalmente: sim, em {{data}}.',
  },
]
