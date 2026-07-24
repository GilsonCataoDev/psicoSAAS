import { BadRequestException, Injectable } from '@nestjs/common'
import { Prospect } from '../entities/prospect.entity'
import { ProspectSignal } from '../entities/prospect-signal.entity'

const SIGNAL_MENTION: Partial<Record<string, string>> = {
  whatsapp_scheduling: 'o agendamento é disponibilizado pelo WhatsApp',
  ask_for_hours: 'os horários são combinados diretamente por contato',
  contact_to_schedule: 'o agendamento é feito por contato direto',
  private_practice: 'o atendimento é particular',
  manual_process_text: 'a organização da agenda é feita manualmente',
  no_online_agenda: 'não foi encontrada agenda online nas páginas analisadas',
  no_patient_portal: 'não há evidência pública de portal do paciente',
  psymeet_profile: 'o perfil está listado publicamente no PsyMeet',
  linkedin_autonomous_snippet: 'a atuação parece ser autônoma, segundo o perfil público no LinkedIn',
}

/** Reaproveitado pelo DraftService (template) e pela AiService (prompt) — mesmo contexto para os dois caminhos. */
export function describeSource(prospect: Prospect): string {
  if (prospect.website) {
    const domain = prospect.websiteDomain ?? prospect.website
    return `no site ${domain}`
  }
  if (prospect.sourceType === 'linkedin_search') return 'no seu perfil público no LinkedIn'
  if (prospect.sourceType === 'psymeet_search') return 'no seu perfil público no PsyMeet'
  return 'em um diretório profissional público'
}

/** Reaproveitado pelo DraftService (template) e pela AiService (prompt) — mesmo contexto para os dois caminhos. */
export function pickMention(signals: ProspectSignal[]): string | null {
  const positive = signals
    .filter(s => s.points > 0 && SIGNAL_MENTION[s.type])
    .sort((a, b) => b.points - a.points)[0]
  return positive ? SIGNAL_MENTION[positive.type] ?? null : null
}

/**
 * Gera rascunho de abordagem — nunca enviado automaticamente. Só é permitido
 * após aprovação humana explícita (status "approved") e nunca para leads
 * marcados como doNotContact. Menciona apenas um sinal comprovado, cita a
 * fonte, não afirma ausência de sistema e sempre oferece opção de recusa.
 */
@Injectable()
export class DraftService {
  generate(prospect: Prospect, signals: ProspectSignal[]): string {
    if (prospect.doNotContact) {
      throw new BadRequestException('Este lead está marcado como "não contatar" — rascunho não pode ser gerado.')
    }
    if (prospect.status !== 'approved') {
      throw new BadRequestException('Rascunho só pode ser gerado após aprovação humana (status "approved").')
    }

    const name = prospect.professionalName?.split(' ')[0] || 'Olá'
    const source = describeSource(prospect)
    const mention = pickMention(signals)

    const lines = [
      `Olá, ${name}. Encontrei seu contato profissional ${source}.`,
      mention ? `Vi que ${mention}.` : null,
      'A UseCognia criou uma ferramenta gratuita para estruturar rascunhos de evolução psicológica, sem exigir cadastro. Posso lhe enviar o link para avaliação?',
      'Se não fizer sentido, não volto a entrar em contato — é só responder que prefere não receber novos contatos.',
    ].filter(Boolean)

    return lines.join(' ')
  }
}
