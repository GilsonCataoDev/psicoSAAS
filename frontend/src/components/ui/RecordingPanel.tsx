import { useRef, useState } from 'react'
import { Mic, MicOff, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranscribeAudio, useGenerateAiSummary } from '@/hooks/useApi'
import { useHasPlan } from '@/store/subscription'

type Step = 'idle' | 'consent' | 'recording' | 'ready' | 'transcribing' | 'transcribed' | 'generating'

type Props = {
  patientName?: string
  onApplyTranscription: (text: string) => void
  onApplySummary: (text: string) => void
  transcriptionActionLabel?: string
}

const MAX_RECORDING_SECONDS = 15 * 60

export default function RecordingPanel({
  patientName,
  onApplyTranscription,
  onApplySummary,
  transcriptionActionLabel = 'Copiar para notas privadas',
}: Props) {
  const hasPro = useHasPlan('pro')
  const [step, setStep] = useState<Step>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [transcription, setTranscription] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioBlobRef = useRef<Blob | null>(null)

  const transcribe = useTranscribeAudio()
  const generateSummary = useGenerateAiSummary()

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        audioBlobRef.current = blob
        stream.getTracks().forEach(t => t.stop())
        setStep('ready')
      }
      mr.start(1000)
      mediaRecorderRef.current = mr
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(s => {
          const next = s + 1
          if (next >= MAX_RECORDING_SECONDS) {
            window.setTimeout(stopRecording, 0)
            toast('Limite de 15 minutos por transcrição atingido.')
          }
          return next
        })
      }, 1000)
      setStep('recording')
    } catch {
      toast.error('Não foi possível acessar o microfone. Verifique as permissões.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  function discardRecording() {
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
      const { text } = await transcribe.mutateAsync({ blob, durationSeconds: elapsed })
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
      const { draft } = await generateSummary.mutateAsync({ transcription, patientName })
      onApplySummary(draft)
      toast.success('Rascunho aplicado ao resumo da sessão')
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
              O áudio é enviado ao servidor apenas para transcrição e não é armazenado. Apenas o texto transcrito é salvo, criptografado, no prontuário.
            </p>
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
            Confirmo que o(a) paciente deu consentimento verbal para a gravação e transcrição desta sessão.
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
              <p className="text-sm font-semibold text-red-700">Gravando...</p>
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
        <div className="flex gap-2">
          <button type="button" onClick={() => { onApplyTranscription(transcription); toast.success('Transcrição aplicada') }}
            className="flex-1 rounded-xl border border-sage-300 py-2 text-xs font-medium text-sage-700 hover:bg-sage-100">
            {transcriptionActionLabel}
          </button>
          {hasPro ? (
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
        <Mic className="h-3.5 w-3.5" /> Gravar sessão
      </button>
    )
  }

  return (
    <button type="button" onClick={() => setStep('consent')}
      className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-500 hover:border-sage-300 hover:text-sage-700">
      <Mic className="h-3.5 w-3.5" /> Gravar sessão
    </button>
  )
}
