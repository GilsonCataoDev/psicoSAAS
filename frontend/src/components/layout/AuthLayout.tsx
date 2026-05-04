import { Outlet } from 'react-router-dom'
import { BrainCircuit, ShieldCheck, Sparkles } from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex cognia-surface">
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col justify-between p-12">
        <BrandLogo light />

        <div className="space-y-6">
          <h1 className="text-white font-display text-5xl font-bold leading-tight tracking-tight">
            Gestao inteligente para profissionais da mente.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed max-w-lg">
            Tecnologia, organizacao e cuidado em uma experiencia premium para consultorios de saude mental.
          </p>

          <div className="flex flex-col gap-4 pt-4">
            {[
              { icon: ShieldCheck, text: 'Privacidade e controles alinhados a LGPD' },
              { icon: Sparkles, text: 'Fluxos simples para agenda, pacientes e financeiro' },
              { icon: BrainCircuit, text: 'Marca preparada para automacoes inteligentes' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-white/12 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-white" />
                </span>
                <span className="text-white/80">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/60 text-sm">
          © {new Date().getFullYear()} UseCognia
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden mb-8">
            <BrandLogo />
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-card backdrop-blur-xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
