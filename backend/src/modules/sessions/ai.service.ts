import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

const CLAUDE_TEXT_MODEL = 'claude-haiku-4-5-20251001'
export const CLAUDE_HAIKU_INPUT_USD_MICROS_PER_TOKEN = 1
export const CLAUDE_HAIKU_OUTPUT_USD_MICROS_PER_TOKEN = 5

// Groq é o provedor de texto padrão (mais barato, chave já ativa em produção).
// Anthropic vira fallback automático — só é usada se GROQ_API_KEY não estiver
// configurada. Ver textClient() abaixo.
const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile'
export const GROQ_LLAMA_INPUT_USD_MICROS_PER_TOKEN = 0.05
export const GROQ_LLAMA_OUTPUT_USD_MICROS_PER_TOKEN = 0.08

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

export type AiDocumentType = 'relatorio' | 'atestado' | 'encaminhamento'
export type AiDocumentField = 'demand' | 'procedure' | 'analysis' | 'conclusion' | 'referralReason'

export type ChurnDiagnosisInput = {
  daysWithoutLogin: number
  patients: number
  sessions: number
  appointments: number
  score: number
  reasons: string[]
}

export type AssessmentCriticalFlag = { label: string; note: string }

export type AssessmentScoreDetails = {
  score: number
  level?: string
  subscales?: Array<{ label: string; score: number; level?: string }>
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

  /**
   * Cliente de geração de texto — prefere Groq (mais barato, chave já ativa em
   * produção), cai para Anthropic só se GROQ_API_KEY não estiver configurada.
   * Mesmo padrão de preferência já usado em whisperClient (Groq > OpenAI).
   */
  private get textClient(): { client: OpenAI | Anthropic; provider: 'groq' | 'anthropic'; model: string } {
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      return { client: new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' }), provider: 'groq', model: GROQ_TEXT_MODEL }
    }
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey) {
      return { client: new Anthropic({ apiKey: anthropicKey }), provider: 'anthropic', model: CLAUDE_TEXT_MODEL }
    }
    throw new BadRequestException('Geração de texto por IA não configurada (GROQ_API_KEY/ANTHROPIC_API_KEY ausentes)')
  }

  /** Chama o provedor de texto ativo (ver textClient) e normaliza a resposta. */
  private async callTextModel(prompt: string, maxTokens: number, timeoutMs?: number): Promise<AiTextResult> {
    const { client, provider, model } = this.textClient
    if (provider === 'anthropic') {
      const msg = await (client as Anthropic).messages.create(
        { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] },
        timeoutMs ? { timeout: timeoutMs } : undefined,
      )
      return this.parseTextResult(msg, 'anthropic', model)
    }
    const completion = await (client as OpenAI).chat.completions.create(
      { model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] },
      timeoutMs ? { timeout: timeoutMs } : undefined,
    )
    return this.parseTextResult(completion, 'groq', model)
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
      this.logger.error(`Whisper error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Não foi possível transcrever o áudio. Verifique o arquivo e tente novamente.')
    }
  }

  private calculateClaudeCost(inputTokens: number, outputTokens: number): number {
    return Math.round(
      (inputTokens * CLAUDE_HAIKU_INPUT_USD_MICROS_PER_TOKEN)
      + (outputTokens * CLAUDE_HAIKU_OUTPUT_USD_MICROS_PER_TOKEN),
    )
  }

  private calculateGroqCost(inputTokens: number, outputTokens: number): number {
    return Math.round(
      (inputTokens * GROQ_LLAMA_INPUT_USD_MICROS_PER_TOKEN)
      + (outputTokens * GROQ_LLAMA_OUTPUT_USD_MICROS_PER_TOKEN),
    )
  }

  /** Normaliza a resposta do provedor ativo (Anthropic ou Groq/OpenAI) num formato único. */
  private parseTextResult(
    response: Anthropic.Messages.Message | OpenAI.Chat.Completions.ChatCompletion,
    provider: 'groq' | 'anthropic',
    model: string,
  ): AiTextResult {
    if (provider === 'anthropic') {
      const msg = response as Anthropic.Messages.Message
      const block = msg.content[0]
      const inputTokens = msg.usage.input_tokens ?? 0
      const outputTokens = msg.usage.output_tokens ?? 0
      return {
        text: block.type === 'text' ? block.text.trim() : '',
        usage: { model, inputTokens, outputTokens, costUsdMicros: this.calculateClaudeCost(inputTokens, outputTokens) },
      }
    }

    const completion = response as OpenAI.Chat.Completions.ChatCompletion
    const inputTokens = completion.usage?.prompt_tokens ?? 0
    const outputTokens = completion.usage?.completion_tokens ?? 0
    return {
      text: (completion.choices[0]?.message?.content ?? '').trim(),
      usage: { model, inputTokens, outputTokens, costUsdMicros: this.calculateGroqCost(inputTokens, outputTokens) },
    }
  }

  async generateSessionSummary(transcription: string): Promise<AiTextResult> {
    const mocked = await this.mockTextIfEnabled(
      transcription, 15_000,
      '[MOCK] Rascunho de evolução de teste E2E. Revisar antes de salvar.',
      'Não foi possível gerar o resumo. Tente novamente.',
    )
    if (mocked) return mocked

    const prompt = `Você é um assistente de apoio clínico para psicólogos e terapeutas. Com base na transcrição abaixo de uma sessão clínica, elabore um rascunho conciso de nota de evolução clínica. Escreva em linguagem técnica, primeira pessoa do profissional, sem diagnóstico. Inclua: demanda trabalhada, intervenções realizadas, resposta observada e próximos passos sugeridos. Máximo 250 palavras. O profissional revisará e editará antes de salvar.

Transcrição:
${transcription.slice(0, 6000)}`

    try {
      return await this.callTextModel(prompt, 700)
    } catch (err: any) {
      this.logger.error(`AI session summary error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Não foi possível gerar o resumo. Tente novamente.')
    }
  }

  async generateProntuarioDraft(input: string, mode: 'resumo' | 'evolucao' | 'organizar'): Promise<AiTextResult> {
    const mocked = await this.mockTextIfEnabled(
      input, 15_000,
      '[MOCK] Rascunho de prontuário de teste E2E. Rascunho gerado por IA, revisar antes de salvar.',
      'Nao foi possivel gerar o rascunho do prontuario. Tente novamente.',
    )
    if (mocked) return mocked

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
      return await this.callTextModel(prompt, 900)
    } catch (err: any) {
      this.logger.error(`AI prontuario error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Nao foi possivel gerar o rascunho do prontuario. Tente novamente.')
    }
  }

  async generateDocumentDraft(
    input: string,
    documentType: AiDocumentType,
    field: AiDocumentField,
  ): Promise<AiTextResult> {
    const mocked = await this.mockTextIfEnabled(
      input, 15_000,
      '[MOCK] Rascunho de documento de teste E2E.',
      'Não foi possível gerar o rascunho do documento. Tente novamente.',
    )
    if (mocked) return mocked

    const cleanInput = this.redactDirectIdentifiers(input.trim()).slice(0, 8000)
    const fieldInstruction: Record<AiDocumentField, string> = {
      demand: 'organize uma descrição objetiva da demanda e da finalidade informada',
      procedure: 'organize a descrição dos procedimentos, fontes consultadas, período e limites do trabalho',
      analysis: 'organize o desenvolvimento técnico apenas com informações pertinentes à finalidade do documento',
      conclusion: 'organize uma conclusão técnica cautelosa, limitada aos dados registrados e à finalidade informada',
      referralReason: 'organize uma justificativa breve para continuidade do cuidado, revelando somente o necessário',
    }

    const prompt = `Você auxilia um psicólogo a redigir um rascunho de ${documentType}, conforme a Resolução CFP nº 06/2019.
Tarefa: ${fieldInstruction[field]}.
Use somente os fatos fornecidos. Não invente informações, não feche diagnóstico, não prescreva conduta e não cite regras que não estejam no texto.
Não inclua nome, CPF, telefone, e-mail, endereço ou qualquer identificador direto.
Escreva em português do Brasil, em um ou dois parágrafos, com no máximo 180 palavras.
Retorne somente o rascunho, sem título e sem comentários sobre a tarefa.

Anotações do profissional:
${cleanInput}`

    try {
      return await this.callTextModel(prompt, 550)
    } catch (err: any) {
      this.logger.error(`AI document draft error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Não foi possível gerar o rascunho do documento. Tente novamente.')
    }
  }

  /** Guarda de mock compartilhada — mesmo env var/critério do Copiloto Neuropsicológico. */
  private async mockTextIfEnabled(haystack: string, timeoutMs: number, mockText: string, errorMessage: string): Promise<AiTextResult | null> {
    if (process.env.NODE_ENV === 'production' || process.env.NEUROPSYCH_AI_MOCK_PROVIDER !== 'true') return null
    if (haystack.includes('__E2E_TIMEOUT__')) {
      await new Promise(resolve => setTimeout(resolve, timeoutMs + 2000))
    }
    if (haystack.includes('__E2E_PROVIDER_ERROR__')) {
      throw new BadRequestException(errorMessage)
    }
    return { text: mockText, usage: { model: `${GROQ_TEXT_MODEL}-mock`, inputTokens: 10, outputTokens: 20, costUsdMicros: 2 } }
  }

  /**
   * Diagnóstico de churn (admin, não-clínico). A pontuação continua
   * determinística (calculada em ChurnService) — só a narrativa é gerada por
   * IA. Não recebe dados de identificação de pacientes, só métricas
   * agregadas do tenant.
   */
  async generateChurnDiagnosis(input: ChurnDiagnosisInput): Promise<AiTextResult> {
    const prompt = `Você ajuda um time de sucesso do cliente a entender o risco de cancelamento (churn) de contas de um SaaS para psicólogos.
Com base nas métricas abaixo, escreva um diagnóstico curto e direto (máximo 100 palavras) explicando o risco e sugerindo o próximo passo mais eficaz.
Não invente informações além das métricas fornecidas. Tom profissional e objetivo, em português do Brasil.

Métricas:
- Score de saúde da conta: ${input.score}/100
- Dias sem login: ${input.daysWithoutLogin}
- Pacientes cadastrados: ${input.patients}
- Sessões registradas: ${input.sessions}
- Agendamentos: ${input.appointments}
- Sinais identificados: ${input.reasons.join('; ') || 'nenhum sinal de risco relevante'}`

    try {
      return await this.callTextModel(prompt, 300)
    } catch (err: any) {
      this.logger.error(`AI churn diagnosis error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Não foi possível gerar o diagnóstico agora. Tente novamente.')
    }
  }

  /**
   * Rascunho de mensagem de primeira abordagem para um lead do Radar de
   * Psicólogos (prospecção B2B interna, admin-only). Dado não-clínico
   * (presença profissional pública) — não passa pelas restrições de
   * docs/ia-gratuita-politica.md, que são específicas de dados clínicos.
   * Chamador (ProspectingService) sempre tem um rascunho por template pronto
   * como fallback caso esta chamada falhe.
   */
  async generateProspectOutreachDraft(input: {
    firstName: string
    sourceDescription: string
    signalMention: string | null
  }): Promise<AiTextResult> {
    const prompt = `Você escreve uma mensagem curta de primeiro contato comercial (B2B) de um psicólogo para outro psicólogo, oferecendo uma ferramenta gratuita de anotações clínicas da UseCognia.

REGRAS OBRIGATÓRIAS:
1. Nunca afirme que a pessoa não usa nenhum sistema — não invente ausência de ferramentas.
2. Cite apenas o sinal fornecido (se houver), sem exagerar ou fabricar detalhes.
3. Sempre ofereça a opção de não receber novos contatos, de forma explícita.
4. Tom respeitoso, colega-para-colega, sem jargão de vendas agressivo, em português do Brasil.
5. No máximo 4 frases curtas. Retorne somente o texto da mensagem, sem título, sem aspas, sem comentários.

Dados:
- Primeiro nome: ${input.firstName}
- Onde encontrei o contato: ${input.sourceDescription}
- Sinal observado (use no máximo este, se houver): ${input.signalMention ?? 'nenhum sinal específico — não mencione nenhum'}`

    try {
      return await this.callTextModel(prompt, 220)
    } catch (err: any) {
      this.logger.error(`AI prospect outreach draft error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Não foi possível gerar o rascunho com IA agora.')
    }
  }

  /**
   * Sugestão de próxima mensagem para responder a réplica de um lead do
   * Radar de Psicólogos, colada manualmente pelo admin (sem captura
   * automática de WhatsApp — ver docs/PROSPECTING_RADAR.md). Mesmas
   * ressalvas de dado não-clínico do método acima. Sem fallback por
   * template: se a IA falhar, o admin escreve manualmente, como já fazia.
   */
  async generateProspectReplySuggestion(input: {
    firstName: string
    channel: 'whatsapp' | 'direct'
    priorMessage: string | null
    leadReplyText: string
  }): Promise<AiTextResult> {
    const channelLabel = input.channel === 'whatsapp' ? 'WhatsApp' : 'contato direto'
    const prompt = `Você ajuda um profissional a responder a réplica de um lead (outro psicólogo) em uma conversa de prospecção comercial B2B pelo canal ${channelLabel}.

REGRAS OBRIGATÓRIAS:
1. Nunca afirme que a pessoa não usa nenhum sistema.
2. Se a resposta do lead indicar desinteresse, recusa ou pedido para não ser mais contatado, a sugestão deve ser SOMENTE uma mensagem curta de agradecimento e confirmação de que não haverá mais contato — nunca insista.
3. Se houver interesse, seja objetivo: confirme o próximo passo (enviar link da ferramenta gratuita) sem pressão.
4. No máximo 3 frases curtas, tom colega-para-colega, português do Brasil.
5. Retorne somente o texto da mensagem sugerida, sem título, sem aspas, sem comentários.

${input.priorMessage ? `Mensagem original enviada: "${input.priorMessage}"` : ''}
Resposta do lead (${input.firstName}): "${input.leadReplyText}"`

    try {
      return await this.callTextModel(prompt, 200)
    } catch (err: any) {
      this.logger.error(`AI prospect reply suggestion error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Não foi possível gerar a sugestão de resposta agora. Tente novamente.')
    }
  }

  /**
   * Interpretação de avaliação psicológica (PHQ-9, GAD-7, etc.) a partir da
   * pontuação já calculada no frontend (scale-scoring.ts) — este método não
   * corrige nem recalcula a pontuação, só redige um rascunho de interpretação
   * para o profissional revisar.
   *
   * IMPORTANTE — segurança clínica: o alerta de item crítico (ex.: risco de
   * suicídio no PHQ-9) NUNCA depende só do texto gerado pelo modelo. O
   * chamador (InstrumentAssignmentsController) deve sempre anexar
   * criticalFlags ao retorno de forma determinística, fora do texto da IA —
   * ver uso deste método no controller.
   */
  async generateAssessmentInterpretation(
    scaleName: string,
    scoreDetails: AssessmentScoreDetails,
    criticalFlags: AssessmentCriticalFlag[],
  ): Promise<AiTextResult> {
    const subscalesText = scoreDetails.subscales?.length
      ? scoreDetails.subscales.map(s => `${s.label}: ${s.score}${s.level ? ` (${s.level})` : ''}`).join('; ')
      : 'não há subescalas'

    const prompt = `Você é um assistente de apoio clínico para psicólogos. Você NÃO substitui o julgamento clínico e NÃO produz diagnóstico.

REGRAS OBRIGATÓRIAS:
1. Nunca produza diagnóstico definitivo. Use linguagem cautelosa ("pode sugerir", "é compatível com", "merece investigação adicional").
2. Use somente a pontuação fornecida — você não tem acesso aos itens originais nem a manuais de correção.
3. Se houver pontos críticos assinalados, mencione-os com destaque e recomende avaliação de risco imediata — nunca minimize ou omita.
4. Escreva em português do Brasil, no máximo 150 palavras, tom técnico.
5. Finalize com: "Rascunho gerado por IA, revisar antes de usar."

Escala: ${scaleName}
Pontuação total: ${scoreDetails.score}${scoreDetails.level ? ` (${scoreDetails.level})` : ''}
Subescalas: ${subscalesText}
Pontos críticos assinalados: ${criticalFlags.length ? criticalFlags.map(f => `${f.label} — ${f.note}`).join('; ') : 'nenhum'}`

    try {
      return await this.callTextModel(prompt, 450)
    } catch (err: any) {
      this.logger.error(`AI assessment interpretation error: ${err?.status ?? err?.name ?? 'unknown'}`)
      throw new BadRequestException('Não foi possível gerar a interpretação agora. Tente novamente.')
    }
  }

  private redactDirectIdentifiers(value: string): string {
    return value
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[e-mail omitido]')
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF omitido]')
      .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/g, '[telefone omitido]')
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
      return await this.callTextModel(prompt, options.maxOutputTokens, options.timeoutMs)
    } catch (err: any) {
      // Nunca logar err?.message aqui: em falhas de validação da API, o provedor
      // pode ecoar de volta um trecho do corpo da requisição (que contém o
      // registro clínico redigido) na mensagem de erro. Logamos só o essencial
      // para diagnóstico (tipo/status), nunca o conteúdo.
      this.logger.error(`AI neuropsych analysis error: ${err?.status ?? err?.name ?? 'unknown'}`)
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
