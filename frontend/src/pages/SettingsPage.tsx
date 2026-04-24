import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Bell, Lock, CreditCard, User, MessageSquare, Shield, ExternalLink, CheckCircle2, Zap, ArrowRight, X, Gift } from 'lucide-react'
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
  { id: 'payment',  icon: CreditCard,    label: 'Pagamentos' },
  { id: 'privacy',  icon: Lock,          label: 'Privacidade'},
  { id: 'security', icon: Shield,        label: 'Segurança'  },
]

export default function SettingsPage() {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const [name, setName] = useState(user?.name ?? '')
  const [crp, setCrp] = useState(user?.crp ?? '')
  const [specialty, setSpecialty] = useState(user?.specialty ?? '')

  const crpValid = isValidCrpFormat(crp)
  const crpRegion = getCrpRegion(crp)

  function handleCrpChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCrp(formatCrpInput(e.target.value))
  }
  const [tab, setTab] = useState('profile')
  const { subscription } = useSubscriptionStore()
  const navigate = useNavigate()

  const currentPlan = PLANS.find(p => p.id === subscription.planId)
  const isTrialing = subscription.status === 'trialing'
  const daysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null

  function saveProfile() {
    updateUser({ name, crp, specialty })
    toast.success('Perfil atualizado ✓')
  }

  return (
    <div className="animate-slide-up space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Ajustes</h1>
        <p className="page-subtitle">Personalize a plataforma ao seu jeito de trabalhar</p>
      </div>

      {/* Mobile: tabs em scroll horizontal / Desktop: sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Nav — horizontal scroll no mobile, sidebar no desktop */}
        <nav className="lg:w-48 lg:shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
            {tabs.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-none lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-xl text-sm transition-all whitespace-nowrap ${
                  tab === id
                    ? 'bg-sage-50 text-sage-700 font-medium'
                    : 'text-neutral-500 hover:bg-neutral-100'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
          {/* Separador visual no mobile */}
          <div className="lg:hidden h-px bg-neutral-100 mt-2" />
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-5">
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
                  <input
                    value={crp}
                    onChange={handleCrpChange}
                    className="input-field"
                    placeholder="06/123456"
                    maxLength={9}
                  />
                  {crpValid && (
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {crpRegion ?? 'CRP válido'}
                      </p>
                      <button
                        type="button"
                        onClick={openCfpVerification}
                        className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-1 hover:underline"
                      >
                        Verificar no CFP
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label">Especialidade</label>
                  <input value={specialty} onChange={e => setSpecialty(e.target.value)}
                    className="input-field" placeholder="Ex: Psicologia Clínica" />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="label">E-mail</label>
                  <input defaultValue={user?.email} className="input-field" readOnly />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={saveProfile} className="btn-primary">Salvar alterações</button>
              </div>
            </div>
          )}

          {tab === 'notify' && (
            <div className="card space-y-5">
              <h2 className="section-title">Lembretes automáticos</h2>
              {[
                { label: 'Lembrete 24h antes da sessão', desc: 'Mensagem enviada via WhatsApp no dia anterior', on: true },
                { label: 'Lembrete 2h antes da sessão', desc: 'Mensagem rápida no dia do atendimento', on: true },
                { label: 'Cobrança automática após sessão', desc: 'Envia o valor e dados de pagamento', on: false },
                { label: 'Confirmação de agendamento', desc: 'Notifica quando um horário é reservado', on: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full cursor-pointer transition-colors shrink-0 ${item.on ? 'bg-sage-500' : 'bg-neutral-200'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 mx-0.5 ${item.on ? 'translate-x-5' : ''}`} />
                  </div>
                </div>
              ))}
            </div>
          )}

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
              <button className="btn-secondary text-sm">Exportar meus dados</button>
            </div>
          )}

          {tab === 'payment' && (
            <div className="space-y-5">
              <div className="card space-y-4">
                <h2 className="section-title">Chave PIX</h2>
                <div>
                  <label className="label">Tipo de chave</label>
                  <select className="input-field">
                    <option value="cpf">CPF</option>
                    <option value="phone">Telefone</option>
                    <option value="email">E-mail</option>
                    <option value="random">Chave aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="label">Chave PIX</label>
                  <input defaultValue="11999990000" className="input-field"
                    placeholder="Sua chave PIX para receber pagamentos" />
                </div>
                <div>
                  <label className="label">Nome favorecido (como aparece no PIX)</label>
                  <input defaultValue="Dra. Camila Moura" className="input-field" />
                </div>
              </div>

              <div className="card space-y-4">
                <h2 className="section-title">Cobranças automáticas</h2>
                {[
                  { label: 'Enviar cobrança após sessão', desc: 'Mensagem automática com o valor e chave PIX', on: true },
                  { label: 'Lembrete de pagamento em atraso', desc: 'Avisa após 3 dias sem pagamento', on: true },
                  { label: 'Incluir comprovante no registro', desc: 'Solicita comprovante ao confirmar pagamento', on: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-2 border-b border-neutral-50 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full cursor-pointer transition-colors shrink-0 ${item.on ? 'bg-sage-500' : 'bg-neutral-200'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 mx-0.5 ${item.on ? 'translate-x-5' : ''}`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="card space-y-4">
                <h2 className="section-title">Modelo de mensagem de cobrança</h2>
                <p className="text-xs text-neutral-400">
                  Use <code className="bg-neutral-100 px-1 rounded">{'{{nome}}'}</code>,{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{valor}}'}</code> e{' '}
                  <code className="bg-neutral-100 px-1 rounded">{'{{pix}}'}</code> como variáveis.
                </p>
                <textarea rows={4} className="input-field resize-none text-sm"
                  defaultValue={`Olá, {{nome}}! 🌿\n\nSegue o valor da nossa sessão:\n💚 *{{valor}}*\n\nPode pagar via PIX: \`{{pix}}\`\n\nObrigada! 🙏`} />
                <div className="flex justify-end">
                  <button className="btn-primary text-sm" onClick={() => {}}>
                    Salvar alterações
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'plan' && (
            <div className="space-y-5">
              {/* Card do plano atual */}
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
                        <p className="text-sm text-neutral-500 mt-0.5">
                          {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''} no período grátis
                        </p>
                      )}
                      {subscription.status === 'active' && subscription.currentPeriodEnd && (
                        <p className="text-sm text-neutral-500 mt-0.5">
                          Renova em {new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/planos')}
                    className="btn-primary text-sm flex items-center gap-1.5"
                  >
                    {isTrialing ? 'Assinar agora' : 'Trocar plano'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isTrialing && daysLeft !== null && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                      <span>Período de teste</span>
                      <span>{daysLeft} dias restantes</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sage-400 rounded-full transition-all"
                        style={{ width: `${Math.max(5, ((14 - daysLeft) / 14) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Funcionalidades do plano */}
              <div className="card space-y-3">
                <h2 className="section-title">O que está incluído</h2>
                <ul className="space-y-2">
                  {currentPlan?.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-neutral-600">
                      <CheckCircle2 className="w-4 h-4 text-sage-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cancelamento */}
              {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                <div className="card border-rose-100">
                  <h2 className="section-title text-neutral-600">Cancelamento</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    Ao cancelar, você continua com acesso até o fim do período pago. Seus dados ficam seguros por 90 dias.
                  </p>
                  <button
                    className="mt-3 text-sm text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                    onClick={() => toast('Entre em contato pelo suporte para cancelar a assinatura.')}
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar assinatura
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'referral' && (
            <div className="max-w-md">
              <ReferralCard />
            </div>
          )}

          {(tab === 'messages' || tab === 'security') && (
            <div className="card text-center py-12">
              <p className="text-neutral-400 text-sm">Esta seção estará disponível em breve 🌱</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
