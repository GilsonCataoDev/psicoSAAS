import { Outlet } from 'react-router-dom'
import { Heart } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sage-500 to-sage-700 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-white font-display text-2xl font-medium">PsicoSaaS</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-white font-display text-4xl font-light leading-snug">
            Cuide de quem cuida das pessoas.
          </h1>
          <p className="text-sage-100 text-lg leading-relaxed">
            Uma plataforma feita com respeito ao seu trabalho e ao vínculo terapêutico que você constrói.
          </p>

          <div className="flex flex-col gap-4 pt-4">
            {[
              { icon: '🔒', text: 'Segurança e privacidade total (LGPD)' },
              { icon: '✨', text: 'Interface acolhedora e sem burocracia' },
              { icon: '🤝', text: 'Desenvolvido junto a psicólogos' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-sage-100">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sage-200 text-sm">
          © {new Date().getFullYear()} PsicoSaaS — Feito com cuidado no Brasil
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-sage-500 rounded-xl flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-display text-xl font-medium text-neutral-800">PsicoSaaS</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
