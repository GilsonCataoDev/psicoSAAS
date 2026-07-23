import { NeuropsychAssessment, NeuropsychDomain } from '@/types'

const DOMAIN_LABELS: Record<NeuropsychDomain, string> = {
  intelligence: 'Inteligência',
  attention: 'Atenção',
  memory: 'Memória',
  executive_functions: 'Funções executivas',
  language: 'Linguagem',
  visuospatial_skills: 'Habilidades visuoespaciais',
  behavioral_scales: 'Escalas comportamentais',
  personality: 'Personalidade',
}

/** Organiza informações registradas pelo profissional; não chama IA nem interpreta testes. */
export function buildNeuropsychIntegrationDraft(assessment: NeuropsychAssessment): string {
  const lines: string[] = ['INTEGRAÇÃO DOS RESULTADOS — RASCUNHO DE TRABALHO', '']

  if (assessment.referralQuestion?.trim()) {
    lines.push('1. Pergunta de encaminhamento', assessment.referralQuestion.trim(), '')
  }

  lines.push('2. Informações organizadas por função neuropsicológica')
  const domains = assessment.evaluatedDomains.length
    ? assessment.evaluatedDomains
    : Array.from(new Set(assessment.batteryItems.flatMap(item => item.domains)))

  if (!domains.length) lines.push('- Nenhum domínio foi selecionado até o momento.')
  for (const domain of domains) {
    lines.push('', `${DOMAIN_LABELS[domain]}:`)
    const items = assessment.batteryItems.filter(item => item.domains.includes(domain))
    if (!items.length) {
      lines.push('- Ainda não há procedimentos vinculados a este domínio.')
      continue
    }
    for (const item of items) {
      const result = item.resultSummary?.trim()
        ? item.resultSummary.trim()
        : `[Resultado de “${item.name}” ainda não registrado]`
      lines.push(`- ${item.name}: ${result}`)
      if (item.qualitativeNotes?.trim()) lines.push(`  Observação qualitativa: ${item.qualitativeNotes.trim()}`)
    }
  }

  lines.push('', '3. Observações qualitativas gerais')
  lines.push(assessment.qualitativeObservations?.trim() || '[Preencher observações qualitativas gerais]')

  const pending = assessment.batteryItems.filter(item =>
    item.status === 'planned' || (item.status !== 'not_applied' && !item.resultSummary?.trim()),
  )
  lines.push('', '4. Pontos pendentes para revisão profissional')
  if (pending.length) pending.forEach(item => lines.push(`- Revisar ${item.name}: aplicação ou resultado ainda pendente.`))
  else lines.push('- Nenhuma pendência operacional identificada nos registros atuais.')

  lines.push(
    '',
    '5. Síntese e conclusão profissional',
    '[Integrar convergências, divergências, limitações e hipóteses clínicas. A conclusão deve ser redigida e revisada pelo profissional responsável.]',
    '',
    'Nota: este texto foi organizado automaticamente sem uso de IA e não realiza correção de testes, interpretação normativa ou diagnóstico.',
  )
  return lines.join('\n')
}
