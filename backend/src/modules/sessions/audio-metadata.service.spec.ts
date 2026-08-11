import { BadRequestException } from '@nestjs/common'
import { AudioMetadataService } from './audio-metadata.service'

describe('AudioMetadataService', () => {
  const service = new AudioMetadataService()

  it('rejeita MIME fora da lista permitida antes do parsing', async () => {
    await expect(service.durationSeconds(Buffer.from('conteudo'), 'text/html', 900))
      .rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejeita conteúdo falso mesmo quando o MIME declara áudio', async () => {
    await expect(service.durationSeconds(Buffer.from('<html>não é áudio</html>'), 'audio/webm', 900))
      .rejects.toBeInstanceOf(BadRequestException)
  })
})
