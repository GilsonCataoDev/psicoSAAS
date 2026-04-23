import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Bell, Lock, CreditCard, User, MessageSquare, Shield, ExternalLink, CheckCircle2 } from 'lucide-react'
import { isValidCrpFormat, getCrpRegion, openCfpVerification, formatCrpInput } from '@/lib/crp'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'profile',  icon: User,          label: 'Perfil'     },
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
