import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import {
  Bell, Lock, User, MessageSquare, Shield,
  ExternalLink, CheckCircle2, Zap, ArrowRight, X, Gift, Eye, EyeOff,
} from 'lucide-react'
import { isValidCrpFormat, getCrpRegion, openCfpVerification, formatCrpInput } from '@/lib/crp'
import { useSubscriptionStore, PLANS } from '@/store/subscription'
import ReferralCard from '@/components/features/referral/ReferralCard'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'profile',  icon: User,          label: 'Perfil'     },
  { id: 'plan',     icon: Zap,           label: 'Plano'      },
  { id: 'referral', icon: Gift,          label: 'Indicações' },
  { id: 'notify',   icon: Bell,          label: 'Lembretes'  },
  { id: 'messages', icon: MessageSquare, label: 'Mensagens'  },
  { id: 'privacy',  icon: Lock,          label: 'Privacidade'},
  { id: 'security', icon: Shield,        label: 'Segurança'  },
]
const TRIAL_DAYS = 7

// ─── Toggle component ──────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-sage-500' : 'bg-neutral-200'}`}
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
  chargeTemplate: 'Olá, {{nome}}! 🌿\n\nSegue o valor da nossa sessão:\n💚 *{{valor}}*\n\nPode pagar via PIX: `{{pix}}`\n\nObrigada! 🙏',
  // Asaas — link de pagamento
  asaasApiKey: '',
  // Mensagens
  whatsapp: '',
  confirmationTemplate: 'Olá, {{nome}}! 🌿 Sua sessão está confirmada para {{data}} às {{hora}}. Até lá! 💙',
  reminderTemplate: 'Olá, {{nome}}! Lembrando que temos sessão amanhã às {{hora}}. Qualquer dúvida, me avise! 🌿',
}

export default function SettingsPage() {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const [tab, setTab] = useState('profile')

  // ── Perfil ─────────────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? '')
  const [crp, setCrp]   = useState(user?.crp ?? '')
  const [specialty, setSpecialty] = useState(user?.specialty ?? '')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const crpValid  = isValidCrpFormat(crp)
  const crpRegion = getCrpRegion(crp)

  function handleCrpChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCrp(formatCrpInput(e.target.value))
  }

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const updated = await api.patch('/auth/profile', { name, crp, specialty, phone }).then(r => r.data)
      updateUser({ name: updated.name, crp: updated.crp, specialty: updated.specialty })
      toast.success('Perfil atualizado ✓')
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

  useEffect(() => {
    api.get('/auth/me').then(r => {
      const p = r.data?.preferences ?? {}
      setPrefs(prev => ({ ...prev, ...p }))
      setPhone(r.data?.phone ?? '')
    }).catch(() => {}).finally(() => setLoadingPrefs(false))
  }, [])

  function setPref<K extends keyof typeof DEFAULT_PREFS>(key: K, value: typeof DEFAULT_PREFS[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }))
  }

  async function savePrefs(section?: string) {
    setSavingPrefs(true)
    try {
      await api.patch('/auth/preferences', prefs)
      toast.success(section ? `${section} salvo ✓` : 'Preferências salvas ✓')
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
      toast.success('Senha alterada com sucesso 🔒')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao alterar senha.')
    } finally {
      setSavingPw(false)
    }
  }

  // ── Plano ──────────────────────────────────────────────────────────────────
  const { subscription, setSubscription } = useSubscriptionStore()
  const navigate = useNavigate()
  const [cancelingPlan, setCancelingPlan] = useState(false)
  const currentPlan  = PLANS.find(p => p.id === subscription.planId)
  const isTrialing   = subscription.status === 'trialing'
  const daysLeft     = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null

  async function cancelPlan() {
    const ok = window.confirm(
      'Cancelar sua assinatura? Voce nao sera cobrado novamente. Se houver periodo pago ativo, o acesso continua ate o fim dele.',
    )
    if (!ok) return

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
                      <Toggle on={!!prefs[item.key]} onChange={() => togglePref(item.key)} />
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
                <h2 className="section-title">WhatsApp</h2>
                <div>
                  <label className="label">Seu número de WhatsApp</label>
                  <input value={prefs.whatsapp} onChange={e => setPref('whatsapp', e.target.value)}
                    className="input-field" placeholder="5511999990000 (com DDI e DDD, sem espaços)" />
                  <p className="text-xs text-neutral-400 mt-1">Usado para enviar e receber mensagens automáticas.</p>
                </div>
              </div>

              <div className="card space-y-4">
                <h2 className="section-title">Modelo de confirmação</h2>
                <p className="text-xs text-neutral-400">
                  Variáveis: <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{data}}'}</code>{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{hora}}'}</code>
                </p>
                <textarea rows={3} className="input-field resize-none text-sm"
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
                  value={prefs.reminderTemplate}
                  onChange={e => setPref('reminderTemplate', e.target.value)} />
              </div>

              <div className="flex justify-end">
                <button onClick={() => savePrefs('Mensagens')} disabled={savingPrefs} className="btn-primary flex items-center gap-2">
                  {savingPrefs && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Salvar mensagens
                </button>
              </div>
            </div>
          )}

          {/* ── Pagamentos ────────────────────────────────────────────── */}
          {tab === 'payment' && (
            <div className="space-y-5">
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
                    className="input-field" placeholder="Sua chave PIX" />
                </div>
                <div>
                  <label className="label">Nome favorecido</label>
                  <input value={prefs.pixName} onChange={e => setPref('pixName', e.target.value)}
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
                    <Toggle on={!!prefs[item.key]} onChange={() => togglePref(item.key)} />
                  </div>
                ))}
              </div>

              {/* Asaas — pagamento via link */}
              <div className="card space-y-4">
                <div>
                  <h2 className="section-title mb-0.5">Pagamento por link (Asaas)</h2>
                  <p className="text-xs text-neutral-400">
                    Permite gerar links de cobrança que o paciente paga via{' '}
                    <strong>cartão de crédito, PIX ou boleto</strong>.{' '}
                    Precisa de uma conta gratuita em{' '}
                    <a href="https://www.asaas.com" target="_blank" rel="noreferrer"
                      className="text-sage-600 underline underline-offset-2 hover:no-underline">
                      asaas.com
                    </a>.
                  </p>
                </div>
                <div>
                  <label className="label">Chave API Asaas</label>
                  <input
                    type="password"
                    value={prefs.asaasApiKey ?? ''}
                    onChange={e => setPref('asaasApiKey', e.target.value)}
                    className="input-field"
                    placeholder="$aact_…"
                    autoComplete="off"
                  />
                  <p className="text-xs text-neutral-400 mt-1.5">
                    Encontre em: Asaas → Configurações → Integrações → Chave API
                  </p>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => savePrefs('Pagamentos')} disabled={savingPrefs}
                    className="btn-primary text-sm flex items-center gap-2">
                    {savingPrefs && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Salvar chave
                  </button>
                </div>
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
                  value={prefs.chargeTemplate}
                  onChange={e => setPref('chargeTemplate', e.target.value)} />
                <div className="flex justify-end">
                  <button onClick={() => savePrefs('Pagamentos')} disabled={savingPrefs} className="btn-primary text-sm flex items-center gap-2">
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
              {subscription.status === 'active' && (
                <div className="card border-rose-100">
                  <h2 className="section-title text-neutral-600">
                    {subscription.cancelAtPeriodEnd ? 'Cancelamento agendado' : 'Cancelamento'}
                  </h2>
                  {subscription.cancelAtPeriodEnd ? (
                    <p className="text-sm text-neutral-500 mt-1">
                      Sua assinatura nao sera renovada. O acesso continua ate{' '}
                      {subscription.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                        : 'o fim do periodo atual'}.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-neutral-500 mt-1">
                        Ao cancelar, voce continua com acesso ate o fim do periodo pago. Seus dados ficam seguros por 90 dias.
                      </p>
                      <button
                        className="mt-3 text-sm text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors disabled:opacity-60"
                        onClick={cancelPlan}
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

          {/* ── Indicações ────────────────────────────────────────────── */}
          {tab === 'referral' && (
            <div className="max-w-md">
              <ReferralCard />
            </div>
          )}

          {/* ── Privacidade ───────────────────────────────────────────── */}
          {tab === 'privacy' && (
            <div className="card space-y-4">
              <h2 className="section-title">Privacidade e LGPD</h2>
              <div className="space-y-3 text-sm text-neutral-600">
                {[
                  { icon: '🔒', text: 'Todas as anotações clínicas são criptografadas com AES-256.' },
                  { icon: '🗂️', text: 'Você é o único responsável pelos dados de suas pessoas — nunca os vendemos ou compartilhamos.' },
                  { icon: '📤', text: 'Você pode exportar ou deletar todos os seus dados a qualquer momento.' },
                  { icon: '🇧🇷', text: 'Operamos em conformidade total com a LGPD (Lei Geral de Proteção de Dados).' },
                ].map(item => (
                  <div key={item.text} className="flex gap-3 p-3 bg-neutral-50 rounded-xl">
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
              <button className="btn-secondary text-sm"
                onClick={() => toast('Exportação de dados em breve! Entre em contato pelo suporte.')}>
                Exportar meus dados
              </button>
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
    </div>
  )
}
