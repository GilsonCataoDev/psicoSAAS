type MutableText = { current: string }

const AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
] as const

function appendTranscript(current: string, transcript: string) {
  const clean = transcript.trim()
  if (!clean) return current
  if (!current.trim()) return clean
  return `${current.trimEnd()} ${clean}`
}

export function accumulateFinalTranscript(current: MutableText, transcript: string) {
  const next = appendTranscript(current.current, transcript)
  current.current = next
  return next
}

export function selectSupportedAudioMimeType(
  isSupported: (mimeType: string) => boolean,
): string | undefined {
  return AUDIO_MIME_CANDIDATES.find(isSupported)
}

export function stopMediaStreams(...streams: Array<MediaStream | null | undefined>) {
  const tracks = new Set<MediaStreamTrack>()
  streams.forEach(stream => stream?.getTracks().forEach(track => tracks.add(track)))
  tracks.forEach(track => track.stop())
}

export function cleanupMediaRecorder(
  recorder: MediaRecorder | null | undefined,
  ...streams: Array<MediaStream | null | undefined>
) {
  if (recorder) {
    recorder.ondataavailable = null
    recorder.onstop = null
    recorder.onerror = null
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        // As faixas ainda são encerradas abaixo, mesmo se o navegador já tiver
        // mudado o estado do gravador entre a checagem e o stop().
      }
    }
  }
  stopMediaStreams(...streams)
}
