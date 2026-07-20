import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const CLAUDE_TEXT_MODEL = 'claude-haiku-4-5-20251001'
export const CLAUDE_HAIKU_INPUT_USD_MICROS_PER_TOKEN = 1
export const CLAUDE_HAIKU_OUTPUT_USD_MICROS_PER_TOKEN = 5

export type AiTextUsage = {
  model: string
  inputTokens: number
  outputTokens: number
  costUsdMicros: number
}

export type AiTextResult = {
  text: string
  usage: AiTextUsage
}

// Versão do prompt do Copiloto Neuropsicológico — mudar sempre que o texto do
// prompt de sistema mudar, para auditoria e para invalidar análises antigas
// se o formato de resposta mudar de forma incompatível.
export const NEUROPSYCH_ANALYSIS_PROMPT_VERSION = 'npai-v1'

export type NeuropsychAnalysisBatteryItem = {
  name: string
  procedureType: string
  domains: string[]
  status: string
  purpose?: string
  resultSummary?: string
  qualitativeNotes?: string
}

export type NeuropsychAnalysisPayload = {
  referralQuestion?: string
  clinicalHistory?: string
  clinicalHypotheses?: string
  qualitativeObservations?: string
  evaluatedDomains: string[]
  batteryItems: NeuropsychAnalysisBatteryItem[]
}

export type NeuropsychAnalysisOptions = {
  /** Teto de tokens de saída pedido ao provedor. */
  maxOutputTokens: number
  /** Timeout da chamada HTTP ao provedor, em ms. */
  timeoutMs: number
  /** Tamanho máximo (chars) do registro textual montado a partir do payload. */
  maxInputChars: number
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  private get whisperClient(): { client: OpenAI; model: string } {
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      return {
        client: new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' }),
        model: 'whisper-large-v3-turbo',
      }
    }
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      return { client: new OpenAI({ apiKey: openaiKey }), model: 'whisper-1' }
    }
    throw new BadRequestException('Transcrição não configurada. Defina GROQ_API_KEY no servidor. OPENAI_API_KEY fica apenas como fallback.')
  }

  private get anthropic(): Anthropic {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new BadRequestException('Resumo por IA não configurado (ANTHROPIC_API_KEY ausente)')
    return new Anthropic({ apiKey: key })
  }

  async transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a'
      : mimeType.includes('ogg') ? 'ogg'
      : mimeType.includes('wav') ? 'wav'
      : 'webm'

    const file = new File([buffer as unknown as BlobPart], `recording.${ext}`, { type: mimeType })
    const { client, model } = this.whisperClient

    try {
      const result = await client.audio.transcriptions.create({
        file,
        model,
        language: 'pt',
      })
      return result.text
    } catch (err: any) {
      this.logger.error('Whisper error', err?.message)
      throw new BadRequestException('Não foi possível transcrever o áudio. Verifique o arquivo e tente novamente.')
    }
  }

  private calculateClaudeCost(inputTokens: number, outputTokens: number): number {
    return Math.round(
      (inputTokens * CLAUDE_HAIKU_INPUT_USD_MICROS_PER_TOKEN)
      + (outputTokens * CLAUDE_HAIKU_OUTPUT_USD_MICROS_PER_TOKEN),
    )
  }

  private parseTextResult(msg: Anthropic.Messages.Message): AiTextResult {
    const block = msg.content[0]
    const inputTokens = msg.usage.input_tokens ?? 0
    const outputTokens = msg.usage.output_tokens ?? 0

    return {
      text: block.type === 'text' ? block.text.trim() : '',
      usage: {
        model: CLAUDE_TEXT_MODEL,
        inputTokens,
        outputTokens,
        costUsdMicros: this.calculateClaudeCost(inputTokens, outputTokens),
      },
    }
  }

  async generateSessionSummary(transcription: string, patientName?: string): Promise<AiTextResult> {
    const patient = patientName ? `Paciente: ${patientName}.\n` : ''
    const prompt = `Você é um assistente de apoio clínico para psicólogos e terapeutas. Com base na transcrição abaixo de uma sessão clínica, elabore um rascunho conciso de nota de evolução clínica. Escreva em linguagem técnica, primeira pessoa do profissional, sem diagnóstico. Inclua: demanda trabalhada, intervenções realizadas, resposta observada e próximos passos sugeridos. Máximo 250 palavras. O profissional revisará e editará antes de salvar.

${patient}Transcrição:
${transcription.slice(0, 6000)}`

    try {
      const msg = await this.anthropic.messages.create({
        model: CLAUDE_TEXT_MODEL,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      })
      return this.parseTextResult(msg)
    } catch (err: any) {
      this.logger.error('Claude error', err?.message)
      throw new BadRequestException('Não foi possível gerar o resumo. Tente novamente.')
    }
  }

  async generateProntuarioDraft(input: string, mode: 'resumo' | 'evolucao' | 'organizar'): Promise<AiTextResult> {
    const cleanInput = input.trim().slice(0, 8000)
    const modeInstruction = {
      resumo: 'gere um resumo clinico conciso, em linguagem profissional, preservando apenas informacoes relevantes para acompanhamento.',
      evolucao: 'gere um rascunho de evolucao clinica com demanda trabalhada, intervencoes, resposta observada e proximos passos.',
      organizar: 'organize as anotacoes em blocos: queixa/demanda, conteudo trabalhado, intervencoes, resposta observada e plano/proximos passos.',
    }[mode]

    const prompt = `Voce e um assistente de apoio clinico para psicologos e terapeutas.
Use o texto abaixo somente para organizar um rascunho de prontuario.
Nao invente fatos, nao feche diagnostico, nao prescreva condutas e nao substitua o julgamento clinico.
Nao inclua dados pessoais identificaveis. Se houver nome, telefone, email, CPF, endereco ou identificadores, omita.
Escreva em portugues do Brasil, tom tecnico e claro.
Tarefa: ${modeInstruction}
Finalize com a frase: "Rascunho gerado por IA, revisar antes de salvar."

Texto:
${cleanInput}`

    try {
      const msg = await this.anthropic.messages.create({
        model: CLAUDE_TEXT_MODEL,
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      })
      return this.parseTextResult(msg)
    } catch (err: any) {
      this.logger.error('Claude prontuario error', err?.message)
      throw new BadRequestException('Nao foi possivel gerar o rascunho do prontuario. Tente novamente.')
    }
  }

  /**
   * Copiloto de Raciocínio Clínico Neuropsicológico (plano Pro).
   * O payload já chega redigido pelo chamador (sem nome, CPF, telefone, e-mail,
   * endereço) — este método não recebe nem envia identificadores diretos.
   * Retorna sempre o texto bruto do modelo; a validação/parse do JSON estruturado
   * é responsabilidade do chamador (NeuropsychAiAnalysisService), que trata
   * JSON inválido com um fallback seguro.
   */
  async generateNeuropsychAnalysis(
    payload: NeuropsychAnalysisPayload,
    options: NeuropsychAnalysisOptions,
  ): Promise<AiTextResult> {
    // Seam de teste — NUNCA ativo em produção (checagem explícita de NODE_ENV).
    // Usado exclusivamente pela suíte E2E local para testar o fluxo completo do
    // Copiloto sem gastar créditos reais do provedor. O gatilho de cada cenário
    // vem de um marcador no próprio texto selecionado pelo profissional (só
    // alcançável em ambiente de teste, propositalmente).
    if (process.env.NODE_ENV !== 'production' && process.env.NEUROPSYCH_AI_MOCK_PROVIDER === 'true') {
      return this.mockNeuropsychAnalysis(payload, options)
    }

    const prompt = this.buildNeuropsychAnalysisPrompt(payload, options.maxInputChars)

    try {
      const msg = await this.anthropic.messages.create(
        {
          model: CLAUDE_TEXT_MODEL,
          max_tokens: options.maxOutputTokens,
          messages: [{ role: 'user', content: prompt }],
        },
        { timeout: options.timeoutMs },
      )
      return this.parseTextResult(msg)
    } catch (err: any) {
      // Nunca logar err?.message aqui: em falhas de validação da API, o provedor
      // pode ecoar de volta um trecho do corpo da requisição (que contém o
      // registro clínico redigido) na mensagem de erro. Logamos só o essencial
      // para diagnóstico (tipo/status), nunca o conteúdo.
      this.logger.error(`Claude neuropsych analysis error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Não foi possível gerar a análise agora. Tente novamente em instantes.')
    }
  }

  /**
   * Implementação falsa do provedor, só para E2E local (ver guarda de
   * NODE_ENV/NEUROPSYCH_AI_MOCK_PROVIDER acima). Um marcador de texto no
   * conteúdo selecionado decide o cenário simulado — permite ao E2E cobrir
   * sucesso, JSON inválido e timeout sem tocar a API real.
   */
  private async mockNeuropsychAnalysis(
    payload: NeuropsychAnalysisPayload,
    options: NeuropsychAnalysisOptions,
  ): Promise<AiTextResult> {
    const haystack = [
      payload.referralQuestion, payload.clinicalHistory, payload.clinicalHypotheses, payload.qualitativeObservations,
    ].filter(Boolean).join(' ')

    if (haystack.includes('__E2E_TIMEOUT__')) {
      await new Promise(resolve => setTimeout(resolve, options.timeoutMs + 2000))
    }
    if (haystack.includes('__E2E_PROVIDER_ERROR__')) {
      throw new BadRequestException('Não foi possível gerar a análise agora. Tente novamente em instantes.')
    }

    const text = haystack.includes('__E2E_INVALID_JSON__')
      ? 'isto não é um JSON válido'
      : JSON.stringify({
        caseSynthesis: [{ text: '[MOCK] Síntese de teste E2E.', basis: ['história clínica'], certainty: 'cautious_inference' }],
        convergences: [],
        divergences: [],
        possiblyPreservedFunctions: [{ text: '[MOCK] Memória preservada nos registros.', basis: ['Procedimento 1'], certainty: 'registered_data' }],
        possibleFragilities: [],
        alternativeHypotheses: [],
        missingInformation: ['[MOCK] Falta informação sobre linguagem.'],
        followUpQuestions: ['[MOCK] Perguntar sobre rotina de sono.'],
        verificationPoints: [],
        suggestedIntegrationStructure: ['[MOCK] Estrutura sugerida de teste.'],
        disclaimers: ['[MOCK] Sugestão gerada por IA (mock de teste), revisar antes de qualquer uso clínico.'],
      })

    return {
      text,
      usage: { model: `${CLAUDE_TEXT_MODEL}-mock`, inputTokens: 42, outputTokens: 84, costUsdMicros: 462 },
    }
  }

  private buildNeuropsychAnalysisPrompt(payload: NeuropsychAnalysisPayload, maxInputChars: number): string {
    const section = (label: string, value?: string) => value?.trim() ? `${label}:\n${value.trim().slice(0, 6000)}\n` : ''

    const itemBlocks = payload.batteryItems.map((item, index) => {
      const lines = [
        `Procedimento ${index + 1}: ${item.name} (tipo: ${item.procedureType}; status: ${item.status})`,
        `Domínios: ${item.domains.join(', ') || 'não informado'}`,
      ]
      if (item.purpose?.trim()) lines.push(`Finalidade: ${item.purpose.trim().slice(0, 1000)}`)
      if (item.resultSummary?.trim()) lines.push(`Resultado registrado: ${item.resultSummary.trim().slice(0, 3000)}`)
      if (item.qualitativeNotes?.trim()) lines.push(`Observações qualitativas: ${item.qualitativeNotes.trim().slice(0, 3000)}`)
      return lines.join('\n')
    })

    const head = [
      section('Domínios avaliados', payload.evaluatedDomains.join(', ')),
      section('Motivo e pergunta de encaminhamento', payload.referralQuestion),
      section('História clínica', payload.clinicalHistory),
      section('Hipóteses clínicas provisórias', payload.clinicalHypotheses),
      section('Observações qualitativas gerais', payload.qualitativeObservations),
    ].filter(Boolean).join('\n')

    // Orçamento de caracteres para a bateria: o que sobrar depois do cabeçalho.
    // Itens são incluídos inteiros, na ordem recebida, até estourar o orçamento —
    // nunca cortamos um item no meio, e um aviso de truncamento é anexado quando
    // algum item fica de fora.
    let itemsBudget = Math.max(0, maxInputChars - head.length - 200)
    const includedItems: string[] = []
    let truncated = false
    for (const block of itemBlocks) {
      if (block.length + 2 > itemsBudget) { truncated = itemBlocks.length > includedItems.length; break }
      includedItems.push(block)
      itemsBudget -= block.length + 2
    }

    const itemsText = includedItems.join('\n\n')
    const record = [
      head,
      itemsText ? `Bateria de avaliação:\n${itemsText}\n` : '',
      truncated ? '[Alguns procedimentos da bateria foram omitidos por limite de tamanho do envio.]' : '',
    ].filter(Boolean).join('\n')

    return `Você é um copiloto de raciocínio clínico para apoiar psicólogos na integração de avaliações neuropsicológicas. Você NÃO é um profissional de psicologia, NÃO substitui o julgamento clínico e NÃO produz diagnóstico.

REGRAS OBRIGATÓRIAS (violar qualquer uma invalida a resposta):
1. Nunca produza diagnóstico definitivo. Use apenas linguagem hipotética e cautelosa ("pode sugerir", "é compatível com", "merece investigação adicional").
2. Nunca corrija testes, nunca interprete escores como se tivesse acesso a tabelas normativas — você não tem acesso a manuais, itens, estímulos ou chaves de correção, e não deve fingir que tem.
3. Nunca invente informação. Use somente o que está no registro abaixo.
4. Toda afirmação relevante deve indicar em "basis" os campos ou procedimentos registrados em que se baseia (ex: "história clínica", "Procedimento 2 - resultado registrado").
5. Classifique cada afirmação em "certainty" como um destes valores exatos: "registered_data" (dado diretamente registrado), "cautious_inference" (inferência cautelosa a partir de registros) ou "missing_information" (não há dado suficiente).
6. Nunca recomende conduta como ordem — no máximo, aponte pontos que merecem atenção do profissional.
7. Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto antes ou depois, seguindo EXATAMENTE este formato:

{
  "caseSynthesis": [{"text": string, "basis": string[], "certainty": "registered_data"|"cautious_inference"|"missing_information"}],
  "convergences": [mesmo formato acima],
  "divergences": [mesmo formato acima],
  "possiblyPreservedFunctions": [mesmo formato acima],
  "possibleFragilities": [mesmo formato acima],
  "alternativeHypotheses": [mesmo formato acima],
  "missingInformation": [string, ...],
  "followUpQuestions": [string, ...],
  "verificationPoints": [string, ...],
  "suggestedIntegrationStructure": [string, ...],
  "disclaimers": [string, ...]
}

Preencha "disclaimers" sempre com pelo menos um aviso de que esta é uma sugestão gerada por IA, sem valor diagnóstico, que precisa ser revisada pelo profissional responsável antes de qualquer uso clínico.
Se um registro estiver ausente ou insuficiente para uma seção, retorne um array vazio [] ou inclua um item com certainty "missing_information" — nunca invente conteúdo para preencher a seção.

Registro selecionado pelo profissional (identificadores diretos já foram removidos):
${record || '(nenhum campo selecionado além dos domínios avaliados)'}`
  }
}
