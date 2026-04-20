import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { Bell, Lock, CreditCard, User, MessageSquare, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const [name, setName] = useState(user?.name ?? '')
  const [crp, setCrp] = useState(user?.crp ?? '')
  const [specialty, setSpecialty] = useState(user?.specialty ?? '')
  const [tab, setTab] = useState('profile')

  function saveProfile() {
    updateUser({ name, crp, specialty })
    toast.success('Perfil atualizado ✓')
  }

  const tabs = [
    { id: 'profile',  icon: User,          label: 'Perfil'     },
    { id: 'notify',   icon: Bell,          label: 'Lembretes'  },
    { id: 'messages', icon: MessageSquare, label: 'Mensagens'  },
    { id: 'payment',  icon: CreditCard,    label: 'Pagamentos' },
    { id: 'privacy',  icon: Lock,          label: 'Privacidade'},
    { id: 'security', icon: Shield,        label: 'Segurança'  },
  ]

  return (
    <div className="animate-slide-up space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Ajustes</h1>
        <p className="page-subtitle">Personalize a plataforma ao seu jeito de trabalhar</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <aside className="w-48 shrink-0 space-y-0.5">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${tab === id ? 'bg-sage-50 text-sage-700 font-medium' : 'text-neutral-500 hover:bg-neutral-100'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {tab === 'profile' && (
            <div className="card space-y-4">
              <h2 className="section-title">Seus dados</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nome completo</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">CRP</label>
                  <input value={crp} onChange={e => setCrp(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">Especialidade</label>
                  <input value={specialty} onChange={e => setSpecialty(e.target.value)} className="input-field" placeholder="Ex: Psicologia Clínica" />
                </div>
                <div>
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
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{item.desc}</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${item.on ? 'bg-sage-500' : 'bg-neutral-200'}`}>
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

          {(tab === 'messages' || tab === 'payment' || tab === 'security') && (
            <div className="card text-center py-12">
              <p className="text-neutral-400 text-sm">Esta seção estará disponível em breve 🌱</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
