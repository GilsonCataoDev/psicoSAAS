import { ProspectConfidence } from '../entities/prospect.entity'
import { SignalType } from '../entities/prospect-signal.entity'

export interface DetectedSignal {
  type: SignalType
  points: number
  confidence: ProspectConfidence
  evidence: string
  evidenceUrl: string | null
  detector: string
}

export interface DetectionContext {
  /** Texto já normalizado (minúsculo, HTML removido) do site próprio, quando disponível. */
  text?: string
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  psymeetUrl?: string | null
  sourceType: 'own_site' | 'linkedin_search' | 'psymeet_search' | 'directory_search'
  sourceUrl: string
  /** Título + snippet do resultado de busca (sempre disponível, mesmo sem crawling). */
  searchSnippet?: string
}

const FREE_EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br', 'hotmail.com.br']
const KNOWN_MANAGEMENT_SYSTEMS = ['ivety', 'psicoo', 'psicomanager', 'iclinic', 'feegow', 'clinicorp', 'zenklub']
const INTEGRATED_AGENDA_MARKERS = ['calendly', 'agendaonline', 'booksy', 'simplesagenda', 'agendor']
const PATIENT_PORTAL_MARKERS = ['portal do paciente', 'área do paciente', 'area do paciente', 'login do paciente', 'meu prontuário online']
const LARGE_CLINIC_MARKERS = ['nossa equipe', 'nossos psicólogos', 'nossos psicologos', 'equipe multidisciplinar', 'clínica de psicologia com']
const MANUAL_PROCESS_MARKERS = ['em caso de falta', 'cancelamento com antecedência', 'cancelamento com antecedencia', 'reagendamento', 'organizar minha agenda']
const AUTONOMOUS_MARKERS = ['meu consultório', 'meu consultorio', 'atendo pessoalmente', 'sou psicóloga', 'sou psicólogo']

function has(text: string, terms: string[]): string | null {
  return terms.find(term => text.includes(term)) ?? null
}

function excerpt(text: string, term: string, radius = 60): string {
  const idx = text.indexOf(term)
  if (idx === -1) return term
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + term.length + radius)
  return text.slice(start, end).trim()
}

/**
 * Detectores de sinais públicos de maturidade digital. Cada detector é puro e
 * testável isoladamente; a linguagem de evidência segue os templates de
 * "ausência de evidência" do briefing — nunca afirma categoricamente que o
 * profissional "não usa sistema" ou é "recém-formado".
 */
export function detectSignals(ctx: DetectionContext): DetectedSignal[] {
  const signals: DetectedSignal[] = []
  const text = (ctx.text ?? '').toLowerCase()
  const snippet = (ctx.searchSnippet ?? '').toLowerCase()
  const hasOwnSiteText = text.length > 0

  if (hasOwnSiteText) {
    signals.push(...detectFromOwnSiteText(text, ctx.sourceUrl))
  }

  if (ctx.sourceType === 'psymeet_search') {
    signals.push({
      type: 'psymeet_profile',
      points: 10,
      confidence: 'medium',
      evidence: 'Perfil público encontrado no PsyMeet — pode indicar fase de captação de pacientes.',
      evidenceUrl: ctx.sourceUrl,
      detector: 'psymeet_profile',
    })
  }

  if (ctx.sourceType === 'linkedin_search' && AUTONOMOUS_MARKERS.some(m => snippet.includes(m.replace('meu ', '')))) {
    signals.push({
      type: 'linkedin_autonomous_snippet',
      points: 10,
      confidence: 'low',
      evidence: `Snippet público do LinkedIn sugere atuação autônoma: "${ctx.searchSnippet}"`,
      evidenceUrl: ctx.sourceUrl,
      detector: 'linkedin_autonomous_snippet',
    })
  }

  if (ctx.email) {
    const domain = ctx.email.split('@')[1]?.toLowerCase()
    if (domain && FREE_EMAIL_DOMAINS.includes(domain)) {
      signals.push({
        type: 'public_free_email',
        points: 10,
        confidence: 'medium',
        evidence: `E-mail profissional público usa provedor gratuito (${domain}).`,
        evidenceUrl: ctx.sourceUrl,
        detector: 'public_free_email',
      })
    }
  }

  if (!ctx.email && !ctx.phone && !ctx.linkedinUrl && !ctx.psymeetUrl) {
    signals.push({
      type: 'no_professional_contact',
      points: -30,
      confidence: 'medium',
      evidence: 'Não foi encontrado nenhum contato profissional público nas páginas analisadas.',
      evidenceUrl: ctx.sourceUrl,
      detector: 'no_professional_contact',
    })
  }

  const combinedText = `${text} ${snippet}`
  if (!combinedText.includes('psicólog') && !combinedText.includes('psicolog')) {
    signals.push({
      type: 'ambiguous_result',
      points: -50,
      confidence: 'low',
      evidence: 'O resultado não foi identificado com confiança como pertencente a um(a) psicólogo(a).',
      evidenceUrl: ctx.sourceUrl,
      detector: 'ambiguous_result',
    })
  }

  return signals
}

function detectFromOwnSiteText(text: string, sourceUrl: string): DetectedSignal[] {
  const signals: DetectedSignal[] = []

  const whatsapp = has(text, ['agendamento pelo whatsapp', 'agende pelo whatsapp', 'marque pelo whatsapp'])
  if (whatsapp) {
    signals.push({
      type: 'whatsapp_scheduling', points: 20, confidence: 'high',
      evidence: `O site direciona o agendamento ao WhatsApp: "${excerpt(text, whatsapp)}"`,
      evidenceUrl: sourceUrl, detector: 'whatsapp_scheduling',
    })
  }

  const askHours = has(text, ['consulte horários', 'consulte os horários', 'consulte horarios'])
  if (askHours) {
    signals.push({
      type: 'ask_for_hours', points: 15, confidence: 'medium',
      evidence: `Página pede contato para consultar horários: "${excerpt(text, askHours)}"`,
      evidenceUrl: sourceUrl, detector: 'ask_for_hours',
    })
  }

  const contactToSchedule = has(text, ['entre em contato para agendar', 'fale comigo para agendar'])
  if (contactToSchedule) {
    signals.push({
      type: 'contact_to_schedule', points: 15, confidence: 'medium',
      evidence: `Site pede contato direto para agendamento: "${excerpt(text, contactToSchedule)}"`,
      evidenceUrl: sourceUrl, detector: 'contact_to_schedule',
    })
  }

  const privatePractice = has(text, ['atendimento particular', 'consultório particular', 'consultorio particular'])
  if (privatePractice) {
    signals.push({
      type: 'private_practice', points: 10, confidence: 'medium',
      evidence: `Menção pública a atendimento particular: "${excerpt(text, privatePractice)}"`,
      evidenceUrl: sourceUrl, detector: 'private_practice',
    })
  }

  const autonomous = has(text, AUTONOMOUS_MARKERS)
  const largeClinic = has(text, LARGE_CLINIC_MARKERS)
  if (autonomous && !largeClinic) {
    signals.push({
      type: 'apparently_autonomous', points: 10, confidence: 'low',
      evidence: `Texto público sugere atuação autônoma: "${excerpt(text, autonomous)}"`,
      evidenceUrl: sourceUrl, detector: 'apparently_autonomous',
    })
  }

  const manualProcess = has(text, MANUAL_PROCESS_MARKERS)
  if (manualProcess) {
    signals.push({
      type: 'manual_process_text', points: 15, confidence: 'medium',
      evidence: `Texto público sobre faltas/organização de agenda: "${excerpt(text, manualProcess)}"`,
      evidenceUrl: sourceUrl, detector: 'manual_process_text',
    })
  }

  const copyrightMatch = text.match(/©\s*(\d{4})/)
  if (copyrightMatch) {
    const year = Number(copyrightMatch[1])
    const currentYear = new Date().getFullYear()
    if (year >= currentYear - 1) {
      signals.push({
        type: 'updated_content', points: 10, confidence: 'low',
        evidence: `Conteúdo do site parece atualizado (© ${year}).`,
        evidenceUrl: sourceUrl, detector: 'updated_content',
      })
    } else if (year <= currentYear - 3) {
      signals.push({
        type: 'inactive_site', points: -15, confidence: 'low',
        evidence: `Site aparentemente desatualizado (© ${year}).`,
        evidenceUrl: sourceUrl, detector: 'inactive_site',
      })
    }
  }

  const patientPortal = has(text, PATIENT_PORTAL_MARKERS)
  if (patientPortal) {
    signals.push({
      type: 'patient_portal_found', points: -30, confidence: 'high',
      evidence: `Portal do paciente encontrado nas páginas analisadas: "${excerpt(text, patientPortal)}"`,
      evidenceUrl: sourceUrl, detector: 'patient_portal_found',
    })
  } else {
    signals.push({
      type: 'no_patient_portal', points: 10, confidence: 'medium',
      evidence: 'Não há evidência pública de portal do paciente nas páginas analisadas.',
      evidenceUrl: sourceUrl, detector: 'no_patient_portal',
    })
  }

  const managementSystem = has(text, KNOWN_MANAGEMENT_SYSTEMS)
  if (managementSystem) {
    signals.push({
      type: 'known_management_system', points: -50, confidence: 'high',
      evidence: `Sistema de gestão conhecido encontrado nas páginas analisadas ("${managementSystem}").`,
      evidenceUrl: sourceUrl, detector: 'known_management_system',
    })
  }

  const integratedAgenda = has(text, INTEGRATED_AGENDA_MARKERS)
  if (integratedAgenda) {
    signals.push({
      type: 'integrated_online_agenda', points: -20, confidence: 'high',
      evidence: `Agenda online integrada encontrada ("${integratedAgenda}").`,
      evidenceUrl: sourceUrl, detector: 'integrated_online_agenda',
    })
  } else if (!managementSystem) {
    signals.push({
      type: 'no_online_agenda', points: 15, confidence: 'medium',
      evidence: 'Não foi encontrada agenda online integrada nas páginas analisadas.',
      evidenceUrl: sourceUrl, detector: 'no_online_agenda',
    })
  }

  if (largeClinic) {
    signals.push({
      type: 'large_clinic', points: -20, confidence: 'medium',
      evidence: `Texto público sugere clínica com equipe grande: "${excerpt(text, largeClinic)}"`,
      evidenceUrl: sourceUrl, detector: 'large_clinic',
    })
  }

  return signals
}
