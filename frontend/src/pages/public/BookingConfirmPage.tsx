import { useParams } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import BrandLogo from '@/components/ui/BrandLogo'

export default function BookingConfirmPage() {
  const { action } = useParams<{ token: string; action: 'confirmar' | 'cancelar' }>()
  const isConfirm = action === 'confirmar'

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white flex flex-col items-center justify-center p-6">
      <div className="mb-8">
        <BrandLogo compact className="w-12 h-12" />
      </div>

      <div className="bg-white rounded-3xl shadow-lifted p-10 max-w-md w-full text-center animate-slide-up">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${isConfirm ? 'bg-sage-100' : 'bg-mist-100'}`}>
          {isConfirm
            ? <Check className="w-8 h-8 text-sage-600" />
            : <X className="w-8 h-8 text-mist-600" />
          }
        </div>

        <h1 className="font-display text-2xl font-semibold text-neutral-800 mb-2">
          {isConfirm ? 'Sessao confirmada' : 'Sessao cancelada'}
        </h1>
        <p className="text-neutral-500 leading-relaxed">
          {isConfirm
            ? 'Sua sessao esta confirmada. Voce recebera um lembrete antes do encontro.'
            : 'Sua sessao foi cancelada. Quando quiser remarcar, use o link de agendamento novamente.'
          }
        </p>
      </div>

      <p className="text-xs text-neutral-400 mt-8">UseCognia · Agendamento seguro</p>
    </div>
  )
}
