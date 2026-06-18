import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type DictationButtonProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

type SpeechRecognitionConstructor = new () => SpeechRecognition

type SpeechRecognition = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionEvent = {
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

function appendTranscript(current: string, transcript: string) {
  const clean = transcript.trim()
  if (!clean) return current
  if (!current.trim()) return clean
  return `${current.trimEnd()} ${clean}`
}

export default function DictationButton({ value, onChange, className }: DictationButtonProps) {
  const [state, setState] = useState<'idle' | 'listening'>('idle')
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => () => {
    recognitionRef.current?.stop()
  }, [])

  function getRecognition() {
    const win = window as SpeechRecognitionWindow
    return win.SpeechRecognition ?? win.webkitSpeechRecognition
  }

  function startDictation() {
    const Recognition = getRecognition()
    if (!Recognition) {
      toast.error('Ditado nativo indisponível neste navegador. Use o teclado por voz do celular ou tente Chrome/Edge.')
      return
    }

    try {
      const recognition = new Recognition()
      recognition.lang = 'pt-BR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = event => {
        let finalText = ''
        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index]
          if (result.isFinal) finalText += result[0].transcript
        }
        if (finalText.trim()) onChange(appendTranscript(valueRef.current, finalText))
      }
      recognition.onerror = () => {
        setState('idle')
        toast.error('Não foi possível usar o ditado. Verifique a permissão do microfone.')
      }
      recognition.onend = () => setState('idle')
      recognition.start()
      recognitionRef.current = recognition
      setState('listening')
    } catch {
      toast.error('Não foi possível acessar o microfone. Verifique as permissões.')
    }
  }

  function stopDictation() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setState('idle')
  }

  function handleClick() {
    if (state === 'listening') return stopDictation()
    return startDictation()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50',
        state === 'listening'
          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'border-neutral-200 bg-white text-neutral-500 hover:border-sage-200 hover:bg-sage-50 hover:text-sage-700',
        className,
      )}
      title={state === 'listening' ? 'Parar ditado nativo' : 'Ditado nativo por voz'}
      aria-label={state === 'listening' ? 'Parar ditado nativo' : 'Iniciar ditado nativo'}
    >
      {state === 'listening'
        ? <><MicOff className="h-3.5 w-3.5" /> Parar</>
        : <><Mic className="h-3.5 w-3.5" /> Ditar</>
      }
    </button>
  )
}
