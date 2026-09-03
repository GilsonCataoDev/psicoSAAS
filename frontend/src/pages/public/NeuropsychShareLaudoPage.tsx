import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BrainCircuit, Download, Loader2, ShieldAlert } from 'lucide-react'
import { api, AuthAxiosRequestConfig } from '@/lib/api'

export default function NeuropsychShareLaudoPage() {
  const { token = '' } = useParams()
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  async function download() {
    setState('loading')
    try {
      const res = await api.get(`/public/neuropsych-assessments/${token}/export`, {
        responseType: 'blob',
        skipAuthRedirect: true,
      } as AuthAxiosRequestConfig)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      const cd = res.headers['content-disposition'] as string | undefined
      const match = cd?.match(/filename="([^"]+)"/)
      a.href = url
      a.download = match?.[1] ?? 'Laudo.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 dark:bg-cognia-bg">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-100 bg-white p-6 text-center shadow-card dark:border-white/10 dark:bg-cognia-panel">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-50 dark:bg-sage-950/40">
          <BrainCircuit className="h-6 w-6 text-sage-600" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">Laudo de Avaliação Neuropsicológica</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Documento compartilhado de forma segura pelo profissional responsável.</p>

        {state === 'error' ? (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-left text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Este link é inválido ou expirou. Solicite um novo link ao profissional responsável.</span>
          </div>
        ) : (
          <button onClick={download} disabled={state === 'loading'} className="btn-primary mt-5 flex w-full items-center justify-center gap-2">
            {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {state === 'loading' ? 'Baixando...' : 'Baixar laudo em PDF'}
          </button>
        )}
      </div>
    </div>
  )
}
