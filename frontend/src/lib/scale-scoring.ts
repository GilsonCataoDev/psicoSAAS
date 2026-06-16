export type ScaleOption = { value: number; label: string }
export type ScaleItem = { id: string; label: string }
export type ScoreLevel = { max: number; label: string; color: string }

export type ScaleConfig = {
  options: ScaleOption[]
  items: ScaleItem[]
  subscales?: Array<{
    id: string
    label: string
    itemIds: string[]
    multiplier?: number
    thresholds: ScoreLevel[]
  }>
  thresholds?: ScoreLevel[]
  note?: string
}

const FREQ_0_3: ScaleOption[] = [
  { value: 0, label: 'Nenhuma vez' },
  { value: 1, label: 'Vários dias' },
  { value: 2, label: 'Mais da metade dos dias' },
  { value: 3, label: 'Quase todos os dias' },
]

const AGREE_0_3: ScaleOption[] = [
  { value: 0, label: 'Não se aplicou' },
  { value: 1, label: 'Às vezes' },
  { value: 2, label: 'Bastante' },
  { value: 3, label: 'Muito/quase sempre' },
]

export const SCALE_CONFIGS: Record<string, ScaleConfig> = {
  phq9: {
    options: FREQ_0_3,
    items: [
      { id: 'q1', label: 'Pouco interesse ou prazer em fazer as coisas' },
      { id: 'q2', label: 'Sentir-se para baixo, deprimido(a) ou sem esperança' },
      { id: 'q3', label: 'Dificuldade para adormecer, permanecer dormindo ou dormir demais' },
      { id: 'q4', label: 'Sentir-se cansado(a) ou com pouca energia' },
      { id: 'q5', label: 'Falta de apetite ou comer em excesso' },
      { id: 'q6', label: 'Sentir-se mal consigo mesmo(a) ou achar que é um fracasso' },
      { id: 'q7', label: 'Dificuldade de concentrar-se em coisas como ler ou assistir TV' },
      { id: 'q8', label: 'Mover-se ou falar tão lentamente que outras pessoas perceberam, ou o contrário' },
      { id: 'q9', label: 'Pensamentos de que seria melhor estar morto(a) ou de se machucar de alguma forma' },
    ],
    thresholds: [
      { max: 4,  label: 'Mínimo',             color: 'text-emerald-700 bg-emerald-50' },
      { max: 9,  label: 'Leve',               color: 'text-yellow-700 bg-yellow-50' },
      { max: 14, label: 'Moderado',           color: 'text-orange-700 bg-orange-50' },
      { max: 19, label: 'Moderadamente grave', color: 'text-red-600 bg-red-50' },
      { max: 27, label: 'Grave',              color: 'text-red-800 bg-red-100' },
    ],
    note: 'O item 9 (pensamentos de se machucar) requer atenção clínica imediata, independente do total.',
  },

  gad7: {
    options: FREQ_0_3,
    items: [
      { id: 'q1', label: 'Sentir-se nervoso(a), ansioso(a) ou no limite' },
      { id: 'q2', label: 'Não ser capaz de parar ou controlar a preocupação' },
      { id: 'q3', label: 'Preocupar-se muito com coisas diferentes' },
      { id: 'q4', label: 'Dificuldade para relaxar' },
      { id: 'q5', label: 'Ficar tão agitado(a) que é difícil ficar parado(a)' },
      { id: 'q6', label: 'Sentir-se facilmente irritado(a) ou irritável' },
      { id: 'q7', label: 'Sentir medo como se algo horrível pudesse acontecer' },
    ],
    thresholds: [
      { max: 4,  label: 'Mínimo',   color: 'text-emerald-700 bg-emerald-50' },
      { max: 9,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
      { max: 14, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
      { max: 21, label: 'Grave',    color: 'text-red-700 bg-red-50' },
    ],
  },

  dass21: {
    options: AGREE_0_3,
    items: [
      { id: 'd1', label: 'Não consegui sentir nenhum sentimento positivo' },
      { id: 'd2', label: 'Senti falta de iniciativa para fazer as coisas' },
      { id: 'd3', label: 'Senti que a vida não tinha sentido' },
      { id: 'd4', label: 'Senti-me triste e deprimido(a)' },
      { id: 'd5', label: 'Não consegui entusiasmar-me com nada' },
      { id: 'd6', label: 'Senti que não tinha valor' },
      { id: 'a1', label: 'Senti minha boca seca' },
      { id: 'a2', label: 'Senti dificuldade em respirar sem ter feito esforço' },
      { id: 'a3', label: 'Tive tremores' },
      { id: 'a4', label: 'Senti que estava prestes a entrar em pânico' },
      { id: 'a5', label: 'Senti o coração acelerado sem fazer esforço' },
      { id: 'a6', label: 'Senti medo sem razão aparente' },
      { id: 's1', label: 'Fiquei perturbado(a) por coisas sem importância' },
      { id: 's2', label: 'Senti dificuldade em relaxar' },
      { id: 's3', label: 'Foi difícil me acalmar após algo perturbador' },
      { id: 's4', label: 'Fiquei impaciente quando algo me impediu' },
      { id: 's5', label: 'Senti-me irritável' },
      { id: 's6', label: 'Senti que estava muito agitado(a)' },
    ],
    subscales: [
      {
        id: 'depression',
        label: 'Depressão',
        itemIds: ['d1','d2','d3','d4','d5','d6'],
        multiplier: 2,
        thresholds: [
          { max: 9,  label: 'Normal',   color: 'text-emerald-700 bg-emerald-50' },
          { max: 13, label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 20, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 27, label: 'Grave',    color: 'text-red-600 bg-red-50' },
          { max: 42, label: 'Muito grave', color: 'text-red-800 bg-red-100' },
        ],
      },
      {
        id: 'anxiety',
        label: 'Ansiedade',
        itemIds: ['a1','a2','a3','a4','a5','a6'],
        multiplier: 2,
        thresholds: [
          { max: 7,  label: 'Normal',   color: 'text-emerald-700 bg-emerald-50' },
          { max: 9,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 14, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 19, label: 'Grave',    color: 'text-red-600 bg-red-50' },
          { max: 42, label: 'Muito grave', color: 'text-red-800 bg-red-100' },
        ],
      },
      {
        id: 'stress',
        label: 'Estresse',
        itemIds: ['s1','s2','s3','s4','s5','s6'],
        multiplier: 2,
        thresholds: [
          { max: 14, label: 'Normal',   color: 'text-emerald-700 bg-emerald-50' },
          { max: 18, label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 25, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 33, label: 'Grave',    color: 'text-red-600 bg-red-50' },
          { max: 42, label: 'Muito grave', color: 'text-red-800 bg-red-100' },
        ],
      },
    ],
  },
}

export function getThresholdLevel(score: number, thresholds: ScoreLevel[]): ScoreLevel {
  return thresholds.find(t => score <= t.max) ?? thresholds[thresholds.length - 1]
}

export function calcScaleScore(
  instrumentId: string,
  answers: Record<string, string>,
): { score: number | null; scoreDetails: string | null } {
  const config = SCALE_CONFIGS[instrumentId]
  if (!config) return { score: null, scoreDetails: null }

  if (config.subscales) {
    const details: Record<string, number> = {}
    let total = 0
    for (const sub of config.subscales) {
      const raw = sub.itemIds.reduce((sum, id) => sum + (parseInt(answers[id] ?? '0', 10) || 0), 0)
      const adjusted = raw * (sub.multiplier ?? 1)
      details[sub.id] = adjusted
      total += adjusted
    }
    return { score: total, scoreDetails: JSON.stringify(details) }
  }

  const total = config.items.reduce((sum, item) => sum + (parseInt(answers[item.id] ?? '0', 10) || 0), 0)
  return { score: total, scoreDetails: null }
}
