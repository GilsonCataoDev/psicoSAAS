import { DEFAULT_PROFESSION, PROFESSIONS, type Profession } from './professions'

/**
 * Vocabulário da interface por profissão.
 *
 * `psicologia` mantém os termos históricos. As demais áreas usam o vocabulário
 * próprio, mas sem duplicar telas ou alterar o modelo de dados.
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
  record: string
  recordCapitalized: string
  intake: string
  intakeCapitalized: string
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
    record: 'prontuário',
    recordCapitalized: 'Prontuário',
    intake: 'anamnese',
    intakeCapitalized: 'Anamnese',
  },
  psiquiatria: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'consulta', sessionCapitalized: 'Consulta', sessions: 'consultas', sessionsCapitalized: 'Consultas',
    record: 'prontuário', recordCapitalized: 'Prontuário',
    intake: 'anamnese', intakeCapitalized: 'Anamnese',
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
    record: 'ficha',
    recordCapitalized: 'Ficha',
    intake: 'avaliação inicial',
    intakeCapitalized: 'Avaliação inicial',
  },
  nutricao: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'consulta', sessionCapitalized: 'Consulta', sessions: 'consultas', sessionsCapitalized: 'Consultas',
    record: 'prontuário nutricional', recordCapitalized: 'Prontuário Nutricional',
    intake: 'avaliação nutricional', intakeCapitalized: 'Avaliação nutricional',
  },
  fisioterapia: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'sessão', sessionCapitalized: 'Sessão', sessions: 'sessões', sessionsCapitalized: 'Sessões',
    record: 'prontuário fisioterapêutico', recordCapitalized: 'Prontuário Fisioterapêutico',
    intake: 'avaliação fisioterapêutica', intakeCapitalized: 'Avaliação fisioterapêutica',
  },
  fonoaudiologia: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'atendimento', sessionCapitalized: 'Atendimento', sessions: 'atendimentos', sessionsCapitalized: 'Atendimentos',
    record: 'prontuário fonoaudiológico', recordCapitalized: 'Prontuário Fonoaudiológico',
    intake: 'avaliação fonoaudiológica', intakeCapitalized: 'Avaliação fonoaudiológica',
  },
  terapia_ocupacional: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'atendimento', sessionCapitalized: 'Atendimento', sessions: 'atendimentos', sessionsCapitalized: 'Atendimentos',
    record: 'prontuário terapêutico ocupacional', recordCapitalized: 'Prontuário Terapêutico Ocupacional',
    intake: 'avaliação terapêutica ocupacional', intakeCapitalized: 'Avaliação terapêutica ocupacional',
  },
  assistencia_social: {
    patient: 'usuário', patientCapitalized: 'Usuário', patients: 'usuários', patientsCapitalized: 'Usuários',
    session: 'atendimento', sessionCapitalized: 'Atendimento', sessions: 'atendimentos', sessionsCapitalized: 'Atendimentos',
    record: 'registro de atendimento', recordCapitalized: 'Registro de Atendimento',
    intake: 'avaliação inicial', intakeCapitalized: 'Avaliação inicial',
  },
  odontologia: {
    patient: 'paciente', patientCapitalized: 'Paciente', patients: 'pacientes', patientsCapitalized: 'Pacientes',
    session: 'consulta', sessionCapitalized: 'Consulta', sessions: 'consultas', sessionsCapitalized: 'Consultas',
    record: 'prontuário odontológico', recordCapitalized: 'Prontuário Odontológico',
    intake: 'anamnese', intakeCapitalized: 'Anamnese',
  },
  personal_trainer: {
    patient: 'aluno', patientCapitalized: 'Aluno', patients: 'alunos', patientsCapitalized: 'Alunos',
    session: 'treino', sessionCapitalized: 'Treino', sessions: 'treinos', sessionsCapitalized: 'Treinos',
    record: 'ficha de treino', recordCapitalized: 'Ficha de Treino',
    intake: 'avaliação física', intakeCapitalized: 'Avaliação física',
  },
  outro: {
    patient: 'cliente', patientCapitalized: 'Cliente', patients: 'clientes', patientsCapitalized: 'Clientes',
    session: 'atendimento', sessionCapitalized: 'Atendimento', sessions: 'atendimentos', sessionsCapitalized: 'Atendimentos',
    record: 'ficha', recordCapitalized: 'Ficha',
    intake: 'avaliação inicial', intakeCapitalized: 'Avaliação inicial',
  },
}

/**
 * Função pura — sem dependência do store, para poder ser testada em ambiente
 * node como o resto de `lib/`. O binding React vive em `hooks/useTerms.ts`.
 */
export function termsFor(profession?: string | null): Terms {
  if (!profession) return TERMS[DEFAULT_PROFESSION]
  return PROFESSIONS.includes(profession as Profession) ? TERMS[profession as Profession] : TERMS.generico
}
