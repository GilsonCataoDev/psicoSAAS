import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

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

export default function DictationButton({ value, onChange, className }: DictationButtonProps) {
  const recognitionRef = useRef<any>(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result: any) => result[0]?.transcript ?? '')
        .join(' ')
      const next = appendTranscript(valueRef.current, transcript)
      valueRef.current = next
      onChangeRef.current(next)
    }
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast.error('Permita o uso do microfone no navegador para usar o ditado.')
      } else {
        toast.error('Não foi possível usar o ditado agora.')
      }
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition

    return () => recognition.stop()
  }, [])

  function toggleDictation() {
    if (!supported || !recognitionRef.current) {
      toast.error('Este navegador não oferece ditado por voz.')
      return
    }

    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
      return
    }

    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleDictation}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
        listening
          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
          : 'border-neutral-200 bg-white text-neutral-500 hover:border-sage-200 hover:bg-sage-50 hover:text-sage-700',
        className,
      )}
      title={listening ? 'Parar ditado' : 'Ditado por voz'}
    >
      {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      {listening ? 'Parar' : 'Ditar'}
    </button>
  )
}
