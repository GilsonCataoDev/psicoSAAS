import { NeuropsychAiAnalysisResult, NeuropsychAiCertainty, NeuropsychAiClinicalPoint } from '@/types'

const CERTAINTY_LABELS: Record<NeuropsychAiCertainty, string> = {
  registered_data: 'dado registrado',
  cautious_inference: 'inferência cautelosa',
  missing_information: 'informação ausente',
}

function pointLines(points: NeuropsychAiClinicalPoint[]): string[] {
  if (!points.length) return ['- Nenhum ponto identificado nos registros selecionados.']
  return points.map(point => {
    const basis = point.basis.length ? ` (base: ${point.basis.join('; ')})` : ''
    return `- [${CERTAINTY_LABELS[point.certainty]}] ${point.text}${basis}`
  })
}

function listLines(items: string[]): string[] {
  return items.length ? items.map(item => `- ${item}`) : ['- Nenhum item.']
}

/** Serializa a análise do Copiloto em texto simples, para copiar ou anexar ao rascunho de integração. */
export function renderNeuropsychAiAnalysisAsText(result: NeuropsychAiAnalysisResult): string {
  const lines: string[] = [
    'SUGESTÃO DO COPILOTO CLÍNICO (GERADA POR IA — REVISAR ANTES DE USAR)', '',
    '1. Síntese do caso', ...pointLines(result.caseSynthesis), '',
    '2. Convergências', ...pointLines(result.convergences), '',
    '3. Divergências / inconsistências', ...pointLines(result.divergences), '',
    '4. Funções possivelmente preservadas', ...pointLines(result.possiblyPreservedFunctions), '',
    '5. Funções com possíveis fragilidades', ...pointLines(result.possibleFragilities), '',
    '6. Hipóteses clínicas alternativas', ...pointLines(result.alternativeHypotheses), '',
    '7. Informações ausentes ou insuficientes', ...listLines(result.missingInformation), '',
    '8. Perguntas para entrevista complementar', ...listLines(result.followUpQuestions), '',
    '9. Pontos que exigem verificação clínica', ...listLines(result.verificationPoints), '',
    '10. Sugestão de estrutura para integração', ...listLines(result.suggestedIntegrationStructure), '',
    '11. Avisos', ...listLines(result.disclaimers),
  ]
  return lines.join('\n')
}
