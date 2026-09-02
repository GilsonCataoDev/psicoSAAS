import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useTerms } from '@/hooks/useTerms'

interface Props {
  currentPw: string
  setCurrentPw: (v: string) => void
  newPw: string
  setNewPw: (v: string) => void
  confirmPw: string
  setConfirmPw: (v: string) => void
  showPw: boolean
  setShowPw: (fn: (v: boolean) => boolean) => void
  savingPw: boolean
  changePassword: () => void
}

export function SecurityTab({
  currentPw, setCurrentPw, newPw, setNewPw, confirmPw, setConfirmPw,
  showPw, setShowPw, savingPw, changePassword,
}: Props) {
  const t = useTerms()
  return (
    <div className="card space-y-5">
      <h2 className="section-title">Alterar senha</h2>
      <div className="rounded-2xl border border-sage-100 bg-sage-50 px-4 py-3 text-sm text-sage-800">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Proteja o acesso ao {t.record}</p>
            <p className="mt-1 text-sage-700">
              Use uma senha única. Se suspeitar de acesso indevido, altere a senha e saia da conta nos dispositivos compartilhados.
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="label">Senha atual</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              className="input-field pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="label">Nova senha</label>
          <input type={showPw ? 'text' : 'password'} value={newPw}
            onChange={e => setNewPw(e.target.value)}
            className="input-field" placeholder="Mínimo 8 caracteres" />
        </div>
        <div>
          <label className="label">Confirmar nova senha</label>
          <input type={showPw ? 'text' : 'password'} value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            className="input-field" placeholder="Repita a nova senha" />
          {confirmPw && newPw !== confirmPw && (
            <p className="text-rose-500 text-xs mt-1">As senhas não coincidem.</p>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={changePassword} disabled={savingPw || !currentPw || !newPw || !confirmPw}
          className="btn-primary flex items-center gap-2">
          {savingPw && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Alterar senha
        </button>
      </div>

      <div className="border-t border-neutral-100 pt-5 space-y-3">
        <h3 className="text-sm font-medium text-neutral-700">Sessões ativas</h3>
        <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl text-sm">
          <div>
            <p className="font-medium text-neutral-700">Este dispositivo</p>
            <p className="text-xs text-neutral-400 mt-0.5">Sessão atual</p>
          </div>
          <span className="text-xs bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">Ativa</span>
        </div>
      </div>
    </div>
  )
}
