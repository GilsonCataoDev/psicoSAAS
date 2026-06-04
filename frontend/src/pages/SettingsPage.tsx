import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import {
  Bell, CalendarDays, Lock, User, MessageSquare, Shield,
  ExternalLink, CheckCircle2, Zap, ArrowRight, X, Eye, EyeOff, Wallet, Download, Trash2, Camera,
} from 'lucide-react'
import { isValidCrpFormat, getCrpRegion, openCfpVerification, formatCrpInput } from '@/lib/crp'
import { useSubscriptionStore, PLANS } from '@/store/subscription'
import toast from 'react-hot-toast'
import UseCogniaIcon from '@/components/ui/UseCogniaIcon'
import Avatar from '@/components/ui/Avatar'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const tabs = [
  { id: 'profile',  icon: User,          label: 'Perfil'     },
  { id: 'plan',     icon: Zap,           label: 'Plano'      },
  { id: 'notify',   icon: Bell,          label: 'Lembretes'  },
  { id: 'messages', icon: MessageSquare, label: 'Mensagens'  },
  { id: 'payment',  icon: Wallet,        label: 'Pagamentos' },
  { id: 'privacy',  icon: Lock,          label: 'Privacidade'},
  { id: 'security', icon: Shield,        label: 'Segurança'  },
]
const TRIAL_DAYS = 7
const GOOGLE_CALENDAR_ENABLED = false

// ─── Toggle component ──────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled = false }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${on ? 'bg-sage-500' : 'bg-neutral-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 mx-0.5 ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

// ─── Default preferences ───────────────────────────────────────────────────────
const DEFAULT_PREFS = {
  // Lembretes
  reminder24h: true,
  reminder2h: true,
  chargeAfterSession: false,
  bookingConfirmation: true,
  // Pagamentos
  pixKeyType: 'phone',
  pixKey: '',
  pixName: '',
  autoCharge: true,
  lateReminder: true,
  includeReceipt: false,
  chargeTemplate: 'Olá, {{nome}}! 🌿\n\nSegue o valor da nossa sessão:\n💚 *{{valor}}*\n\nPode pagar via PIX: `{{pix}}`\n\n{{comprovante}}\n\nObrigada! 🙏',
  googleCalendarConnected: false,
  googleCalendarEmail: '',
  // Mensagens
  whatsapp: '',
  confirmationTemplate: 'Olá, {{nome}}! 🌿 Sua sessão está confirmada para {{data}} às {{hora}}. Até lá! 💙',
  reminderTemplate: 'Olá, {{nome}}! Lembrando que temos sessão amanhã às {{hora}}. Qualquer dúvida, me avise! 🌿',
}

export default function SettingsPage() {
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const updateUser = useAuthStore(s => s.updateUser)
  const logout = useAuthStore(s => s.logout)
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(
    searchParams.get('tab') === 'integrations' && !GOOGLE_CALENDAR_ENABLED
      ? 'profile'
      : searchParams.get('tab') ?? 'profile',
  )

  // ── Perfil ─────────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? '')
  const [crp, setCrp]   = useState(user?.crp ?? '')
  const [specialty, setSpecialty] = useState(user?.specialty ?? '')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const crpValid  = isValidCrpFormat(crp)
  const crpRegion = getCrpRegion(crp)

  function handleCrpChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCrp(formatCrpInput(e.target.value))
  }

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const updated = await api.patch('/auth/profile', { name, crp, specialty, phone }).then(r => r.data)
      updateUser({ name: updated.name, crp: updated.crp, specialty: updated.specialty, phone: updated.phone, avatarUrl: updated.avatarUrl })
      toast.success('Perfil atualizado')
    } catch {
      toast.error('Erro ao salvar perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  // ── Preferências (notify + payment + messages) ─────────────────────────────
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS })
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [whatsappBusy, setWhatsappBusy] = useState(false)
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [whatsappConfigured, setWhatsappConfigured] = useState(true)
  const [whatsappQr, setWhatsappQr] = useState('')
  const [googleCalendarAvailable, setGoogleCalendarAvailable] = useState(true)
  const [confirmDisconnectGoogle, setConfirmDisconnectGoogle] = useState(false)
  const [googleLastSyncedAt, setGoogleLastSyncedAt] = useState<string | null>(null)
  const [googleLastSyncError, setGoogleLastSyncError] = useState<string | null>(null)

  useEffect(() => {
    const userPrefs = (user as any)?.preferences ?? {}
    setPrefs(prev => ({ ...prev, ...userPrefs }))
    setPhone(user?.phone ?? '')

    if (!isAuthenticated) {
      setLoadingPrefs(false)
      return
    }

    if (!GOOGLE_CALENDAR_ENABLED) {
      setLoadingPrefs(false)
      return
    }

    api.get('/google-calendar/status')
      .then((res) => {
        const data = res.data
        setGoogleCalendarAvailable(data.available !== false)
        setGoogleLastSyncedAt(data.lastSyncedAt ?? null)
        setGoogleLastSyncError(data.lastSyncError ?? null)
        setPrefs(prev => ({
          ...prev,
          googleCalendarConnected: !!data.connected,
          googleCalendarEmail: data.email ?? '',
        }))
      })
      .catch((err) => {
        if (err?.response?.status !== 401) {
          setGoogleCalendarAvailable(false)
        }
      })
      .finally(() => setLoadingPrefs(false))
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!isAuthenticated) {
      setGoogleCalendarAvailable(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated || tab !== 'messages') return
    const loadStatus = () => api.get('/notifications/whatsapp/status')
      .then(({ data }) => {
        setWhatsappConfigured(data.configured !== false)
        setWhatsappConnected(!!data.connected)
        if (data.connected) setWhatsappQr('')
      })
      .catch(() => setWhatsappConfigured(false))
    loadStatus()
    const timer = window.setInterval(loadStatus, 5000)
    return () => window.clearInterval(timer)
  }, [isAuthenticated, tab])

  useEffect(() => {
    if (searchParams.get('googleCalendar') === 'connected') {
      toast.success('Google Agenda conectado com sucesso!')
      setSearchParams({ tab: 'integrations' }, { replace: true })
    } else if (searchParams.get('googleCalendar') === 'error') {
      const reason = searchParams.get('reason')
      toast.error(reason === 'access_denied'
        ? 'Permissão negada. Autorize o acesso ao Google Agenda para continuar.'
        : 'Não foi possível concluir a conexão com o Google Agenda. Tente novamente.')
      setSearchParams({ tab: 'integrations' }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  function setPref<K extends keyof typeof DEFAULT_PREFS>(key: K, value: typeof DEFAULT_PREFS[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  async function uploadAvatar(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Envie uma foto em JPG.')
      return
    }
    if (file.size > 1024 * 1024) {
      toast.error('A foto deve ter no maximo 1 MB.')
      return
    }

    const form = new FormData()
    form.append('avatar', file)
    setUploadingAvatar(true)
    try {
      const updated = await api.post('/auth/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data)
      updateUser({ avatarUrl: updated.avatarUrl, avatar: updated.avatarUrl })
      toast.success('Foto atualizada')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Não foi possível enviar a foto.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  function buildPrefsPayload() {
    const {
      googleCalendarConnected: _googleCalendarConnected,
      googleCalendarEmail: _googleCalendarEmail,
      ...editablePrefs
    } = prefs
    return editablePrefs
  }

  async function savePrefs(section?: string) {
    setSavingPrefs(true)
    try {
      const saved = await api.patch('/auth/preferences', buildPrefsPayload()).then(r => r.data)
      setPrefs(prev => ({
        ...prev,
        ...saved,
      }))
      toast.success(section ? `${section} salvo` : 'Preferencias salvas')
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSavingPrefs(false)
    }
  }

  async function togglePref(key: keyof typeof DEFAULT_PREFS) {
    const newVal = !prefs[key]
    setPrefs(prev => ({ ...prev, [key]: newVal }))
    try {
      await api.patch('/auth/preferences', { [key]: newVal })
    } catch {
      setPrefs(prev => ({ ...prev, [key]: !newVal })) // rollback
      toast.error('Erro ao salvar.')
    }
  }

  // ── Segurança ──────────────────────────────────────────────────────────────
  async function connectGoogleCalendar() {
    setCalendarBusy(true)
    try {
      const { data } = await api.get('/google-calendar/connect')
      window.location.href = data.url
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Não foi possível iniciar a conexão com o Google.')
      setCalendarBusy(false)
    }
  }

  async function disconnectGoogleCalendar() {
    setConfirmDisconnectGoogle(false)
    setCalendarBusy(true)
    try {
      await api.delete('/google-calendar/disconnect')
      setPrefs(prev => ({ ...prev, googleCalendarConnected: false, googleCalendarEmail: '' }))
      toast.success('Google Agenda desconectado')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Não foi possível desconectar.')
    } finally {
      setCalendarBusy(false)
    }
  }

  async function connectWhatsApp() {
    setWhatsappBusy(true)
    try {
      const { data } = await api.post('/notifications/whatsapp/connect')
      setWhatsappQr(data.base64)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Nao foi possivel gerar o QR Code.')
    } finally {
      setWhatsappBusy(false)
    }
  }

  async function testWhatsApp() {
    setWhatsappBusy(true)
    try {
      await api.post('/notifications/whatsapp/test', { phone: prefs.whatsapp })
      setWhatsappConnected(true)
      setWhatsappQr('')
      toast.success('Mensagem teste enviada')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Mensagem teste nao enviada.')
    } finally {
      setWhatsappBusy(false)
    }
  }

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [savingPw, setSavingPw]   = useState(false)

  async function changePassword() {
    if (newPw !== confirmPw) { toast.error('As senhas não coincidem.'); return }
    if (newPw.length < 8)    { toast.error('A nova senha deve ter ao menos 8 caracteres.'); return }
    setSavingPw(true)
    try {
      await api.patch('/auth/password', { currentPassword: currentPw, newPassword: newPw })
      toast.success('Senha alterada com sucesso')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao alterar senha.')
    } finally {
      setSavingPw(false)
    }
  }

  // ── Plano ──────────────────────────────────────────────────────────────────
  const { subscription, setSubscription, resetSubscription } = useSubscriptionStore()
  const navigate = useNavigate()
  const [cancelingPlan, setCancelingPlan] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [confirmCancelPlan, setConfirmCancelPlan] = useState(false)
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false)
  const currentPlan  = PLANS.find(p => p.id === subscription.planId)
  const currentPlanId = String(subscription.planId ?? subscription.plan ?? '')
  const hasProAutomation = currentPlanId === 'pro'
  const hasCancelablePlan = subscription.status === 'active' || subscription.status === 'trialing'
  const isTrialing   = subscription.status === 'trialing'
  const daysLeft     = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null

  async function cancelPlan() {
    setConfirmCancelPlan(false)
    setCancelingPlan(true)
    try {
      const { data } = await api.post('/billing/cancel')
      setSubscription(data)
      toast.success(data.cancelAtPeriodEnd ? 'Plano cancelado. Acesso mantido ate o fim do periodo.' : 'Plano cancelado.')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao cancelar assinatura.')
    } finally {
      setCancelingPlan(false)
    }
  }


  async function exportData() {
    setExportingData(true)
    try {
      const response = await api.get('/data-export', { responseType: 'blob' })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `usecognia-dados-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Exportacao baixada.')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Não foi possível exportar os dados.')
    } finally {
      setExportingData(false)
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar.')
      return
    }
    if (deletePassword.length < 8) {
      toast.error('Informe sua senha atual.')
      return
    }

    setConfirmDeleteAccount(true)
  }

  async function confirmDeleteAccountNow() {
    setConfirmDeleteAccount(false)
    setDeletingAccount(true)
    try {
      await api.delete('/auth/account', {
        data: { password: deletePassword, confirmation: deleteConfirm },
      })
      logout()
      resetSubscription()
      toast.success('Conta excluida definitivamente.')
      navigate('/login', { replace: true })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Não foi possível excluir a conta.')
    } finally {
      setDeletingAccount(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-slide-up space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Ajustes</h1>
        <p className="page-subtitle">Personalize a plataforma ao seu jeito de trabalhar</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nav */}
        <nav className="lg:w-48 lg:shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-none lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-xl text-sm transition-all whitespace-nowrap ${
                  tab === id ? 'bg-sage-50 text-sage-700 font-medium' : 'text-neutral-500 hover:bg-neutral-100'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <div className="lg:hidden h-px bg-neutral-100 mt-2" />
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-5">

          {/* ── Perfil ───────────────────────────────────────────────── */}
          {tab === 'profile' && (
            <div className="card space-y-4">
              <h2 className="section-title">Seus dados</h2>
              <div className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={name || user?.name || 'Perfil'} src={user?.avatarUrl ?? user?.avatar} size="lg" />
                  <div>
                    <p className="text-sm font-medium text-neutral-800">Foto do perfil</p>
                    <p className="text-xs text-neutral-400">Use um arquivo JPG de ate 1 MB.</p>
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
                <div>
                  <label className="label">CRP</label>
                  <input value={crp} onChange={handleCrpChange} className="input-field"
                    placeholder="06/123456" maxLength={9} />
                  {crpValid && (
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
                </div>
                <div>
                  <label className="label">Especialidade</label>
                  <input value={specialty} onChange={e => setSpecialty(e.target.value)}
                    className="input-field" placeholder="Ex: Psicologia Clínica" />
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
            </div>
          )}

          {/* ── Lembretes ─────────────────────────────────────────────── */}
          {tab === 'notify' && (
            <div className="card space-y-5">
              <h2 className="section-title">Lembretes automáticos</h2>
              {!hasProAutomation && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium">Automacoes de WhatsApp ficam no plano Pro.</p>
                  <p className="mt-1">No Essencial, os botoes manuais de WhatsApp continuam liberados na agenda e nos agendamentos.</p>
                </div>
              )}
              {loadingPrefs ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-sage-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {([
                    { key: 'reminder24h',        label: 'Lembrete 24h antes da sessão',   desc: 'Mensagem enviada via WhatsApp no dia anterior' },
                    { key: 'reminder2h',         label: 'Lembrete 2h antes da sessão',    desc: 'Mensagem rápida no dia do atendimento' },
                    { key: 'bookingConfirmation',label: 'Confirmação de agendamento',      desc: 'Notifica quando um horário é reservado' },
                  ] as const).map(item => (
                    <div key={item.key} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle disabled={!hasProAutomation} on={!!prefs[item.key]} onChange={() => togglePref(item.key)} />
                    </div>
                  ))}
                  <p className="text-xs text-neutral-400 pt-1">
                    Os lembretes são enviados via WhatsApp. Configure seu número na aba <strong>Mensagens</strong>.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Mensagens ─────────────────────────────────────────────── */}
          {tab === 'messages' && (
            <div className="space-y-5">
              <div className="card space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="section-title mb-0">WhatsApp</h2>
                  <span className={`badge ${whatsappConnected ? 'bg-sage-50 text-sage-700' : 'bg-amber-50 text-amber-700'}`}>
                    {whatsappConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                {!hasProAutomation && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <p className="font-medium">Envio automatico sera recurso Pro.</p>
                    <p className="mt-1">Voce ainda pode usar o WhatsApp manual com mensagem pronta nos planos pagos.</p>
                  </div>
                )}
                <div>
                  <label className="label">Seu número de WhatsApp</label>
                  <input value={prefs.whatsapp} onChange={e => setPref('whatsapp', e.target.value)}
                    disabled={!hasProAutomation}
                    className="input-field" placeholder="5511999990000 (com DDI e DDD, sem espaços)" />
                  <p className="text-xs text-neutral-400 mt-1">Usado para enviar e receber mensagens automáticas.</p>
                </div>
                {hasProAutomation && !whatsappConnected && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-medium">
                      {whatsappConfigured ? 'Conecte o WhatsApp para ativar as automacoes' : 'Servidor de WhatsApp nao configurado'}
                    </p>
                    {whatsappQr && (
                      <div className="mt-3 rounded-xl bg-white p-3 w-fit">
                        <img src={whatsappQr} alt="QR Code para conectar WhatsApp" className="h-56 w-56" />
                      </div>
                    )}
                  </div>
                )}
                {hasProAutomation && whatsappConfigured && (
                  <div className="flex flex-wrap gap-2">
                    {!whatsappConnected && (
                      <button type="button" onClick={connectWhatsApp} disabled={whatsappBusy} className="btn-primary text-sm">
                        {whatsappQr ? 'Gerar novo QR Code' : 'Conectar WhatsApp'}
                      </button>
                    )}
                    <button type="button" onClick={testWhatsApp} disabled={whatsappBusy || !prefs.whatsapp} className="btn-secondary text-sm">
                      Enviar mensagem teste
                    </button>
                  </div>
                )}
              </div>

              <div className="card space-y-4">
                <h2 className="section-title">Modelo de confirmação</h2>
                <p className="text-xs text-neutral-400">
                  Variáveis: <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{data}}'}</code>{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{hora}}'}</code>
                </p>
                <textarea rows={3} className="input-field resize-none text-sm"
                  disabled={!hasProAutomation}
                  value={prefs.confirmationTemplate}
                  onChange={e => setPref('confirmationTemplate', e.target.value)} />
              </div>

              <div className="card space-y-4">
                <h2 className="section-title">Modelo de lembrete</h2>
                <p className="text-xs text-neutral-400">
                  Variáveis: <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{hora}}'}</code>
                </p>
                <textarea rows={3} className="input-field resize-none text-sm"
                  disabled={!hasProAutomation}
                  value={prefs.reminderTemplate}
                  onChange={e => setPref('reminderTemplate', e.target.value)} />
              </div>

              <div className="flex justify-end">
                <button onClick={() => savePrefs('Mensagens')} disabled={savingPrefs || !hasProAutomation} className="btn-primary flex items-center gap-2">
                  {savingPrefs && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Salvar mensagens
                </button>
              </div>
            </div>
          )}

          {/* ── Integrações ───────────────────────────────────────────── */}
          {GOOGLE_CALENDAR_ENABLED && tab === 'integrations' && (
            <div className="space-y-5">
              <div className="card space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sage-50 text-sage-600 flex items-center justify-center">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="section-title mb-0.5">Google Agenda</h2>
                      <p className="text-sm text-neutral-500">
                        Sessões criadas ou confirmadas na UseCognia são sincronizadas automaticamente com sua agenda Google.
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${prefs.googleCalendarConnected ? 'bg-sage-50 text-sage-700' : 'bg-neutral-100 text-neutral-500'}`}>
                    {prefs.googleCalendarConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                {prefs.googleCalendarConnected ? (
                  <div className="rounded-xl border border-sage-100 bg-sage-50 p-4 text-sm text-sage-700 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-sage-600 shrink-0" />
                      <p className="font-medium">{prefs.googleCalendarEmail || 'Google Agenda autorizado'}</p>
                    </div>
                    {googleLastSyncError ? (
                      <p className="text-xs text-rose-600 pl-6">
                        Última sincronização falhou: {googleLastSyncError}
                      </p>
                    ) : googleLastSyncedAt ? (
                      <p className="text-xs text-sage-500 pl-6">
                        Última sincronização: {new Date(googleLastSyncedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    ) : (
                      <p className="text-xs text-sage-500 pl-6">Nenhuma sessão sincronizada ainda</p>
                    )}
                  </div>
                ) : !googleCalendarAvailable ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-medium">Integração em configuração</p>
                    <p className="mt-1">
                      O Google Agenda ainda precisa das credenciais OAuth da plataforma antes de ser usado.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
                    <p className="font-medium text-neutral-700">Permissão necessária</p>
                    <p className="mt-1">
                      O Google solicitará acesso para criar eventos na sua agenda. A UseCognia não lê seus eventos pessoais.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {prefs.googleCalendarConnected ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnectGoogle(true)}
                      disabled={calendarBusy}
                      className="btn-secondary text-sm"
                    >
                      {calendarBusy ? 'Desconectando...' : 'Desconectar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={connectGoogleCalendar}
                      disabled={calendarBusy || !googleCalendarAvailable}
                      className="btn-primary text-sm inline-flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {!googleCalendarAvailable ? 'Aguardando configuração' : calendarBusy ? 'Abrindo Google...' : 'Conectar Google Agenda'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'payment' && (
            <div className="space-y-5">
              {!hasProAutomation && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-medium">Links, cartão e cobranças automáticas são recursos Pro.</p>
                  <p className="mt-1">No Essencial, o controle financeiro manual continua liberado.</p>
                </div>
              )}
              <div className="card space-y-4">
                <h2 className="section-title">Chave PIX</h2>
                <div>
                  <label className="label">Tipo de chave</label>
                  <select className="input-field" value={prefs.pixKeyType}
                    onChange={e => setPref('pixKeyType', e.target.value)}>
                    <option value="cpf">CPF</option>
                    <option value="phone">Telefone</option>
                    <option value="email">E-mail</option>
                    <option value="random">Chave aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="label">Chave PIX</label>
                  <input value={prefs.pixKey} onChange={e => setPref('pixKey', e.target.value)}
                    disabled={!hasProAutomation}
                    className="input-field" placeholder="Sua chave PIX" />
                </div>
                <div>
                  <label className="label">Nome favorecido</label>
                  <input value={prefs.pixName} onChange={e => setPref('pixName', e.target.value)}
                    disabled={!hasProAutomation}
                    className="input-field" placeholder="Como aparece na transferência PIX" />
                </div>
              </div>

              <div className="card space-y-4">
                <h2 className="section-title">Cobranças automáticas</h2>
                {([
                  { key: 'autoCharge',     label: 'Enviar cobrança após sessão',           desc: 'Mensagem automática com o valor e chave PIX' },
                  { key: 'lateReminder',   label: 'Lembrete de pagamento em atraso',        desc: 'Avisa após 3 dias sem pagamento' },
                  { key: 'includeReceipt', label: 'Incluir comprovante no registro',        desc: 'Solicita comprovante ao confirmar pagamento' },
                ] as const).map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle disabled={!hasProAutomation} on={!!prefs[item.key]} onChange={() => togglePref(item.key)} />
                  </div>
                ))}
              </div>

              <div className="card space-y-4">
                <h2 className="section-title">Modelo de mensagem de cobrança</h2>
                <p className="text-xs text-neutral-400">
                  Variáveis:{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{valor}}'}</code>{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{pix}}'}</code>
                </p>
                <textarea rows={4} className="input-field resize-none text-sm"
                  disabled={!hasProAutomation}
                  value={prefs.chargeTemplate}
                  onChange={e => setPref('chargeTemplate', e.target.value)} />
                <div className="flex justify-end">
                  <button onClick={() => savePrefs('Pagamentos')} disabled={savingPrefs || !hasProAutomation} className="btn-primary text-sm flex items-center gap-2">
                    {savingPrefs && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Salvar alterações
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Plano ─────────────────────────────────────────────────── */}
          {tab === 'plan' && (
            <div className="space-y-5">
              <div className={`card ${isTrialing ? 'border-sage-200 bg-gradient-to-br from-sage-50 to-white' : ''}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-800">
                        Plano {currentPlan?.name ?? 'Gratuito'}
                        {isTrialing && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">em teste</span>}
                        {subscription.status === 'active' && <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">ativo</span>}
                      </p>
                      {isTrialing && daysLeft !== null && (
                        <p className="text-sm text-neutral-500 mt-0.5">{daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''} no período grátis</p>
                      )}
                      {subscription.status === 'active' && subscription.currentPeriodEnd && (
                        <p className="text-sm text-neutral-500 mt-0.5">
                          {subscription.cancelAtPeriodEnd ? 'Acesso ate ' : 'Renova em '}
                          {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => navigate('/planos')} className="btn-primary text-sm flex items-center gap-1.5">
                    {isTrialing ? 'Assinar agora' : 'Trocar plano'} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isTrialing && daysLeft !== null && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                      <span>Período de teste</span><span>{daysLeft} dias restantes</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-sage-400 rounded-full transition-all"
                        style={{ width: `${Math.max(5, ((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="card space-y-3">
                <h2 className="section-title">O que está incluído</h2>
                <ul className="space-y-2">
                  {currentPlan?.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckCircle2 className="w-4 h-4 text-sage-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
              {hasCancelablePlan && (
                <div className="card border-rose-100">
                  <h2 className="section-title text-neutral-600">
                    {subscription.cancelAtPeriodEnd ? 'Cancelamento agendado' : 'Cancelamento'}
                  </h2>
                  {subscription.cancelAtPeriodEnd ? (
                    <p className="text-sm text-neutral-500 mt-1">
                      Sua assinatura não será renovada. O acesso continua até{' '}
                      {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                        : 'o fim do periodo atual'}.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-neutral-500 mt-1">
                        {currentPlanId === 'free'
                          ? 'Ao sair do plano grátis, você volta para a tela de planos. Seus dados ficam seguros.'
                          : isTrialing
                            ? 'Ao cancelar o teste, a assinatura será encerrada e você volta para a tela de planos.'
                            : 'Ao cancelar, você continua com acesso até o fim do período pago. Seus dados ficam seguros por 90 dias.'}
                      </p>
                      <button
                        className="mt-3 text-sm text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors disabled:opacity-60"
                        onClick={() => setConfirmCancelPlan(true)}
                        disabled={cancelingPlan}
                      >
                        <X className="w-3.5 h-3.5" />
                        {cancelingPlan ? 'Cancelando...' : 'Cancelar assinatura'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Privacidade ───────────────────────────────────────────── */}
          {tab === 'privacy' && (
            <div className="card space-y-4">
              <h2 className="section-title">Privacidade e LGPD</h2>
              <div className="space-y-3 text-sm text-neutral-600">
                {[
                  { icon: 'security-lgpd' as const, text: 'Todas as anotações clínicas são criptografadas com AES-256.' },
                  { icon: 'documents' as const, text: 'Voce e o unico responsavel pelos dados de seus pacientes; nunca os vendemos ou compartilhamos.' },
                  { icon: 'billing' as const, text: 'Voce pode exportar ou deletar todos os seus dados a qualquer momento.' },
                  { icon: 'success' as const, text: 'Adotamos praticas alinhadas a LGPD e mantemos controles para exportacao, exclusao, seguranca e transparencia.' },
                ].map(item => (
                  <div key={item.text} className="flex gap-3 p-3 bg-neutral-50 rounded-xl">
                    <UseCogniaIcon name={item.icon} size={24} />
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
              <button className="btn-secondary text-sm flex items-center gap-2 w-fit"
                disabled={exportingData}
                onClick={exportData}>
                <Download className="w-4 h-4" />
                {exportingData ? 'Exportando...' : 'Exportar meus dados'}
              </button>

              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-400/20 dark:bg-rose-500/10">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300">
                    <Trash2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-200">Excluir conta definitivamente</h3>
                      <p className="mt-1 text-sm text-rose-700 dark:text-rose-200/80">
                        Remove sua conta, pacientes, prontuários, sessões, agenda, financeiro, documentos, preferências,
                        tokens de acesso e assinaturas salvas no banco de dados. Esta ação não pode ser desfeita.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label text-rose-700 dark:text-rose-200">Senha atual</label>
                        <input
                          type="password"
                          value={deletePassword}
                          onChange={e => setDeletePassword(e.target.value)}
                          className="input-field"
                          placeholder="Confirme sua senha"
                        />
                      </div>
                      <div>
                        <label className="label text-rose-700 dark:text-rose-200">Digite EXCLUIR</label>
                        <input
                          value={deleteConfirm}
                          onChange={e => setDeleteConfirm(e.target.value)}
                          className="input-field"
                          placeholder="EXCLUIR"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={deleteAccount}
                      disabled={deletingAccount || deleteConfirm !== 'EXCLUIR' || deletePassword.length < 8}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingAccount ? 'Excluindo...' : 'Excluir minha conta'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Segurança ─────────────────────────────────────────────── */}
          {tab === 'security' && (
            <div className="card space-y-5">
              <h2 className="section-title">Alterar senha</h2>
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
          )}

        </div>
      </div>
      <ConfirmDialog
        open={confirmDisconnectGoogle}
        title="Desconectar Google Agenda"
        description="Novas sessões não serão sincronizadas com o Google Agenda após a desconexão."
        confirmLabel="Desconectar"
        loading={calendarBusy}
        tone="warning"
        onClose={() => setConfirmDisconnectGoogle(false)}
        onConfirm={disconnectGoogleCalendar}
      />
      <ConfirmDialog
        open={confirmCancelPlan}
        title={currentPlanId === 'free' ? 'Sair do plano grátis' : 'Cancelar assinatura'}
        description={currentPlanId === 'free'
          ? 'Seu acesso será bloqueado até escolher outro plano. Seus dados continuam protegidos.'
          : 'Você não será cobrado novamente. Se houver período pago ativo, o acesso continua até o fim dele.'}
        confirmLabel={currentPlanId === 'free' ? 'Sair do plano' : 'Cancelar assinatura'}
        loading={cancelingPlan}
        tone="warning"
        onClose={() => setConfirmCancelPlan(false)}
        onConfirm={cancelPlan}
      />
      <ConfirmDialog
        open={confirmDeleteAccount}
        title="Excluir conta definitivamente"
        description="Todos os pacientes, prontuários, sessões, agenda, financeiro, documentos, preferências e tokens de acesso serão removidos. Esta ação não pode ser desfeita."
        confirmLabel="Excluir definitivamente"
        loading={deletingAccount}
        onClose={() => setConfirmDeleteAccount(false)}
        onConfirm={confirmDeleteAccountNow}
      />
    </div>
  )
}
