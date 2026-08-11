import { BadRequestException, Injectable } from '@nestjs/common'

type MusicMetadataModule = typeof import('music-metadata')

const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
])

// O backend roda como CommonJS no Node 20. music-metadata é ESM; esta função
// preserva o import() nativo em vez de o TypeScript convertê-lo para require().
const importMusicMetadata = new Function('return import("music-metadata")') as () => Promise<MusicMetadataModule>

@Injectable()
export class AudioMetadataService {
  private modulePromise?: Promise<MusicMetadataModule>

  async durationSeconds(buffer: Buffer, rawMimeType: string, maxSeconds: number): Promise<number> {
    const mimeType = rawMimeType?.split(';', 1)[0]?.trim().toLowerCase()
    if (!buffer?.length || !AUDIO_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException('Formato de áudio não permitido.')
    }

    try {
      this.modulePromise ??= importMusicMetadata()
      const { parseBuffer } = await this.modulePromise
      const metadata = await parseBuffer(buffer, mimeType, { duration: true, skipCovers: true })
      const duration = metadata.format.duration
      const hasAudio = metadata.format.hasAudio !== false
        && ((metadata.format.numberOfChannels ?? 0) > 0 || (metadata.format.sampleRate ?? 0) > 0)

      if (!hasAudio || !duration || !Number.isFinite(duration) || duration <= 0) {
        throw new Error('metadados de áudio ausentes')
      }
      if (duration > maxSeconds + 1) {
        throw new BadRequestException(`O áudio deve ter no máximo ${Math.floor(maxSeconds / 60)} minutos.`)
      }
      return Math.max(1, Math.ceil(duration))
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      throw new BadRequestException('Arquivo de áudio inválido ou corrompido.')
    }
  }
}
