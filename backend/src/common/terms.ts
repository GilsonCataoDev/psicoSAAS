import { DEFAULT_PROFESSION, PROFESSIONS, Profession } from './professions'

/**
 * Vocabulário das mensagens enviadas ao paciente (e-mail, WhatsApp, push).
 *
 * Espelha frontend/src/lib/terms.ts — manter os dois em sincronia. Existem
 * Psicologia preserva o vocabulário histórico. As demais áreas recebem a
 * terminologia de uso profissional sem mudar a estrutura dos dados.
 *
 * Aqui há variantes sem acento porque parte dos templates de WhatsApp e push
 * é escrita sem acentuação para evitar problemas de encoding em provedores.
 */
export type Terms = {
  patient: string
  patientCapitalized: string
  patients: string
  patientsCapitalized: string
  session: string
  sessionCapitalized: string
  sessions: string
  sessionsCapitalized: string
  /** Sem acento — para templates de WhatsApp/push. */
  sessionPlain: string
  /** Sem acento, capitalizado — para templates de WhatsApp/push. */
  sessionPlainCapitalized: string
  /**
   * "sessão" é feminino, "atendimento" é masculino: sem estes campos as frases
   * saem com concordância errada ("Seu sessao foi confirmado").
   */
  sessionPossessivePlain: string
  /** Terminação do particípio que concorda com a palavra: "confirmad{a|o}". */
  sessionAgreement: string
  record: string
  recordCapitalized: string
  /** Natureza do documento impressa no PDF: "Documento {psicológico|profissional}". */
  documentKind: string
  /** Titulo do PDF de prontuario/ficha. */
  recordTitle: string
  /** "prontuário" e masculino e "ficha" e feminino: titulo da copia ao cliente. */
  recordCopyTitle: string
}

const TERMS: Record<Profession | 'generico', Terms> = {
  psicologia: {
    patient: 'paciente',
    patientCapitalized: 'Paciente',
    patients: 'pacientes',
    patientsCapitalized: 'Pacientes',
    session: 'sessão',
    sessionCapitalized: 'Sessão',
    sessions: 'sessões',
    sessionsCapitalized: 'Sessões',
    sessionPlain: 'sessao',
    sessionPlainCapitalized: 'Sessao',
    sessionPossessivePlain: 'Sua sessao',
    sessionAgreement: 'a',
    record: 'prontuário',
    recordCapitalized: 'Prontuário',
    documentKind: 'psicológico',
    recordTitle: 'Prontuário Clínico',
    recordCopyTitle: 'Cópia do Prontuário',
  },
  psiquiatria: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'consulta', sessionCapitalized: 'Consulta', sessions: 'consultas', sessionsCapitalized: 'Consultas',
    sessionPlain: 'consulta', sessionPlainCapitalized: 'Consulta', sessionPossessivePlain: 'Sua consulta', sessionAgreement: 'a',
    record: 'prontuário', recordCapitalized: 'Prontuário', documentKind: 'profissional',
    recordTitle: 'Prontuário Clínico', recordCopyTitle: 'Cópia do Prontuário',
  },
  generico: {
    patient: 'cliente',
    patientCapitalized: 'Cliente',
    patients: 'clientes',
    patientsCapitalized: 'Clientes',
    session: 'atendimento',
    sessionCapitalized: 'Atendimento',
    sessions: 'atendimentos',
    sessionsCapitalized: 'Atendimentos',
    sessionPlain: 'atendimento',
    sessionPlainCapitalized: 'Atendimento',
    sessionPossessivePlain: 'Seu atendimento',
    sessionAgreement: 'o',
    record: 'ficha',
    recordCapitalized: 'Ficha',
    documentKind: 'profissional',
    recordTitle: 'Ficha do Cliente',
    recordCopyTitle: 'Cópia da Ficha',
  },
  nutricao: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'consulta', sessionCapitalized: 'Consulta', sessions: 'consultas', sessionsCapitalized: 'Consultas',
    sessionPlain: 'consulta', sessionPlainCapitalized: 'Consulta', sessionPossessivePlain: 'Sua consulta', sessionAgreement: 'a',
    record: 'prontuário nutricional', recordCapitalized: 'Prontuário Nutricional', documentKind: 'nutricional',
    recordTitle: 'Prontuário Nutricional', recordCopyTitle: 'Cópia do Prontuário Nutricional',
  },
  fisioterapia: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'sessão', sessionCapitalized: 'Sessão', sessions: 'sessões', sessionsCapitalized: 'Sessões',
    sessionPlain: 'sessao', sessionPlainCapitalized: 'Sessao', sessionPossessivePlain: 'Sua sessao', sessionAgreement: 'a',
    record: 'prontuário fisioterapêutico', recordCapitalized: 'Prontuário Fisioterapêutico', documentKind: 'fisioterapêutico',
    recordTitle: 'Prontuário Fisioterapêutico', recordCopyTitle: 'Cópia do Prontuário Fisioterapêutico',
  },
  fonoaudiologia: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'atendimento', sessionCapitalized: 'Atendimento', sessions: 'atendimentos', sessionsCapitalized: 'Atendimentos',
    sessionPlain: 'atendimento', sessionPlainCapitalized: 'Atendimento', sessionPossessivePlain: 'Seu atendimento', sessionAgreement: 'o',
    record: 'prontuário fonoaudiológico', recordCapitalized: 'Prontuário Fonoaudiológico', documentKind: 'fonoaudiológico',
    recordTitle: 'Prontuário Fonoaudiológico', recordCopyTitle: 'Cópia do Prontuário Fonoaudiológico',
  },
  terapia_ocupacional: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'atendimento', sessionCapitalized: 'Atendimento', sessions: 'atendimentos', sessionsCapitalized: 'Atendimentos',
    sessionPlain: 'atendimento', sessionPlainCapitalized: 'Atendimento', sessionPossessivePlain: 'Seu atendimento', sessionAgreement: 'o',
    record: 'prontuário terapêutico ocupacional', recordCapitalized: 'Prontuário Terapêutico Ocupacional', documentKind: 'terapêutico ocupacional',
    recordTitle: 'Prontuário Terapêutico Ocupacional', recordCopyTitle: 'Cópia do Prontuário Terapêutico Ocupacional',
  },
  assistencia_social: {
    patient: 'usuário', patientCapitalized: 'Usuário', patients: 'usuários', patientsCapitalized: 'Usuários',
    session: 'atendimento', sessionCapitalized: 'Atendimento', sessions: 'atendimentos', sessionsCapitalized: 'Atendimentos',
    sessionPlain: 'atendimento', sessionPlainCapitalized: 'Atendimento', sessionPossessivePlain: 'Seu atendimento', sessionAgreement: 'o',
    record: 'registro de atendimento', recordCapitalized: 'Registro de Atendimento', documentKind: 'profissional',
    recordTitle: 'Registro de Atendimento', recordCopyTitle: 'Cópia do Registro de Atendimento',
  },
  odontologia: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'consulta', sessionCapitalized: 'Consulta', sessions: 'consultas', sessionsCapitalized: 'Consultas',
    sessionPlain: 'consulta', sessionPlainCapitalized: 'Consulta', sessionPossessivePlain: 'Sua consulta', sessionAgreement: 'a',
    record: 'prontuário odontológico', recordCapitalized: 'Prontuário Odontológico', documentKind: 'odontológico',
    recordTitle: 'Prontuário Odontológico', recordCopyTitle: 'Cópia do Prontuário Odontológico',
  },
  personal_trainer: {
    patient: 'aluno', patientCapitalized: 'Aluno', patients: 'alunos', patientsCapitalized: 'Alunos',
    session: 'treino', sessionCapitalized: 'Treino', sessions: 'treinos', sessionsCapitalized: 'Treinos',
    sessionPlain: 'treino', sessionPlainCapitalized: 'Treino', sessionPossessivePlain: 'Seu treino', sessionAgreement: 'o',
    record: 'ficha de treino', recordCapitalized: 'Ficha de Treino', documentKind: 'profissional',
    recordTitle: 'Ficha de Treino', recordCopyTitle: 'Cópia da Ficha de Treino',
  },
  outro: {
    patient: 'cliente', patientCapitalized: 'Cliente', patients: 'clientes', patientsCapitalized: 'Clientes',
    session: 'atendimento', sessionCapitalized: 'Atendimento', sessions: 'atendimentos', sessionsCapitalized: 'Atendimentos',
    sessionPlain: 'atendimento', sessionPlainCapitalized: 'Atendimento', sessionPossessivePlain: 'Seu atendimento', sessionAgreement: 'o',
    record: 'ficha', recordCapitalized: 'Ficha', documentKind: 'profissional',
    recordTitle: 'Ficha do Cliente', recordCopyTitle: 'Cópia da Ficha',
  },
}

/** Conta antiga sem profissão usa psicologia; valor inválido usa o vocabulário genérico. */
export function termsFor(profession?: string | null): Terms {
  if (!profession) return TERMS[DEFAULT_PROFESSION]
  return PROFESSIONS.includes(profession as Profession) ? TERMS[profession as Profession] : TERMS.generico
}
