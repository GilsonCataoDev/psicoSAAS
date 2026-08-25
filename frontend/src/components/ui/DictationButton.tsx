import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { accumulateFinalTranscript } from './voice-capture'

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
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionEvent = {
  resultIndex: number
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

const FREE_VOICE_FALLBACK = 'Ditado do navegador indisponível. Alternativa sem custo: clique no campo e use Windows + H no PC ou o microfone do teclado no celular.'

export default function DictationButton({ value, onChange, className }: DictationButtonProps) {
  const [state, setState] = useState<'idle' | 'listening'>('idle')
  const [browserVoiceUnavailable, setBrowserVoiceUnavailable] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => () => {
    const recognition = recognitionRef.current
    if (!recognition) return
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    recognition.stop()
    recognitionRef.current = null
  }, [])

  function getRecognition() {
    const win = window as SpeechRecognitionWindow
    return win.SpeechRecognition ?? win.webkitSpeechRecognition
  }

  function startDictation() {
    if (browserVoiceUnavailable) {
      toast(FREE_VOICE_FALLBACK, { duration: 8000 })
      return
    }

    const Recognition = getRecognition()
    if (!Recognition) {
      setBrowserVoiceUnavailable(true)
      toast.error(FREE_VOICE_FALLBACK, { duration: 8000 })
      return
    }

    try {
      const recognition = new Recognition()
      recognition.lang = 'pt-BR'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = event => {
        let finalText = ''
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index]
          if (result.isFinal) finalText += result[0].transcript
        }
        if (finalText.trim()) onChange(accumulateFinalTranscript(valueRef, finalText))
      }
      recognition.onerror = (e) => {
        setState('idle')
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          toast.error('Permissão do microfone negada. Habilite nas configurações do navegador.')
        } else if (e?.error === 'audio-capture') {
          toast.error('Nenhum microfone disponível. Conecte ou habilite um microfone e tente novamente.')
        } else if (e?.error === 'network') {
          setBrowserVoiceUnavailable(true)
          toast.error(FREE_VOICE_FALLBACK, { duration: 8000 })
        } else {
          toast.error('Não foi possível usar o ditado. Verifique a permissão do microfone.')
        }
      }
      recognition.onend = () => {
        if (recognitionRef.current === recognition) recognitionRef.current = null
        setState('idle')
      }
      recognitionRef.current = recognition
      recognition.start()
      setState('listening')
    } catch {
      recognitionRef.current = null
      setState('idle')
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
