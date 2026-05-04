import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { isValidCrpFormat, getCrpRegion, openCfpVerification, formatCrpInput } from '@/lib/crp'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  crp: z
    .string()
    .regex(/^\d{2}\/\d{4,6}$/, 'Formato inválido. Use: 00/000000'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de ao menos uma letra maiúscula')
    .regex(/[a-z]/, 'Precisa de ao menos uma letra minúscula')
    .regex(/\d/, 'Precisa de ao menos um número')
    .regex(/[@$!%*?&\-_#]/, 'Precisa de ao menos um símbolo (@$!%*?&-_#)'),
  crpConfirmed: z.boolean().refine((v) => v, 'Confirme que seu CRP está ativo'),
  terms: z.boolean().refine((v) => v, 'Você precisa aceitar os termos'),
})

type FormData = z.infer<typeof schema>

const TERMS_VERSION = '2026-05-02'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [crpValue, setCrpValue] = useState('')
  const [showTerms, setShowTerms] = useState(false)
  const setAuth      = useAuthStore((s) => s.setAuth)
  const setCsrfToken = useAuthStore((s) => s.setCsrfToken)
  const navigate = useNavigate()

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const crpValid = isValidCrpFormat(crpValue)
  const crpRegion = getCrpRegion(crpValue)

  function handleCrpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatCrpInput(e.target.value)
    setCrpValue(formatted)
    setValue('crp', formatted, { shouldValidate: formatted.length >= 7 })
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        crp: data.crp,
        termsAccepted: data.terms,
        termsVersion: TERMS_VERSION,
      })
      setAuth(res.data.user)
      if (res.data.csrfToken) setCsrfToken(res.data.csrfToken)
      toast.success('Conta criada com sucesso! Seja bem-vinda 🌱')
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      if (msg === 'E-mail já cadastrado') {
        toast.error('Este e-mail já está em uso. Tente fazer login.')
      } else {
        toast.error('Não foi possível criar a conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="font-display text-3xl font-light text-neutral-800 mb-1">
        Criar sua conta
      </h2>
      <p className="text-neutral-500 mb-6">É rápido, gratuito e sem burocracia</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Nome completo</label>
          <input {...register('name')} className="input-field" placeholder="Nome completo" />
          {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="label">E-mail</label>
          <input {...register('email')} type="email" className="input-field" placeholder="seu@email.com" />
          {errors.email && <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* ── CRP com validação em tempo real ────────────────────────── */}
        <div>
          <label className="label">CRP</label>
          <div className="relative">
            <input
              value={crpValue}
              onChange={handleCrpChange}
              className={`input-field pr-10 ${
                crpValue.length >= 7
                  ? crpValid
                    ? 'border-emerald-400 focus:ring-emerald-200'
                    : 'border-rose-400 focus:ring-rose-200'
                  : ''
              }`}
              placeholder="06/123456"
              maxLength={9}
            />
            {crpValue.length >= 7 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {crpValid
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <AlertCircle className="w-4 h-4 text-rose-400" />}
              </span>
            )}
          </div>

          {/* Feedback: região identificada */}
          {crpValid && crpRegion && (
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Conselho Regional — {crpRegion}
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

          {/* Erro de validação do schema */}
          {errors.crp && !crpValid && (
            <p className="text-rose-500 text-xs mt-1">{errors.crp.message}</p>
          )}

          {/* Dica de formato quando ainda incompleto */}
          {!crpValid && crpValue.length > 0 && crpValue.length < 7 && (
            <p className="text-neutral-400 text-xs mt-1">Formato: 00/000000 (região/número)</p>
          )}
        </div>

        <div>
          <label className="label">Senha</label>
          <input {...register('password')} type="password" className="input-field" placeholder="Mínimo 8 caracteres" />
          {errors.password && <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input
            {...register('crpConfirmed')}
            type="checkbox"
            id="crpConfirmed"
            className="mt-0.5 accent-sage-500"
          />
          <label htmlFor="crpConfirmed" className="text-sm text-neutral-500 cursor-pointer">
            Confirmo que meu CRP está <strong>ativo e regularizado</strong> junto ao CFP.{' '}
            <button type="button" onClick={openCfpVerification} className="text-sage-600 hover:underline inline">
              Verificar no site do CFP
            </button>
          </label>
        </div>
        {errors.crpConfirmed && <p className="text-rose-500 text-xs">{errors.crpConfirmed.message}</p>}

        <div className="flex items-start gap-2 pt-1">
          <input
            {...register('terms')}
            type="checkbox"
            id="terms"
            className="mt-0.5 accent-sage-500"
          />
          <label htmlFor="terms" className="text-sm text-neutral-500 cursor-pointer">
            Concordo com os{' '}
            <Link to="/termos" target="_blank" className="text-sage-600 hover:underline">Termos de Uso</Link>
            {' '}e{' '}
            <Link to="/privacidade" target="_blank" className="text-sage-600 hover:underline">Politica de Privacidade</Link>
          </label>
        </div>
        {errors.terms && <p className="text-rose-500 text-xs">{errors.terms.message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {loading ? 'Criando conta...' : 'Criar conta gratuita'}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500 mt-6">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-sage-600 hover:text-sage-700 font-medium">
          Entrar
        </Link>
      </p>

      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-neutral-800">Termos de Uso e Politica de Privacidade</h3>
                <p className="text-xs text-neutral-400">Versao {TERMS_VERSION}</p>
              </div>
              <button type="button" onClick={() => setShowTerms(false)} className="text-neutral-400 hover:text-neutral-700 text-sm">
                Fechar
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto max-h-[65vh] text-sm text-neutral-600 space-y-4 leading-relaxed">
              <p>
                O UseCognia e uma plataforma para gestao de agenda, pacientes, prontuario, documentos e financeiro por profissionais de psicologia.
                Ao criar a conta, voce declara que usara a plataforma de acordo com a LGPD, o Codigo de Etica Profissional e as normas aplicaveis do CFP.
              </p>
              <p>
                Tratamos dados de cadastro, dados de uso, dados financeiros e dados clinicos inseridos pelo profissional para executar o servico,
                manter seguranca, cumprir obrigacoes legais, prevenir abuso e melhorar a plataforma. Dados clinicos pertencem ao profissional/controlador
                e devem ser cadastrados apenas quando houver base legal adequada.
              </p>
              <p>
                Dados sensiveis do prontuario, sessoes e documentos sao protegidos com criptografia em repouso. Senhas sao armazenadas com hash,
                tokens de sessao sao protegidos e cookies de autenticacao usam configuracoes HttpOnly. Nenhuma medida elimina todos os riscos,
                por isso o usuario deve proteger sua senha e encerrar sessoes em dispositivos compartilhados.
              </p>
              <p>
                Podemos compartilhar dados estritamente necessarios com provedores de infraestrutura, e-mail, analytics com mascaramento e pagamento,
                como Railway, servicos de envio e Asaas, sempre para operar a plataforma. Dados financeiros enviados ao Asaas seguem as regras e
                politicas do proprio provedor de pagamento.
              </p>
              <p>
                O profissional e responsavel pela veracidade das informacoes, pelo consentimento/base legal dos pacientes, pela configuracao dos
                links publicos e pela guarda etica dos registros. O titular pode solicitar acesso, correcao ou exclusao quando aplicavel, observadas
                obrigacoes legais, regulatorias e de preservacao profissional.
              </p>
              <p>
                O servico pode ser suspenso em caso de uso indevido, risco de seguranca, inadimplencia ou violacao destes termos. Alteracoes relevantes
                destes termos serao versionadas e poderao exigir novo aceite.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
