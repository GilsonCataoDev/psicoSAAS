import { useState } from 'react'
import { Calculator, Zap, Droplets, Scale, Activity, ChefHat, Loader2, Copy, Check } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// ── Tipos e constantes ────────────────────────────────────────────────────────

type Sex = 'M' | 'F'
type ActivityLevel = 'sedentario' | 'leve' | 'moderado' | 'ativo' | 'muito-ativo'

const ACTIVITY_FACTORS: Record<ActivityLevel, { label: string; factor: number }> = {
  'sedentario':   { label: 'Sedentário (sem exercício)', factor: 1.2 },
  'leve':         { label: 'Leve (1–3 dias/sem)', factor: 1.375 },
  'moderado':     { label: 'Moderado (3–5 dias/sem)', factor: 1.55 },
  'ativo':        { label: 'Ativo (6–7 dias/sem)', factor: 1.725 },
  'muito-ativo':  { label: 'Muito ativo (2× ao dia)', factor: 1.9 },
}

const GOAL_OPTIONS = [
  { value: 'perda-peso',    label: 'Perda de peso',      kcalDelta: -500 },
  { value: 'manutencao',    label: 'Manutenção',          kcalDelta: 0 },
  { value: 'ganho-massa',   label: 'Ganho de massa',      kcalDelta: 300 },
  { value: 'hipertrofia',   label: 'Hipertrofia',         kcalDelta: 500 },
]

const PROTEIN_REF: Record<string, { label: string; g_per_kg: number }> = {
  'normal':      { label: 'Saúde geral (0.8 g/kg)', g_per_kg: 0.8 },
  'ativo':       { label: 'Pessoa ativa (1.2–1.6 g/kg)', g_per_kg: 1.4 },
  'atleta':      { label: 'Atleta / hipertrofia (1.8–2.2 g/kg)', g_per_kg: 2.0 },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function imcClass(imc: number) {
  if (imc < 18.5) return { label: 'Abaixo do peso', color: 'text-blue-600' }
  if (imc < 25)   return { label: 'Peso normal', color: 'text-sage-600' }
  if (imc < 30)   return { label: 'Sobrepeso', color: 'text-amber-600' }
  if (imc < 35)   return { label: 'Obesidade grau I', color: 'text-orange-600' }
  if (imc < 40)   return { label: 'Obesidade grau II', color: 'text-rose-600' }
  return { label: 'Obesidade grau III', color: 'text-rose-800' }
}

function rcqRisk(rcq: number, sex: Sex) {
  if (sex === 'M') {
    if (rcq < 0.9)  return { label: 'Baixo risco', color: 'text-sage-600' }
    if (rcq < 1.0)  return { label: 'Risco moderado', color: 'text-amber-600' }
    return { label: 'Alto risco cardiovascular', color: 'text-rose-600' }
  }
  if (rcq < 0.8)  return { label: 'Baixo risco', color: 'text-sage-600' }
  if (rcq < 0.85) return { label: 'Risco moderado', color: 'text-amber-600' }
  return { label: 'Alto risco cardiovascular', color: 'text-rose-600' }
}

/** Mifflin-St Jeor (kcal/dia) */
function calcTmb(peso: number, altura: number, idade: number, sex: Sex): number {
  const base = 10 * peso + 6.25 * altura - 5 * idade
  return sex === 'M' ? base + 5 : base - 161
}

// ── Componente principal ──────────────────────────────────────────────────────

export function NutritionCalculators({ patientName }: { patientName?: string }) {
  // Anthropometria
  const [peso, setPeso]         = useState('')
  const [altura, setAltura]     = useState('')
  const [cintura, setCintura]   = useState('')
  const [quadril, setQuadril]   = useState('')
  const [idade, setIdade]       = useState('')
  const [sex, setSex]           = useState<Sex>('F')
  const [activity, setActivity] = useState<ActivityLevel>('moderado')
  const [goal, setGoal]         = useState('manutencao')
  const [proteinRef, setProteinRef] = useState('ativo')

  // IA dieta
  const [restrictions, setRestrictions] = useState('')
  const [aiResult, setAiResult]         = useState('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [copied, setCopied]             = useState(false)

  // ── Cálculos ────────────────────────────────────────────────────────────────
  const p   = parseFloat(peso)
  const h   = parseFloat(altura)
  const age = parseFloat(idade)
  const c   = parseFloat(cintura)
  const q   = parseFloat(quadril)

  const validAnthro = p > 0 && h > 0
  const imc   = validAnthro ? p / ((h / 100) ** 2) : null
  const imcCl = imc != null ? imcClass(imc) : null

  const rcq   = c > 0 && q > 0 ? c / q : null
  const rcqCl = rcq != null ? rcqRisk(rcq, sex) : null

  const tmb = validAnthro && age > 0 ? calcTmb(p, h, age, sex) : null
  const get_ = tmb != null ? Math.round(tmb * ACTIVITY_FACTORS[activity].factor) : null

  const goalDelta  = GOAL_OPTIONS.find(o => o.value === goal)?.kcalDelta ?? 0
  const targetKcal = get_ != null ? get_ + goalDelta : null

  const protein = validAnthro ? Math.round(p * PROTEIN_REF[proteinRef].g_per_kg) : null
  const water   = p > 0 ? Math.round(p * 35) : null

  // ── IA: gerar plano alimentar ────────────────────────────────────────────────
  async function generateDiet() {
    if (!targetKcal) { toast.error('Preencha peso, altura, idade e atividade física primeiro.'); return }
    setAiLoading(true)
    setAiResult('')
    try {
      const goalLabel = GOAL_OPTIONS.find(o => o.value === goal)?.label ?? goal
      const prompt = [
        `Crie um plano alimentar semanal (7 dias) para o(a) paciente ${patientName ? `"${patientName}"` : ''}`,
        `Objetivo: ${goalLabel}`,
        `Meta calórica: ${targetKcal} kcal/dia`,
        `Proteína-alvo: ${protein} g/dia`,
        `Hidratação-alvo: ${water ? (water / 1000).toFixed(1) + ' L/dia' : 'conforme tolerância'}`,
        restrictions ? `Restrições / preferências: ${restrictions}` : '',
        ``,
        `Formato esperado: tabela com café da manhã, almoço, lanche da tarde e jantar para cada dia.`,
        `Inclua estimativa de calorias e proteínas por refeição.`,
        `Use alimentos acessíveis e comuns no Brasil.`,
        `Ao final, adicione dicas práticas de preparo e substituições simples.`,
      ].filter(Boolean).join('\n')

      const res = await api.post('/ai/chat', { message: prompt, system: 'Você é um nutricionista clínico brasileiro experiente. Responda sempre em português, com linguagem técnica mas acessível.' })
      setAiResult(res.data?.reply ?? res.data?.content ?? '')
    } catch {
      toast.error('Não foi possível gerar o plano. Verifique a conexão.')
    } finally {
      setAiLoading(false)
    }
  }

  async function copyResult() {
    await navigator.clipboard.writeText(aiResult)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 pb-1 border-b border-neutral-200 dark:border-white/10">
        <Calculator className="h-5 w-5 text-sage-600" />
        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">Calculadoras Nutricionais</h2>
      </div>

      {/* Dados do paciente */}
      <div className="card space-y-4">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Dados Antropométricos</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Peso (kg)', value: peso, set: setPeso, placeholder: '70' },
            { label: 'Altura (cm)', value: altura, set: setAltura, placeholder: '165' },
            { label: 'Idade (anos)', value: idade, set: setIdade, placeholder: '30' },
            { label: 'Cintura (cm)', value: cintura, set: setCintura, placeholder: '80' },
            { label: 'Quadril (cm)', value: quadril, set: setQuadril, placeholder: '95' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label} className="space-y-1">
              <label className="text-xs text-neutral-500">{label}</label>
              <input
                type="number"
                inputMode="decimal"
                placeholder={placeholder}
                value={value}
                onChange={e => set(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Sexo</label>
            <select value={sex} onChange={e => setSex(e.target.value as Sex)} className="input-field w-full text-sm">
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Nível de atividade física</label>
            <select value={activity} onChange={e => setActivity(e.target.value as ActivityLevel)} className="input-field w-full text-sm">
              {Object.entries(ACTIVITY_FACTORS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">Objetivo</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} className="input-field w-full text-sm">
              {GOAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

        {/* IMC */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <Scale className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">IMC</span>
          </div>
          {imc != null ? (
            <>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white font-variant-numeric: tabular-nums">{imc.toFixed(1)}</p>
              <p className={`text-sm font-medium ${imcCl?.color}`}>{imcCl?.label}</p>
              <p className="text-xs text-neutral-400">OMS: abaixo &lt;18.5 · normal 18.5–24.9 · sobrepeso 25–29.9</p>
            </>
          ) : (
            <p className="text-sm text-neutral-400">Informe peso e altura</p>
          )}
        </div>

        {/* RCQ */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">RCQ</span>
          </div>
          {rcq != null ? (
            <>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">{rcq.toFixed(2)}</p>
              <p className={`text-sm font-medium ${rcqCl?.color}`}>{rcqCl?.label}</p>
              <p className="text-xs text-neutral-400">Relação Cintura-Quadril · Risco cardiovascular (OMS)</p>
            </>
          ) : (
            <p className="text-sm text-neutral-400">Informe cintura e quadril</p>
          )}
        </div>

        {/* TMB / GET */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">TMB / GET</span>
          </div>
          {tmb != null ? (
            <>
              <p className="text-sm text-neutral-500">TMB (Mifflin-St Jeor)</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">{Math.round(tmb)} <span className="text-sm font-normal text-neutral-400">kcal/dia</span></p>
              <p className="text-sm text-neutral-500">GET ({ACTIVITY_FACTORS[activity].label.split(' ')[0]})</p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">{get_} <span className="text-sm font-normal text-neutral-400">kcal/dia</span></p>
            </>
          ) : (
            <p className="text-sm text-neutral-400">Informe peso, altura, idade e sexo</p>
          )}
        </div>

        {/* Alvo calórico */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <Calculator className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Alvo calórico</span>
          </div>
          {targetKcal != null ? (
            <>
              <p className="text-3xl font-bold text-sage-700 dark:text-sage-400">{targetKcal} <span className="text-sm font-normal text-neutral-400">kcal/dia</span></p>
              <p className="text-xs text-neutral-400">GET {goalDelta >= 0 ? '+' : ''}{goalDelta} kcal · objetivo: {GOAL_OPTIONS.find(o => o.value === goal)?.label}</p>
            </>
          ) : (
            <p className="text-sm text-neutral-400">Preencha os dados acima</p>
          )}
        </div>

        {/* Proteína */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Proteína</span>
          </div>
          <select value={proteinRef} onChange={e => setProteinRef(e.target.value)} className="input-field w-full text-xs">
            {Object.entries(PROTEIN_REF).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {protein != null ? (
            <>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">{protein} <span className="text-sm font-normal text-neutral-400">g/dia</span></p>
              <p className="text-xs text-neutral-400">{PROTEIN_REF[proteinRef].g_per_kg} g/kg · {p > 0 ? `${p} kg` : ''}</p>
            </>
          ) : (
            <p className="text-sm text-neutral-400">Informe o peso</p>
          )}
        </div>

        {/* Hidratação */}
        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
            <Droplets className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Hidratação</span>
          </div>
          {water != null ? (
            <>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{(water / 1000).toFixed(1)} <span className="text-sm font-normal text-neutral-400">L/dia</span></p>
              <p className="text-xs text-neutral-400">35 ml/kg · {p} kg</p>
              <p className="text-xs text-neutral-400">≈ {Math.round(water / 200)} copos de 200 ml</p>
            </>
          ) : (
            <p className="text-sm text-neutral-400">Informe o peso</p>
          )}
        </div>
      </div>

      {/* IA — Gerador de plano alimentar */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-sage-600" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Plano Alimentar com IA</h3>
          <span className="badge bg-sage-50 text-sage-700 text-xs">Beta</span>
        </div>
        <p className="text-xs text-neutral-500">
          Gera uma sugestão de cardápio semanal com base nos dados calculados acima. Revise e adapte antes de prescrever.
        </p>
        <div className="space-y-1">
          <label className="text-xs text-neutral-500">Restrições, alergias ou preferências (opcional)</label>
          <input
            type="text"
            placeholder="Ex.: vegetariano, intolerante à lactose, sem glúten, não gosta de peixe..."
            value={restrictions}
            onChange={e => setRestrictions(e.target.value)}
            className="input-field w-full text-sm"
          />
        </div>
        <button
          type="button"
          onClick={generateDiet}
          disabled={aiLoading || !targetKcal}
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChefHat className="h-4 w-4" />}
          {aiLoading ? 'Gerando plano...' : 'Gerar plano alimentar'}
        </button>

        {aiResult && (
          <div className="relative rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/5 p-4 text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-[480px] overflow-y-auto">
            <button
              type="button"
              onClick={copyResult}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 text-neutral-500 hover:text-neutral-800"
              title="Copiar"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {aiResult}
          </div>
        )}
      </div>
    </div>
  )
}
