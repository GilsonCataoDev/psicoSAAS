import { DEFAULT_PROFESSION } from './professions'

/**
 * Vocabulário da interface por profissão.
 *
 * `psicologia` guarda exatamente os termos que o produto sempre usou — é o
 * default, então conta existente não vê mudança nenhuma. Qualquer outra
 * profissão cai em `generico`.
 *
 * Só existem 2 variantes de propósito: manter um dicionário por profissão
 * multiplicaria o custo de tradução por N sem ganho real. Se uma profissão
 * específica pedir vocabulário próprio depois, adiciona a chave dela aqui.
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

const TERMS: Record<'psicologia' | 'generico', Terms> = {
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
}

/**
 * Função pura — sem dependência do store, para poder ser testada em ambiente
 * node como o resto de `lib/`. O binding React vive em `hooks/useTerms.ts`.
 */
export function termsFor(profession?: string | null): Terms {
  return (profession || DEFAULT_PROFESSION) === 'psicologia' ? TERMS.psicologia : TERMS.generico
}
