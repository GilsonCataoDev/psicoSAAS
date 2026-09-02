import { DEFAULT_PROFESSION } from './professions'

/**
 * Vocabulário das mensagens enviadas ao paciente (e-mail, WhatsApp, push).
 *
 * Espelha frontend/src/lib/terms.ts — manter os dois em sincronia. Existem
 * apenas 2 variantes: `psicologia` guarda exatamente os termos que o produto
 * sempre usou (é o padrão, então conta existente não muda) e `generico`
 * atende as demais profissões.
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
}

/** Ausente/desconhecida cai no padrão histórico (psicologia). */
export function termsFor(profession?: string | null): Terms {
  return (profession || DEFAULT_PROFESSION) === 'psicologia' ? TERMS.psicologia : TERMS.generico
}
