export type EvolutionDraftInput = {
  approachLabel: string
  lifeCycleLabel: string
  sessionSummary: string
  date?: Date
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function buildSafeEvolutionDraft(input: EvolutionDraftInput): string {
  const summary = normalizeText(input.sessionSummary)
  if (!summary) return ''

  const date = (input.date ?? new Date()).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return `RASCUNHO DE EVOLUÇÃO — REVISAR ANTES DE USAR — ${date}

CONTEXTO INFORMADO
Abordagem: ${input.approachLabel}
Ciclo de vida: ${input.lifeCycleLabel}

REGISTRO FORNECIDO PELO PROFISSIONAL
${summary}

COMPLETAR APENAS SE ESTIVER REGISTRADO NA SESSÃO
• Intervenções efetivamente realizadas: [preencher ou remover]
• Resposta observada do paciente: [preencher ou remover]
• Encaminhamentos e próximos passos combinados: [preencher ou remover]

AVISO
Este rascunho apenas organiza o texto informado. Ele não cria fatos clínicos, interpretações, diagnóstico, prognóstico ou condutas. Revise e edite antes de inserir no prontuário.`
}
