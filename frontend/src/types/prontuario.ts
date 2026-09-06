import { hasPsychologyModules } from '@/lib/professions'
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
  // Fisioterapia — Res. COFFITO 414/2012 (ver hasPhysiotherapyModules)
  exameFisico: string
  diagnosticoFuncional: string
  prognosticoFuncional: string
  recursosTerapeuticos: string
  quantitativoAtendimentos: string
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
  crp?: string
  psychologistCrp?: string
  psychologistName: string
  createdAt: string
  needsReview?: boolean
}

export type DocumentoListItem = Omit<Documento, 'content'>

/**
 * Relatorio e atestado psicologicos sao atos regulados pela Res. CFP 06/2019 e
 * so existem para psicologia — ver DOC_TYPES_FOR abaixo. Os demais tipos sao
 * neutros e apenas perdem a referencia a psicologia.
 */
export function docTypeLabels(profession?: string | null): Record<DocType, string> {
  const psi = hasPsychologyModules(profession)
  return {
    declaracao:    'Declaração de Comparecimento',
    recibo:        'Recibo de Pagamento',
    relatorio:     psi ? 'Relatório Psicológico' : 'Relatório',
    atestado:      psi ? 'Atestado Psicológico' : 'Atestado',
    encaminhamento:'Encaminhamento',
  }
}

/** Tipos que a profissao pode emitir. */
export function docTypesFor(profession?: string | null): DocType[] {
  return hasPsychologyModules(profession)
    ? ['declaracao', 'recibo', 'relatorio', 'atestado', 'encaminhamento']
    : ['declaracao', 'recibo', 'encaminhamento']
}

export const DOC_TYPE_ICONS: Record<DocType, 'documents' | 'billing' | 'success' | 'public-link'> = {
  declaracao:    'documents',
  recibo:        'billing',
  relatorio:     'documents',
  atestado:      'success',
  encaminhamento:'public-link',
}

export const DOC_TYPE_DESCRIPTIONS: Record<DocType, string> = {
  declaracao:     'Comprova comparecimento ou acompanhamento',
  recibo:         'Comprovante de pagamento',
  relatorio:      'Relato tecnico conforme finalidade informada',
  atestado:       'Certifica condicao de saude quando aplicavel',
  encaminhamento: 'Referencia a outro profissional ou servico',
}
