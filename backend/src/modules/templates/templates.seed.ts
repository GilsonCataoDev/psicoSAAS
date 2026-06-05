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
        { id: 'phone', label: 'WhatsApp', type: 'tel', required: false },
        { id: 'email', label: 'E-mail', type: 'email', required: false },
        { id: 'birthDate', label: 'Data de nascimento', type: 'date', required: false },
        { id: 'mainDemand', label: 'Queixa principal', type: 'textarea', required: false },
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
    content: 'Recebi de {{paciente}} o valor de {{valor}} referente a atendimento psicologico realizado em {{data}}.',
  },
]
