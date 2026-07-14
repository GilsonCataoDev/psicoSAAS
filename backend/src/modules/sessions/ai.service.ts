import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

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

  async generateSessionSummary(transcription: string, patientName?: string): Promise<string> {
    const patient = patientName ? `Paciente: ${patientName}.\n` : ''
    const prompt = `Você é um assistente de apoio clínico para psicólogos e terapeutas. Com base na transcrição abaixo de uma sessão clínica, elabore um rascunho conciso de nota de evolução clínica. Escreva em linguagem técnica, primeira pessoa do profissional, sem diagnóstico. Inclua: demanda trabalhada, intervenções realizadas, resposta observada e próximos passos sugeridos. Máximo 250 palavras. O profissional revisará e editará antes de salvar.

${patient}Transcrição:
${transcription.slice(0, 6000)}`

    try {
      const msg = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = msg.content[0]
      return block.type === 'text' ? block.text.trim() : ''
    } catch (err: any) {
      this.logger.error('Claude error', err?.message)
      throw new BadRequestException('Não foi possível gerar o resumo. Tente novamente.')
    }
  }

  async generateProntuarioDraft(input: string, mode: 'resumo' | 'evolucao' | 'organizar'): Promise<string> {
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = msg.content[0]
      return block.type === 'text' ? block.text.trim() : ''
    } catch (err: any) {
      this.logger.error('Claude prontuario error', err?.message)
      throw new BadRequestException('Nao foi possivel gerar o rascunho do prontuario. Tente novamente.')
    }
  }
}
