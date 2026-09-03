import { Camera, CheckCircle2, ExternalLink, LogOut } from 'lucide-react'
import { type User } from '@/store/auth'
import Avatar from '@/components/ui/Avatar'
import { openCfpVerification } from '@/lib/crp'
import { DEFAULT_PROFESSION, PROFESSIONS, PROFESSION_LABELS, councilLabel, requiresCrp, type Profession } from '@/lib/professions'
import { termsFor } from '@/lib/terms'

interface Props {
  user: User | null
  name: string
  setName: (v: string) => void
  crp: string
  handleCrpChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  crpValid: boolean
  crpRegion: string | null
  profession: string
  setProfession: (v: string) => void
  specialty: string
  setSpecialty: (v: string) => void
  phone: string
  setPhone: (v: string) => void
  savingProfile: boolean
  uploadingAvatar: boolean
  saveProfile: () => void
  uploadAvatar: (file?: File) => void
  handleLogout: () => void
}

export function ProfileTab({
  user, name, setName, crp, handleCrpChange, crpValid, crpRegion,
  profession, setProfession, specialty, setSpecialty, phone, setPhone,
  savingProfile, uploadingAvatar, saveProfile, uploadAvatar, handleLogout,
}: Props) {
  const showCrp = requiresCrp(profession)
  const council = councilLabel(profession)
  // "Ex: Personal Trainer Clínica" nao existe — o exemplo precisa ser
  // gramatical em qualquer profissao da lista.
  const professionKey = (profession || DEFAULT_PROFESSION) as Profession
  const specialtyPlaceholder = professionKey === 'outro'
    ? 'Ex: sua área de atuação'
    : `Ex: área de atuação em ${PROFESSION_LABELS[professionKey]}`
  const t = termsFor(profession)
  return (
    <div className="card space-y-4">
      <h2 className="section-title">Seus dados</h2>
      <div className="rounded-2xl border border-sage-100 bg-sage-50 px-4 py-3 text-sm text-sage-800">
        <p className="font-medium">Dados exibidos ao {t.patient}</p>
        <p className="mt-1 text-sage-700">
          Nome, {council}, especialidade, telefone e foto podem aparecer no link público de agendamento e em mensagens operacionais.
        </p>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={name || user?.name || 'Perfil'} src={user?.avatarUrl ?? user?.avatar} size="lg" />
          <div>
            <p className="text-sm font-medium text-neutral-800">Foto do perfil</p>
            <p className="text-xs text-neutral-400">Aparece no seu link publico de agendamento. Use JPG de ate 1 MB.</p>
          </div>
        </div>
        <label className="btn-secondary inline-flex w-fit cursor-pointer items-center gap-2 text-sm">
          <Camera className="h-4 w-4" />
          {uploadingAvatar ? 'Enviando...' : 'Escolher JPG'}
          <input
            type="file"
            accept="image/jpeg,.jpg,.jpeg"
            className="hidden"
            disabled={uploadingAvatar}
            onChange={event => {
              uploadAvatar(event.target.files?.[0])
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-1 sm:col-span-2">
          <label className="label">Nome completo</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-field" />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="label">Profissão</label>
          <select value={profession} onChange={e => setProfession(e.target.value)} className="input-field">
            {PROFESSIONS.map(p => (
              <option key={p} value={p}>{PROFESSION_LABELS[p as Profession]}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-400">
            Define os termos usados no sistema e quais recursos aparecem para você.
          </p>
        </div>
        {/* Todo conselho tem registro; so o rotulo, o formato e a verificacao
            publica mudam. Esconder o campo deixava as demais profissoes sem
            como informar CRN/CREFITO/CRO no link publico de agendamento. */}
        <div>
          <label className="label">{council}</label>
          <input value={crp} onChange={handleCrpChange} className="input-field"
            placeholder={showCrp ? '06/123456' : 'Ex: CRN-3 12345'}
            maxLength={showCrp ? 9 : 30} />
          {showCrp && crpValid && (
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />{crpRegion ?? 'CRP válido'}
              </p>
              <button type="button" onClick={openCfpVerification}
                className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-1 hover:underline">
                Verificar no CFP <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
          {showCrp && crp && !crpValid && (
            <p className="mt-1.5 text-xs text-rose-500">Revise o formato do CRP antes de salvar.</p>
          )}
        </div>
        <div>
          <label className="label">Especialidade</label>
          <input value={specialty} onChange={e => setSpecialty(e.target.value)}
            className="input-field" placeholder={specialtyPlaceholder} />
        </div>
        <div>
          <label className="label">Telefone / WhatsApp</label>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            className="input-field" placeholder="(11) 99999-9999" />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input defaultValue={user?.email} className="input-field bg-neutral-50" readOnly />
          <p className="text-xs text-neutral-400 mt-1">O e-mail não pode ser alterado.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={saveProfile} disabled={savingProfile} className="btn-primary flex items-center gap-2">
          {savingProfile && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Salvar alterações
        </button>
      </div>
      <div className="border-t border-neutral-100 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="btn-secondary inline-flex items-center gap-2 text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
    </div>
  )
}
