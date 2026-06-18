import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useHasPlan } from '@/store/subscription'
import { useTranscribeAudio } from '@/hooks/useApi'

type DictationButtonProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

function appendTranscript(current: string, transcript: string) {
  const clean = transcript.trim()
  if (!clean) return current
  if (!current.trim()) return clean
  return `${current.trimEnd()} ${clean}`
}

function extractApiError(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const msg = (err as any)?.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return 'Erro ao transcrever. Tente novamente.'
}

export default function DictationButton({ value, onChange, className }: DictationButtonProps) {
  const hasPlan = useHasPlan('essencial')
  const transcribe = useTranscribeAudio()
  const [state, setState] = useState<'idle' | 'recording' | 'transcribing'>('idle')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        setState('transcribing')
        try {
          const { text } = await transcribe.mutateAsync(blob)
          if (text.trim()) onChange(appendTranscript(valueRef.current, text))
        } catch (err) {
          toast.error(extractApiError(err))
        } finally {
          setState('idle')
        }
      }
      mr.start(1000)
      mediaRecorderRef.current = mr
      setState('recording')
    } catch {
      toast.error('Não foi possível acessar o microfone. Verifique as permissões.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
  }

  function handleClick() {
    if (state === 'recording') return stopRecording()
    if (state === 'idle') return startRecording()
  }

  if (!hasPlan) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'transcribing'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
        state === 'recording'
          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'border-neutral-200 bg-white text-neutral-500 hover:border-sage-200 hover:bg-sage-50 hover:text-sage-700',
        className,
      )}
      title={state === 'recording' ? 'Parar ditado' : state === 'transcribing' ? 'Transcrevendo...' : 'Ditado por voz'}
    >
      {state === 'transcribing'
        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Transcrevendo</>
        : state === 'recording'
        ? <><MicOff className="h-3.5 w-3.5" /> Parar</>
        : <><Mic className="h-3.5 w-3.5" /> Ditar</>
      }
    </button>
  )
}
