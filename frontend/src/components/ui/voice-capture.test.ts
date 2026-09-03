import { describe, expect, it, vi } from 'vitest'
import {
  accumulateFinalTranscript,
  cleanupMediaRecorder,
  selectSupportedAudioMimeType,
  stopMediaStreams,
} from './voice-capture'

describe('captura de voz', () => {
  it('preserva frases finais recebidas antes da atualização do React', () => {
    const current = { current: 'Texto inicial' }

    expect(accumulateFinalTranscript(current, 'primeira frase')).toBe('Texto inicial primeira frase')
    expect(accumulateFinalTranscript(current, 'segunda frase')).toBe('Texto inicial primeira frase segunda frase')
  })

  it('usa um formato realmente suportado pelo navegador', () => {
    const supportsMp4Only = (mimeType: string) => mimeType === 'audio/mp4'

    expect(selectSupportedAudioMimeType(supportsMp4Only)).toBe('audio/mp4')
  })

  it('deixa o navegador escolher quando nenhum formato conhecido é suportado', () => {
    expect(selectSupportedAudioMimeType(() => false)).toBeUndefined()
  })

  it('encerra faixas compartilhadas uma única vez', () => {
    const stop = vi.fn()
    const track = { stop } as unknown as MediaStreamTrack
    const captureStream = { getTracks: () => [track] } as unknown as MediaStream
    const recordingStream = { getTracks: () => [track] } as unknown as MediaStream

    stopMediaStreams(captureStream, recordingStream)

    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('interrompe o gravador e remove callbacks ao sair da tela', () => {
    const stopTrack = vi.fn()
    const track = { stop: stopTrack } as unknown as MediaStreamTrack
    const stream = { getTracks: () => [track] } as unknown as MediaStream
    const recorder = {
      state: 'recording',
      stop: vi.fn(),
      ondataavailable: vi.fn(),
      onstop: vi.fn(),
      onerror: vi.fn(),
    } as unknown as MediaRecorder

    cleanupMediaRecorder(recorder, stream, stream)

    expect(recorder.stop).toHaveBeenCalledOnce()
    expect(recorder.ondataavailable).toBeNull()
    expect(recorder.onstop).toBeNull()
    expect(recorder.onerror).toBeNull()
    expect(stopTrack).toHaveBeenCalledOnce()
  })
})
