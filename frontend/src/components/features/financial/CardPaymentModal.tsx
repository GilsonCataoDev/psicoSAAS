import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CreditCard, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { FinancialRecord } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { useChargeCard } from '@/hooks/useApi'
import toast from 'react-hot-toast'

// ── Validação ──────────────────────────────────────────────────────────────────

const schema = z.object({
  // Dados do cartão
  holderName: z.string().min(3, 'Nome do titular obrigatório'),
  number:     z.string()
    .transform(v => v.replace(/\s/g, ''))
    .refine(v => /^\d{13,19}$/.test(v), 'Número do cartão inválido'),
  expiry:     z.string()
    .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Validade inválida — use MM/AAAA'),
  ccv:        z.string()
    .regex(/^\d{3,4}$/, 'CVV inválido (3 ou 4 dígitos)'),

  // Dados do titular (obrigatórios pelo Asaas para antifraude)
  email:             z.string().email('E-mail inválido'),
  cpfCnpj:           z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length === 11 || v.length === 14, 'CPF (11 dígitos) ou CNPJ (14 dígitos)'),
  postalCode:        z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length === 8, 'CEP deve ter 8 dígitos'),
  addressNumber:     z.string().min(1, 'Número do endereço obrigatório'),
  addressComplement: z.string().optional(),
  phone:             z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length >= 10 && v.length <= 11, 'Telefone inválido (10 ou 11 dígitos)'),
})

type FormValues = z.infer<typeof schema>

// ── Helpers de máscara ─────────────────────────────────────────────────────────

function maskCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function maskExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 6)
  if (d.length <= 2) return d
  return `${d.slice(0, 2)}/${d.slice(2)}`
}

function maskCpf(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
}

function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8)
}

function maskPhone(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
}

// ── Componente ─────────────────────────────────────────────────────────────────

interface Props {
  record: FinancialRecord | null
  open: boolean
  onClose: () => void
}

export default function CardPaymentModal({ record, open, onClose }: Props) {
  const charge = useChargeCard()
  const [done, setDone] = useState(false)

  const patient = record?.patient as any

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  // Resetar form sempre que o record mudar (evita dados do paciente anterior)
  useEffect(() => {
    if (record) {
      reset({
        holderName:    patient?.name?.toUpperCase() ?? '',
        number:        '',
        expiry:        '',
        ccv:           '',
        email:         patient?.email ?? '',
        cpfCnpj:       patient?.cpfCnpj ?? '',
        postalCode:    '',
        addressNumber: '',
        phone:         patient?.phone?.replace(/\D/g, '') ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id])

  function handleClose() {
    reset()
    setDone(false)
    charge.reset()
    onClose()
  }

  async function onSubmit(values: FormValues) {
    if (!record) return

    // Separa mês e ano da validade (ex: "04/2027" → expiryMonth="04", expiryYear="2027")
    const [expiryMonth, expiryYear] = values.expiry.split('/')

    try {
      await charge.mutateAsync({
        id: record.id,
        creditCard: {
          holderName:  values.holderName,
          number:      values.number.replace(/\s/g, ''),
          expiryMonth,          // "04"
          expiryYear,           // "2027"
          ccv:         values.ccv,
        },
        creditCardHolderInfo: {
          name:              values.holderName,
          email:             values.email,
          cpfCnpj:           values.cpfCnpj.replace(/\D/g, ''),
          postalCode:        values.postalCode.replace(/\D/g, ''),
          addressNumber:     values.addressNumber,
          addressComplement: values.addressComplement || null,
          phone:             values.phone.replace(/\D/g, ''),
          mobilePhone:       null,
        },
      })
      setDone(true)
      toast.success('Cobrança realizada com sucesso! 💳')
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao cobrar por cartão'
      toast.error(msg)
    }
  }

  if (!record) return null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cobrar por cartão"
      description={`${formatCurrency(record.amount)} · ${record.patient?.name ?? record.description}`}
      size="md"
    >
      {done ? (
        // ── Sucesso ──────────────────────────────────────────────────────────
        <div className="py-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-sage-50 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-sage-500" />
          </div>
          <div>
            <p className="font-semibold text-neutral-800 text-lg">Cobrança aprovada!</p>
            <p className="text-sm text-neutral-500 mt-1">
              O lançamento foi marcado como pago automaticamente.
            </p>
          </div>
          <button onClick={handleClose} className="btn-primary px-8">Fechar</button>
        </div>
      ) : (
        // ── Formulário ────────────────────────────────────────────────────────
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Aviso segurança */}
          <div className="flex items-start gap-2 text-xs text-sage-700 bg-sage-50 border border-sage-100 rounded-xl px-3 py-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-500 shrink-0 mt-0.5" />
            <p>Dados tokenizados pelo Asaas (PCI-DSS Nível 1) — nunca armazenamos seu cartão.</p>
          </div>

          {/* ── Dados do cartão ──────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Cartão de crédito</p>

            {/* Nome no cartão */}
            <div>
              <label className="label">Nome no cartão *</label>
              <input
                {...register('holderName')}
                className="input uppercase"
                placeholder="NOME COMO IMPRESSO NO CARTÃO"
                onChange={e => setValue('holderName', e.target.value.toUpperCase())}
              />
              {errors.holderName && <p className="error">{errors.holderName.message}</p>}
            </div>

            {/* Número */}
            <div>
              <label className="label">Número do cartão *</label>
              <input
                {...register('number')}
                className="input font-mono tracking-widest"
                placeholder="0000 0000 0000 0000"
                maxLength={19}
                inputMode="numeric"
                value={watch('number') ?? ''}
                onChange={e => setValue('number', maskCard(e.target.value))}
              />
              {errors.number && <p className="error">{errors.number.message}</p>}
            </div>

            {/* Validade + CVV na mesma linha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Validade * <span className="text-neutral-400 font-normal">(MM/AAAA)</span></label>
                <input
                  {...register('expiry')}
                  className="input font-mono"
                  placeholder="04/2027"
                  maxLength={7}
                  inputMode="numeric"
                  value={watch('expiry') ?? ''}
                  onChange={e => setValue('expiry', maskExpiry(e.target.value))}
                />
                {errors.expiry && <p className="error">{errors.expiry.message}</p>}
              </div>
              <div>
                <label className="label">CVV *</label>
                <input
                  {...register('ccv')}
                  className="input font-mono text-center"
                  placeholder="123"
                  maxLength={4}
                  inputMode="numeric"
                  type="password"
                />
                {errors.ccv && <p className="error">{errors.ccv.message}</p>}
              </div>
            </div>
          </section>

          <div className="border-t border-neutral-100" />

          {/* ── Dados do titular (obrigatórios pelo Asaas) ───────────────── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Dados do titular <span className="text-neutral-400 font-normal normal-case">(obrigatório para antifraude)</span>
            </p>

            {/* E-mail */}
            <div>
              <label className="label">E-mail *</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="email@exemplo.com"
              />
              {errors.email && <p className="error">{errors.email.message}</p>}
            </div>

            {/* CPF / CNPJ */}
            <div>
              <label className="label">CPF / CNPJ * <span className="text-neutral-400 font-normal">(apenas números)</span></label>
              <input
                {...register('cpfCnpj')}
                className="input font-mono"
                placeholder="09060664418"
                maxLength={14}
                inputMode="numeric"
                value={watch('cpfCnpj') ?? ''}
                onChange={e => setValue('cpfCnpj', maskCpf(e.target.value))}
              />
              {errors.cpfCnpj && <p className="error">{errors.cpfCnpj.message}</p>}
            </div>

            {/* CEP + Número na mesma linha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CEP * <span className="text-neutral-400 font-normal">(8 dígitos)</span></label>
                <input
                  {...register('postalCode')}
                  className="input font-mono"
                  placeholder="55295410"
                  maxLength={8}
                  inputMode="numeric"
                  value={watch('postalCode') ?? ''}
                  onChange={e => setValue('postalCode', maskCep(e.target.value))}
                />
                {errors.postalCode && <p className="error">{errors.postalCode.message}</p>}
              </div>
              <div>
                <label className="label">Nº do endereço *</label>
                <input
                  {...register('addressNumber')}
                  className="input"
                  placeholder="60"
                />
                {errors.addressNumber && <p className="error">{errors.addressNumber.message}</p>}
              </div>
            </div>

            {/* Complemento + Telefone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Complemento</label>
                <input
                  {...register('addressComplement')}
                  className="input"
                  placeholder="Apto, Sala..."
                />
              </div>
              <div>
                <label className="label">Telefone * <span className="text-neutral-400 font-normal">(sem máscara)</span></label>
                <input
                  {...register('phone')}
                  className="input font-mono"
                  placeholder="87981424445"
                  maxLength={11}
                  inputMode="numeric"
                  value={watch('phone') ?? ''}
                  onChange={e => setValue('phone', maskPhone(e.target.value))}
                />
                {errors.phone && <p className="error">{errors.phone.message}</p>}
              </div>
            </div>
          </section>

          {/* Botão de cobrança */}
          <button
            type="submit"
            disabled={charge.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            {charge.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
            ) : (
              <><CreditCard className="w-4 h-4" /> Cobrar {formatCurrency(record.amount)}</>
            )}
          </button>

          <p className="text-xs text-neutral-400 text-center">
            Powered by Asaas · PCI-DSS Nível 1
          </p>
        </form>
      )}
    </Modal>
  )
}
