export interface Prontuario {
  id: string
  patientId: string
  // Anamnese
  queixaPrincipal: string
  historicoDoenca: string
  antecedentesPessoais: string
  historicoFamiliar: string
  medicamentos: string
  condicoesMedicas: string
  // Plano terapêutico
  abordagem: string
  objetivos: string
  frequencia: string
  duracaoPrevista: string
  // Contato de emergência
  contatoEmergenciaNome: string
  contatoEmergenciaPhone: string
  contatoEmergenciaRelacao: string
  // Dados complementares
  escolaridade: string
  profissao: string
  estadoCivil: string
  religiao: string
  // Metadados
  createdAt: string
  updatedAt: string
}

export type DocType =
  | 'declaracao'
  | 'recibo'
  | 'relatorio'
  | 'atestado'
  | 'encaminhamento'

export interface Documento {
  id: string
  patientId: string
  patientName: string
  type: DocType
  title: string
  content: string
  signedAt: string
  signCode: string
  crp: string
  psychologistName: string
  createdAt: string
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  declaracao:    'Declaração de Comparecimento',
  recibo:        'Recibo de Pagamento',
  relatorio:     'Relatório Psicológico',
  atestado:      'Atestado Psicológico',
  encaminhamento:'Encaminhamento',
}

export const DOC_TYPE_ICONS: Record<DocType, string> = {
  declaracao:    '📋',
  recibo:        '🧾',
  relatorio:     '📄',
  atestado:      '✅',
  encaminhamento:'↗️',
}
