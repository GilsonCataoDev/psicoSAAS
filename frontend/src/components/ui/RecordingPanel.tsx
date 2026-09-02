import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Loader2, Sparkles, AlertCircle, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAiConsent, useAcceptAiConsent, useTranscribeAudio, useTranscribeCall, useGenerateAiSummary } from '@/hooks/useApi'
import { useHasPlan } from '@/store/subscription'
import { cleanupMediaRecorder, selectSupportedAudioMimeType, stopMediaStreams } from './voice-capture'
import { useTerms } from '@/hooks/useTerms'

type Step = 'idle' | 'consent' | 'recording' | 'ready' | 'transcribing' | 'transcribed' | 'generating'
type Source = 'mic' | 'call'

type Props = {
  patientId: string
  onApplyTranscription: (text: string) => void
  onAiDraftGenerated?: (draftId: string) => void
  transcriptionActionLabel?: string
  /** Mostra a opção "Transcrever chamada" — só faz sentido pra sessões online. */
  allowCallCapture?: boolean
}

const MAX_RECORDING_SECONDS: Record<Source, number> = {
  mic: 15 * 60,
  call: 90 * 60,
}

// Bitrate baixo o bastante pra 90 min de fala caberem no limite de upload do
// endpoint de chamada (30MB) — ~32kbps mono é suficiente pra transcrição de voz.
const CALL_AUDIO_BITS_PER_SECOND = 32_000

export default function RecordingPanel({
  patientId,
  onApplyTranscription,
  onAiDraftGenerated,
  transcriptionActionLabel = 'Copiar para notas privadas',
  allowCallCapture = false,
}: Props) {
  const t = useTerms()
  const hasPro = useHasPlan('pro')
  const [step, setStep] = useState<Step>('idle')
  const [source, setSource] = useState<Source>('mic')
  const [elapsed, setElapsed] = useState(0)
  const [transcription, setTranscription] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [summaryDraftId, setSummaryDraftId] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioBlobRef = useRef<Blob | null>(null)
  const captureStreamRef = useRef<MediaStream | null>(null)
  const recordStreamRef = useRef<MediaStream | null>(null)

  const transcribeMic = useTranscribeAudio()
  const transcribeCall = useTranscribeCall()
  const generateSummary = useGenerateAiSummary()
  // Traz o texto canônico do backend — é ele que o aceite devolve byte a byte.
  const { data: recordingConsent } = useAiConsent('session_recording_transcription', patientId)
  const acceptRecordingConsent = useAcceptAiConsent('session_recording_transcription', patientId)

  function clearTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  function releaseStreams() {
    stopMediaStreams(captureStreamRef.current, recordStreamRef.current)
    captureStreamRef.current = null
    recordStreamRef.current = null
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    const recorder = mediaRecorderRef.current
    cleanupMediaRecorder(recorder, captureStreamRef.current, recordStreamRef.current)
    mediaRecorderRef.current = null
    captureStreamRef.current = null
    recordStreamRef.current = null
  }, [])

  function openConsent(next: Source) {
    setSource(next)
    setConsentGiven(false)
    setStep('consent')
  }

  async function startMicRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    if (stream.getAudioTracks().length === 0) {
      stopMediaStreams(stream)
      throw new Error('no-audio-track')
    }
    return { stream, recordStream: stream }
  }

  async function startCallRecording() {
    // getDisplayMedia exige video, mesmo quando só queremos áudio — paramos a
    // faixa de vídeo assim que capturamos, pra não gravar nem enviar imagem.
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    const audioTracks = stream.getAudioTracks()
    stream.getVideoTracks().forEach(t => t.stop())
    if (audioTracks.length === 0) {
      stream.getTracks().forEach(t => t.stop())
      throw new Error('no-audio-track')
    }
    return { stream, recordStream: new MediaStream(audioTracks) }
  }

  async function startRecording() {
    try {
      if (typeof MediaRecorder === 'undefined') throw new Error('media-recorder-unavailable')
      await acceptRecordingConsent.mutateAsync()
      const { stream, recordStream } = source === 'call'
        ? await startCallRecording()
        : await startMicRecording()

      captureStreamRef.current = stream
      recordStreamRef.current = recordStream

      const mimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? selectSupportedAudioMimeType(MediaRecorder.isTypeSupported.bind(MediaRecorder))
        : undefined
      const recorderOptions: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        ...(source === 'call' ? { audioBitsPerSecond: CALL_AUDIO_BITS_PER_SECOND } : {}),
      }
      const mr = new MediaRecorder(recordStream, recorderOptions)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        mediaRecorderRef.current = null
        releaseStreams()
        if (!blob.size) {
          audioBlobRef.current = null
          setStep('idle')
          toast.error('Nenhum áudio foi capturado. Verifique o microfone e tente novamente.')
          return
        }
        audioBlobRef.current = blob
        setStep('ready')
      }
      mr.onerror = () => {
        clearTimer()
        mediaRecorderRef.current = null
        releaseStreams()
        chunksRef.current = []
        audioBlobRef.current = null
        setStep('idle')
        toast.error('A gravação foi interrompida pelo navegador. Tente novamente.')
      }
      mr.start(1000)
      mediaRecorderRef.current = mr
      setElapsed(0)
      const maxSeconds = MAX_RECORDING_SECONDS[source]
      const maxMinutes = Math.round(maxSeconds / 60)
      timerRef.current = setInterval(() => {
        setElapsed(s => {
          const next = s + 1
          if (next >= maxSeconds) {
            window.setTimeout(stopRecording, 0)
            toast(`Limite de ${maxMinutes} minutos atingido.`)
          }
          return next
        })
      }, 1000)
      setStep('recording')
    } catch (err) {
      clearTimer()
      mediaRecorderRef.current = null
      releaseStreams()
      if (err instanceof Error && err.message === 'no-audio-track') {
        toast.error(source === 'call'
          ? 'Nenhum áudio capturado. Ao compartilhar, marque "Compartilhar áudio da guia".'
          : 'Nenhum microfone disponível. Conecte ou habilite um microfone e tente novamente.')
        return
      }
      if (err instanceof Error && err.message === 'media-recorder-unavailable') {
        toast.error('Este navegador não oferece gravação de áudio. Atualize-o ou use Chrome/Edge.')
        return
      }
      toast.error(source === 'call'
        ? 'Não foi possível capturar o áudio da chamada. Verifique as permissões e tente novamente.'
        : 'Não foi possível acessar o microfone. Verifique as permissões.')
    }
  }

  function stopRecording() {
    clearTimer()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    } else {
      releaseStreams()
    }
  }

  function discardRecording() {
    clearTimer()
    releaseStreams()
    audioBlobRef.current = null
    chunksRef.current = []
    setTranscription('')
    setStep('idle')
  }

  function extractApiError(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const msg = (err as any)?.response?.data?.message
      if (typeof msg === 'string') return msg
    }
    return 'Erro ao transcrever. Verifique sua conexão e tente novamente.'
  }

  async function handleTranscribe(blob: Blob) {
    setStep('transcribing')
    try {
      const mutation = source === 'call' ? transcribeCall : transcribeMic
      const { text } = await mutation.mutateAsync({ blob, durationSeconds: elapsed, patientId })
      setTranscription(text)
      setStep('transcribed')
    } catch (err) {
      setStep('idle')
      toast.error(extractApiError(err))
    }
  }

  function transcribeRecording() {
    const blob = audioBlobRef.current
    if (!blob) {
      toast.error('Gravação não encontrada. Grave novamente.')
      setStep('idle')
      return
    }
    handleTranscribe(blob)
  }

  async function handleGenerateSummary() {
    if (!transcription.trim()) return
    setStep('generating')
    try {
      const { draft, draftId } = await generateSummary.mutateAsync({ transcription, patientId })
      setSummaryDraft(draft)
      setSummaryDraftId(draftId)
      toast.success('Rascunho de IA gerado separadamente. Revise antes de usar.')
      setStep('transcribed')
    } catch (err) {
      setStep('transcribed')
      toast.error(extractApiError(err))
    }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  // ── Consent modal ────────────────────────────────────────────────────────────
  if (step === 'consent') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800">Consentimento para gravação</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              {source === 'call'
                ? `O áudio da chamada inteira (as duas vozes) é enviado ao servidor apenas para transcrição e não é armazenado. Apenas o texto transcrito é salvo, criptografado, no ${t.record}.`
                : `O áudio é enviado ao servidor apenas para transcrição e não é armazenado. Apenas o texto transcrito é salvo, criptografado, no ${t.record}.`}
            </p>
            {source === 'call' && (
              <p className="text-xs text-amber-700 leading-relaxed">
                Ao clicar em "Iniciar gravação", escolha a guia da chamada (Jitsi) na janela do navegador e marque a opção <strong>"Compartilhar áudio da guia"</strong> — sem isso, a voz do {t.patient} não é capturada.
              </p>
            )}
          </div>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consentGiven}
            onChange={e => setConsentGiven(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-amber-400 accent-sage-600"
          />
          <span className="text-xs text-amber-800">
            {recordingConsent?.text}
          </span>
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setStep('idle')}
            className="flex-1 rounded-xl border border-amber-200 py-2 text-xs text-amber-700 hover:bg-amber-100">
            Cancelar
          </button>
          <button type="button" onClick={startRecording} disabled={!consentGiven}
            className="flex-1 rounded-xl bg-sage-600 py-2 text-xs font-semibold text-white hover:bg-sage-700 disabled:opacity-40">
            Iniciar gravação
          </button>
        </div>
      </div>
    )
  }

  // ── Recording ────────────────────────────────────────────────────────────────
  if (step === 'recording') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-red-700">
                {source === 'call' ? 'Gravando chamada...' : 'Gravando...'}
              </p>
              <p className="text-xs text-red-500">{fmt(elapsed)}</p>
            </div>
          </div>
          <button type="button" onClick={stopRecording}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
            <MicOff className="h-3.5 w-3.5" /> Parar
          </button>
        </div>
      </div>
    )
  }

  // ── Ready to transcribe ──────────────────────────────────────────────────────
  if (step === 'ready') {
    return (
      <div className="rounded-2xl border border-sage-200 bg-sage-50 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Mic className="h-4 w-4 shrink-0 text-sage-700 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-sage-800">Gravação pronta</p>
            <p className="text-xs text-sage-700">
              Duração: {fmt(elapsed)}. O áudio ainda não foi enviado. Transcreva apenas se quiser usar a cota de IA.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={discardRecording}
            className="flex-1 rounded-xl border border-sage-200 py-2 text-xs text-sage-700 hover:bg-sage-100">
            Descartar
          </button>
          <button type="button" onClick={transcribeRecording}
            className="flex-1 rounded-xl bg-sage-600 py-2 text-xs font-semibold text-white hover:bg-sage-700">
            Transcrever agora
          </button>
        </div>
      </div>
    )
  }

  // ── Transcribing ─────────────────────────────────────────────────────────────
  if (step === 'transcribing') {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-sage-600" />
          <p className="text-sm text-neutral-600">Transcrevendo áudio...</p>
        </div>
      </div>
    )
  }

  // ── Transcribed + AI summary ─────────────────────────────────────────────────
  if (step === 'transcribed' || step === 'generating') {
    return (
      <div className="space-y-3 rounded-2xl border border-sage-200 bg-sage-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-sage-700">Transcrição</p>
          <button type="button" onClick={() => setStep('idle')}
            className="text-xs text-neutral-400 hover:text-neutral-600">Descartar</button>
        </div>
        <p className="max-h-32 overflow-y-auto rounded-xl bg-white p-3 text-xs leading-relaxed text-neutral-600 border border-sage-100">
          {transcription}
        </p>
        {summaryDraft && (
          <div className="rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-neutral-900">
            <p className="mb-1 text-xs font-semibold text-violet-700 dark:text-violet-200">Rascunho da IA (separado da evolução)</p>
            <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-neutral-600 dark:text-neutral-200">{summaryDraft}</p>
            <button type="button" onClick={() => { onAiDraftGenerated?.(summaryDraftId); toast.success('Rascunho vinculado para revisão') }}
              className="mt-2 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-medium text-violet-700 dark:border-violet-800 dark:text-violet-200">
              Vincular ao registro sem substituir a evolução
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => { onApplyTranscription(transcription); toast.success('Transcrição aplicada') }}
            className="flex-1 rounded-xl border border-sage-300 py-2 text-xs font-medium text-sage-700 hover:bg-sage-100">
            {transcriptionActionLabel}
          </button>
          {/* Transcrição de chamada fica só com o texto — sem síntese automática por IA. */}
          {source === 'call' ? null : hasPro ? (
            <button type="button" onClick={handleGenerateSummary} disabled={step === 'generating'}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sage-600 py-2 text-xs font-semibold text-white hover:bg-sage-700 disabled:opacity-50">
              {step === 'generating'
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
                : <><Sparkles className="h-3.5 w-3.5" /> Gerar resumo com IA</>}
            </button>
          ) : (
            <button type="button" disabled title="Resumo automático disponível a partir do plano Pro"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-neutral-100 py-2 text-xs font-semibold text-neutral-400">
              <Sparkles className="h-3.5 w-3.5" /> Resumo no Pro
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Idle ─────────────────────────────────────────────────────────────────────
  if (!hasPro) {
    return (
      <button
        type="button"
        disabled
        title="Transcrição por IA disponível a partir do plano Pro"
        className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-400"
      >
        <Mic className="h-3.5 w-3.5" /> Gravar {t.session}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => openConsent('mic')}
        className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-500 hover:border-sage-300 hover:text-sage-700">
        <Mic className="h-3.5 w-3.5" /> Gravar {t.session}
      </button>
      {allowCallCapture && (
        <button type="button" onClick={() => openConsent('call')}
          className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-500 hover:border-sage-300 hover:text-sage-700">
          <Video className="h-3.5 w-3.5" /> Transcrever chamada
        </button>
      )}
    </div>
  )
}
