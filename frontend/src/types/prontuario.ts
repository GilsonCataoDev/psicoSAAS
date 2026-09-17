import { hasPsychologyModules, hasPhysiotherapyModules, hasNutritionModules, hasAestheticsModules, type Profession } from '@/lib/professions'
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
  // Nutrição — CFN 599/2018 (ver hasNutritionModules)
  queixasAlimentares: string
  habitosAlimentares: string
  alergiasIntolerâncias: string
  habitosVida: string
  diagnosticoNutricional: string
  condutaNutricional: string
  // Contato de emergência
  contatoEmergenciaNome: string
  contatoEmergenciaPhone: string
  contatoEmergenciaRelacao: string
  // Dados complementares
  escolaridade: string
  profissao: string
  estadoCivil: string
  religiao: string
  /** Campos específicos da ficha profissional (nutrição, fisio, personal etc.). */
  professionalFields: Record<string, string>
  // Metadados
  createdAt: string
  updatedAt: string
}

export type ProfessionalRecordField = {
  key: string
  label: string
  placeholder: string
  rows?: number
}

export type ProfessionalRecordGroup = {
  title: string
  fields: ProfessionalRecordField[]
}

export type ProfessionalRecordTemplate = {
  intakeTitle: string
  planTitle: string
  goalLabel: string
  goalPlaceholder: string
  groups: ProfessionalRecordGroup[]
}

const GENERIC_TEMPLATE: ProfessionalRecordTemplate = {
  intakeTitle: 'Avaliação inicial',
  planTitle: 'Plano de acompanhamento',
  goalLabel: 'Objetivos do acompanhamento',
  goalPlaceholder: 'Metas acordadas com a pessoa atendida...',
  groups: [],
}

const PROFESSIONAL_RECORD_TEMPLATES: Partial<Record<Profession, ProfessionalRecordTemplate>> = {
  nutricao: {
    intakeTitle: 'Avaliação nutricional', planTitle: 'Plano nutricional',
    goalLabel: 'Objetivos nutricionais', goalPlaceholder: 'Metas construídas com a pessoa atendida...',
    groups: [
      { title: 'História alimentar', fields: [
        { key: 'mainGoal', label: 'Objetivo principal', placeholder: 'Ex.: melhora da rotina alimentar', rows: 2 },
        { key: 'foodRoutine', label: 'Rotina alimentar', placeholder: 'Refeições, horários e contexto', rows: 3 },
        { key: 'dietaryRestrictions', label: 'Restrições, preferências e alergias', placeholder: 'Descreva apenas o que for relevante', rows: 2 },
      ] },
      { title: 'Saúde e contexto', fields: [
        { key: 'healthHistory', label: 'Condições de saúde e histórico relevante', placeholder: 'Diagnósticos, cirurgias ou acompanhamentos', rows: 3 },
        { key: 'medicationUse', label: 'Medicamentos e suplementos em uso', placeholder: 'Nome, dose e orientação quando informado', rows: 2 },
      ] },
    ],
  },
  fisioterapia: {
    intakeTitle: 'Avaliação fisioterapêutica', planTitle: 'Plano fisioterapêutico',
    goalLabel: 'Objetivos funcionais', goalPlaceholder: 'Resultados funcionais esperados e acordados...',
    groups: [
      { title: 'Queixa e função', fields: [
        { key: 'mainComplaint', label: 'Queixa principal e região', placeholder: 'Dor, limitação ou demanda funcional', rows: 2 },
        { key: 'functionalLimitations', label: 'Limitações funcionais', placeholder: 'Atividades afetadas no dia a dia', rows: 3 },
        { key: 'symptomBehavior', label: 'Comportamento dos sintomas', placeholder: 'Início, fatores de melhora e piora', rows: 3 },
      ] },
      { title: 'Histórico clínico', fields: [
        { key: 'medicalHistory', label: 'Diagnósticos, exames e cirurgias relevantes', placeholder: 'Informações trazidas pela pessoa ou por encaminhamento', rows: 3 },
        { key: 'previousTreatments', label: 'Tratamentos anteriores', placeholder: 'Fisioterapia, medicações ou outras condutas', rows: 2 },
      ] },
    ],
  },
  fonoaudiologia: {
    intakeTitle: 'Avaliação fonoaudiológica', planTitle: 'Plano fonoaudiológico',
    goalLabel: 'Objetivos fonoaudiológicos', goalPlaceholder: 'Metas funcionais acordadas para o acompanhamento...',
    groups: [
      { title: 'Demanda e comunicação', fields: [
        { key: 'mainDemand', label: 'Demanda principal', placeholder: 'Queixa, encaminhamento ou objetivo informado', rows: 2 },
        { key: 'communicationHistory', label: 'História de comunicação e linguagem', placeholder: 'Desenvolvimento, contexto e situações relevantes', rows: 3 },
        { key: 'functionalImpact', label: 'Impacto funcional percebido', placeholder: 'Comunicação, alimentação, voz ou participação social', rows: 3 },
      ] },
      { title: 'Saúde e histórico', fields: [
        { key: 'hearingHealth', label: 'Histórico auditivo e de saúde relevante', placeholder: 'Exames, intercorrências e acompanhamentos informados', rows: 3 },
        { key: 'previousInterventions', label: 'Intervenções anteriores', placeholder: 'Atendimentos, terapias ou orientações anteriores', rows: 2 },
      ] },
    ],
  },
  terapia_ocupacional: {
    intakeTitle: 'Avaliação terapêutica ocupacional', planTitle: 'Plano terapêutico ocupacional',
    goalLabel: 'Objetivos de participação', goalPlaceholder: 'Metas de autonomia e participação construídas com a pessoa...',
    groups: [
      { title: 'Rotina e participação', fields: [
        { key: 'occupationalRoutine', label: 'Rotina e ocupações significativas', placeholder: 'Autocuidado, trabalho, estudo, lazer e papéis', rows: 3 },
        { key: 'participationBarriers', label: 'Barreiras de participação', placeholder: 'Atividades que geram dificuldade ou dependência', rows: 3 },
        { key: 'supportNetwork', label: 'Rede de apoio e contexto', placeholder: 'Pessoas, ambiente e recursos relevantes', rows: 2 },
      ] },
      { title: 'Histórico de saúde', fields: [
        { key: 'healthHistory', label: 'Histórico de saúde relevante', placeholder: 'Condições, tratamentos e informações de encaminhamento', rows: 3 },
        { key: 'sensoryMotorObservations', label: 'Observações sensoriais e motoras iniciais', placeholder: 'Registre apenas dados observados ou informados', rows: 3 },
      ] },
    ],
  },
  odontologia: {
    intakeTitle: 'Anamnese odontológica', planTitle: 'Plano odontológico',
    goalLabel: 'Objetivos do tratamento', goalPlaceholder: 'Objetivos e condutas discutidos com o paciente...',
    groups: [
      { title: 'Demanda odontológica', fields: [
        { key: 'chiefComplaint', label: 'Queixa principal', placeholder: 'Motivo da consulta ou encaminhamento', rows: 2 },
        { key: 'dentalHistory', label: 'Histórico odontológico', placeholder: 'Tratamentos, hábitos e informações relevantes', rows: 3 },
        { key: 'oralHealthRoutine', label: 'Rotina de saúde bucal', placeholder: 'Hábitos e cuidados informados', rows: 2 },
      ] },
      { title: 'Histórico de saúde', fields: [
        { key: 'medicalHistory', label: 'Condições de saúde e alergias', placeholder: 'Informações relevantes para o atendimento seguro', rows: 3 },
        { key: 'medicationUse', label: 'Medicamentos em uso', placeholder: 'Nome, dose e orientação quando informado', rows: 2 },
      ] },
    ],
  },
  personal_trainer: {
    intakeTitle: 'Avaliação física inicial', planTitle: 'Plano de treino',
    goalLabel: 'Objetivos do treino', goalPlaceholder: 'Metas de treino alinhadas com o aluno...',
    groups: [
      { title: 'Objetivo e histórico', fields: [
        { key: 'trainingGoal', label: 'Objetivo principal', placeholder: 'Ex.: força, condicionamento, saúde', rows: 2 },
        { key: 'activityHistory', label: 'Histórico de atividade física', placeholder: 'Práticas atuais e experiências anteriores', rows: 3 },
        { key: 'routineAvailability', label: 'Rotina e disponibilidade', placeholder: 'Frequência, horários e contexto', rows: 2 },
      ] },
      { title: 'Cuidados e restrições', fields: [
        { key: 'healthRestrictions', label: 'Restrições e cuidados informados', placeholder: 'Informações relevantes para a prática segura', rows: 3 },
        { key: 'assessmentBaseline', label: 'Avaliação de referência', placeholder: 'Medidas e observações iniciais autorizadas', rows: 3 },
      ] },
    ],
  },
  estetica: {
    intakeTitle: 'Avaliação estética',
    planTitle: 'Plano de atendimento estético',
    goalLabel: 'Objetivos estéticos',
    goalPlaceholder: 'Metas acordadas com a cliente...',
    groups: [
      { title: 'Perfil de pele e queixa principal', fields: [
        { key: 'skinType', label: 'Tipo de pele', placeholder: 'Oleosa, seca, mista, sensível, normal...', rows: 2 },
        { key: 'fitzpatrick', label: 'Fototipo Fitzpatrick', placeholder: 'I a VI — reação ao sol e sensibilidade', rows: 1 },
        { key: 'mainConcern', label: 'Queixa principal', placeholder: 'Motivo do atendimento e objetivo da cliente', rows: 2 },
        { key: 'previousTreatments', label: 'Tratamentos anteriores', placeholder: 'Procedimentos, produtos em uso, reações observadas', rows: 3 },
      ] },
      { title: 'Histórico de saúde relevante', fields: [
        { key: 'medications', label: 'Medicamentos e suplementos em uso', placeholder: 'Nome e dose quando informado', rows: 2 },
        { key: 'allergies', label: 'Alergias e sensibilidades conhecidas', placeholder: 'Substâncias, ingredientes ou procedimentos a evitar', rows: 2 },
        { key: 'contraindications', label: 'Contraindicações identificadas', placeholder: 'Gestação, isotretinoína, cirurgia recente, doenças de pele ativas...', rows: 2 },
      ] },
    ],
  },
}

/** Psicologia conserva a ficha clínica existente; áreas mapeadas recebem campos próprios. */
export function professionalRecordTemplate(profession?: string | null): ProfessionalRecordTemplate {
  return PROFESSIONAL_RECORD_TEMPLATES[profession as Profession] ?? GENERIC_TEMPLATE
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
 * Relatório psicológico e atestado: Res. CFP 06/2019.
 * Laudo fisioterapêutico: Res. COFFITO 414/2012.
 * Relatório nutricional: Res. CFN 599/2018.
 * Atestado só existe para psicologia — demais profissões não emitem atestado próprio.
 */
export function docTypeLabels(profession?: string | null): Record<DocType, string> {
  const psi   = hasPsychologyModules(profession)
  const fisio = hasPhysiotherapyModules(profession)
  const nutri = hasNutritionModules(profession)
  const estet = hasAestheticsModules(profession)
  return {
    declaracao:    'Declaração de Comparecimento',
    recibo:        'Recibo de Pagamento',
    relatorio:     psi   ? 'Relatório Psicológico'
                 : fisio ? 'Laudo Fisioterapêutico'
                 : nutri ? 'Relatório Nutricional'
                 : estet ? 'Relatório Estético'
                 :         'Relatório',
    atestado:      psi   ? 'Atestado Psicológico'
                 :         'Atestado',
    encaminhamento:'Encaminhamento',
  }
}

/** Tipos que a profissao pode emitir. */
export function docTypesFor(profession?: string | null): DocType[] {
  const base: DocType[] = ['declaracao', 'recibo', 'encaminhamento']
  if (hasPsychologyModules(profession))    return [...base, 'relatorio', 'atestado']
  if (hasPhysiotherapyModules(profession)) return [...base, 'relatorio']
  if (hasNutritionModules(profession))     return [...base, 'relatorio']
  if (hasAestheticsModules(profession))    return [...base, 'relatorio']
  return base
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
