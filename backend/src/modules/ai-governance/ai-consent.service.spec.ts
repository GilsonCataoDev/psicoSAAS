import { ForbiddenException } from '@nestjs/common'
import { AiConsentService } from './ai-consent.service'

describe('AiConsentService', () => {
  const patientId = '80a57fa4-b21b-4d72-9333-cd4933ab8c04'
  const events: any = {
    findOne: jest.fn(),
    create: jest.fn((value: any) => value),
    save: jest.fn(async (value: any) => value),
  }
  const patients: any = { exist: jest.fn(async () => true) }
  const service = new AiConsentService(events, patients)

  beforeEach(() => jest.clearAllMocks())

  it('bloqueia IA sem consentimento ativo', async () => {
    events.findOne.mockResolvedValue(null)
    await expect(service.assertActive('user-1', 'clinical_ai_processing')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('persiste o texto exato, versao, origem e contexto do aceite', async () => {
    events.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ action: 'accepted', textVersion: 'v1', createdAt: new Date() })
    await service.accept('user-1', 'session_recording_transcription', {
      patientId,
      textVersion: 'recording-transcription-v1',
      textSnapshot: 'Confirmo que o paciente autorizou a gravacao e a transcricao desta sessao. O audio sera processado somente para transcricao e nao sera armazenado pelo UseCognia.',
      source: 'professional_attestation',
    }, { ip: '127.0.0.1', userAgent: 'test-agent' })
    expect(events.save).toHaveBeenCalledWith(expect.objectContaining({
      psychologistId: 'user-1', patientId, action: 'accepted', textVersion: 'recording-transcription-v1',
      textSnapshot: 'Confirmo que o paciente autorizou a gravacao e a transcricao desta sessao. O audio sera processado somente para transcricao e nao sera armazenado pelo UseCognia.', source: 'professional_attestation',
      ip: '127.0.0.1', userAgent: 'test-agent',
    }))
  })

  it('valida que o paciente pertence ao profissional', async () => {
    patients.exist.mockResolvedValueOnce(false)
    await expect(service.status('user-1', 'session_recording_transcription', patientId)).rejects.toThrow('Paciente invalido')
  })
})
