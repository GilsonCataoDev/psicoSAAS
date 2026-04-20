import { useParams } from 'react-router-dom'
import { Check, X, Heart } from 'lucide-react'

export default function BookingConfirmPage() {
  const { token, action } = useParams<{ token: string; action: 'confirmar' | 'cancelar' }>()
  const isConfirm = action === 'confirmar'

  // Em produção: chamar GET /api/public/booking/confirm/:token ou /cancel/:token
  // e exibir o resultado da resposta

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-10 h-10 bg-sage-500 rounded-2xl flex items-center justify-center mb-8">
        <Heart className="w-5 h-5 text-white" fill="white" />
      </div>

      <div className="bg-white rounded-3xl shadow-lifted p-10 max-w-md w-full text-center animate-slide-up">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${isConfirm ? 'bg-sage-100' : 'bg-rose-100'}`}>
          {isConfirm
            ? <Check className="w-8 h-8 text-sage-600" />
            : <X className="w-8 h-8 text-rose-500" />
          }
        </div>

        <h1 className="font-display text-2xl font-light text-neutral-800 mb-2">
          {isConfirm ? 'Sessão confirmada! 🎉' : 'Sessão cancelada'}
        </h1>
        <p className="text-neutral-500 leading-relaxed">
          {isConfirm
            ? 'Ótimo! Sua sessão está confirmada. Você receberá um lembrete antes do encontro. Nos vemos lá! 💙'
            : 'Sua sessão foi cancelada. Esperamos te ver em breve quando estiver pronto(a). Cuide-se! 🌿'
          }
        </p>
      </div>

      <p className="text-xs text-neutral-400 mt-8">PsicoSaaS · Agendamento seguro 🔒</p>
    </div>
  )
}
