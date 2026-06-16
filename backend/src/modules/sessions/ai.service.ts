import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  private get openai(): OpenAI {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new BadRequestException('Transcrição por IA não configurada (OPENAI_API_KEY ausente)')
    return new OpenAI({ apiKey: key })
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

    try {
      const result = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
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
    const prompt = `Você é um assistente de apoio clínico para psicólogos. Com base na transcrição abaixo de uma sessão psicológica, elabore um rascunho conciso de nota de evolução clínica. Escreva em linguagem técnica, primeira pessoa do profissional, sem diagnóstico. Inclua: demanda trabalhada, intervenções realizadas, resposta observada e próximos passos sugeridos. Máximo 250 palavras. O psicólogo revisará e editará antes de salvar.

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
}
