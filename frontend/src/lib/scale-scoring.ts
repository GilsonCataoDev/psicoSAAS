export type ScaleOption = { value: number; label: string }
export type ScaleItem = { id: string; label: string; options?: ScaleOption[] }
export type ScoreLevel = { max: number; label: string; color: string }

export type ScaleConfig = {
  options: ScaleOption[]
  items: ScaleItem[]
  invertedItems?: string[]
  criticalItems?: Array<{
    itemId: string
    minValue: number
    label: string
    note: string
  }>
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

// ── Shared option sets ────────────────────────────────────────────────────────

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

const INTENSITY_0_3: ScaleOption[] = [
  { value: 0, label: 'Absolutamente não' },
  { value: 1, label: 'Levemente' },
  { value: 2, label: 'Moderadamente' },
  { value: 3, label: 'Gravemente' },
]

const SEVERITY_0_4: ScaleOption[] = [
  { value: 0, label: 'Nem um pouco' },
  { value: 1, label: 'Um pouco' },
  { value: 2, label: 'Moderadamente' },
  { value: 3, label: 'Muito' },
  { value: 4, label: 'Extremamente' },
]

const DIFFICULTY_0_4: ScaleOption[] = [
  { value: 0, label: 'Nenhuma' },
  { value: 1, label: 'Leve' },
  { value: 2, label: 'Moderada' },
  { value: 3, label: 'Grave' },
  { value: 4, label: 'Extrema / não conseguiu' },
]

const FREQ_0_4: ScaleOption[] = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Raramente' },
  { value: 2, label: 'Às vezes' },
  { value: 3, label: 'Frequentemente' },
  { value: 4, label: 'Muito frequentemente' },
]

const YES_NO: ScaleOption[] = [
  { value: 0, label: 'Não' },
  { value: 1, label: 'Sim' },
]

const SDQ_0_2: ScaleOption[] = [
  { value: 0, label: 'Não verdadeiro' },
  { value: 1, label: 'Parcialmente verdadeiro' },
  { value: 2, label: 'Completamente verdadeiro' },
]

const IMPACT_0_4_TRAUMA: ScaleOption[] = [
  { value: 0, label: 'Absolutamente não' },
  { value: 1, label: 'Um pouco' },
  { value: 2, label: 'Moderadamente' },
  { value: 3, label: 'Bastante' },
  { value: 4, label: 'Extremamente' },
]

const INTENSITY_STATEMENT_0_3: ScaleOption[] = [
  { value: 0, label: 'Não senti isso' },
  { value: 1, label: 'Senti um pouco' },
  { value: 2, label: 'Senti moderadamente' },
  { value: 3, label: 'Senti intensamente / na maior parte do tempo' },
]

const EVA_0_10: ScaleOption[] = [
  { value: 0,  label: '0 — Sem dor' },
  { value: 1,  label: '1' },
  { value: 2,  label: '2' },
  { value: 3,  label: '3' },
  { value: 4,  label: '4' },
  { value: 5,  label: '5' },
  { value: 6,  label: '6' },
  { value: 7,  label: '7' },
  { value: 8,  label: '8' },
  { value: 9,  label: '9' },
  { value: 10, label: '10 — Pior dor imaginável' },
]

/** Fallback do ODI: cada seção sobrescreve com os próprios descritores. */
const ODI_0_5: ScaleOption[] = [
  { value: 0, label: '0 — Sem limitação' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5 — Limitação máxima' },
]

const BERG_0_4: ScaleOption[] = [
  { value: 0, label: '0 — Incapaz de realizar' },
  { value: 1, label: '1 — Necessita de ajuda significativa' },
  { value: 2, label: '2 — Necessita de ajuda mínima ou supervisão' },
  { value: 3, label: '3 — Realiza com supervisão ou desempenho parcial' },
  { value: 4, label: '4 — Realiza com segurança e independência' },
]

// ── Scale configs ─────────────────────────────────────────────────────────────

export const SCALE_CONFIGS: Record<string, ScaleConfig> = {
  // ── PHQ-9 ──────────────────────────────────────────────────────────────────
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
    criticalItems: [
      {
        itemId: 'q9',
        minValue: 1,
        label: 'Item 9 positivo',
        note: 'Investigar ideação suicida/autoagressão e considerar manejo de risco.',
      },
    ],
    thresholds: [
      { max: 4,  label: 'Mínimo',              color: 'text-emerald-700 bg-emerald-50' },
      { max: 9,  label: 'Leve',                color: 'text-yellow-700 bg-yellow-50' },
      { max: 14, label: 'Moderado',            color: 'text-orange-700 bg-orange-50' },
      { max: 19, label: 'Moderadamente grave', color: 'text-red-600 bg-red-50' },
      { max: 27, label: 'Grave',               color: 'text-red-800 bg-red-100' },
    ],
    note: 'O item 9 (pensamentos de se machucar) requer atenção clínica imediata, independentemente do total.',
  },

  // ── GAD-7 ──────────────────────────────────────────────────────────────────
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
    criticalItems: [
      {
        itemId: 'q17',
        minValue: 1,
        label: 'Ideação suicida positiva',
        note: 'Requer avaliação imediata de risco suicida, independentemente do total.',
      },
    ],
    thresholds: [
      { max: 4,  label: 'Mínimo',   color: 'text-emerald-700 bg-emerald-50' },
      { max: 9,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
      { max: 14, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
      { max: 21, label: 'Grave',    color: 'text-red-700 bg-red-50' },
    ],
  },

  // ── DASS-21 ────────────────────────────────────────────────────────────────
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
        id: 'depression', label: 'Depressão',
        itemIds: ['d1','d2','d3','d4','d5','d6'], multiplier: 2,
        thresholds: [
          { max: 9,  label: 'Normal',     color: 'text-emerald-700 bg-emerald-50' },
          { max: 13, label: 'Leve',       color: 'text-yellow-700 bg-yellow-50' },
          { max: 20, label: 'Moderado',   color: 'text-orange-700 bg-orange-50' },
          { max: 27, label: 'Grave',      color: 'text-red-600 bg-red-50' },
          { max: 42, label: 'Muito grave',color: 'text-red-800 bg-red-100' },
        ],
      },
      {
        id: 'anxiety', label: 'Ansiedade',
        itemIds: ['a1','a2','a3','a4','a5','a6'], multiplier: 2,
        thresholds: [
          { max: 7,  label: 'Normal',     color: 'text-emerald-700 bg-emerald-50' },
          { max: 9,  label: 'Leve',       color: 'text-yellow-700 bg-yellow-50' },
          { max: 14, label: 'Moderado',   color: 'text-orange-700 bg-orange-50' },
          { max: 19, label: 'Grave',      color: 'text-red-600 bg-red-50' },
          { max: 42, label: 'Muito grave',color: 'text-red-800 bg-red-100' },
        ],
      },
      {
        id: 'stress', label: 'Estresse',
        itemIds: ['s1','s2','s3','s4','s5','s6'], multiplier: 2,
        thresholds: [
          { max: 14, label: 'Normal',     color: 'text-emerald-700 bg-emerald-50' },
          { max: 18, label: 'Leve',       color: 'text-yellow-700 bg-yellow-50' },
          { max: 25, label: 'Moderado',   color: 'text-orange-700 bg-orange-50' },
          { max: 33, label: 'Grave',      color: 'text-red-600 bg-red-50' },
          { max: 42, label: 'Muito grave',color: 'text-red-800 bg-red-100' },
        ],
      },
    ],
  },

  // ── BAI-adaptado ───────────────────────────────────────────────────────────
  'bai-adaptado': {
    options: INTENSITY_0_3,
    items: [
      { id: 'q1',  label: 'Dormência ou formigamento' },
      { id: 'q2',  label: 'Sensação de calor' },
      { id: 'q3',  label: 'Tremores nas pernas' },
      { id: 'q4',  label: 'Incapaz de relaxar' },
      { id: 'q5',  label: 'Medo de que aconteça o pior' },
      { id: 'q6',  label: 'Tontura ou atordoamento' },
      { id: 'q7',  label: 'Palpitações ou coração acelerado' },
      { id: 'q8',  label: 'Desequilíbrio' },
      { id: 'q9',  label: 'Aterrorizado(a)' },
      { id: 'q10', label: 'Nervoso(a)' },
      { id: 'q11', label: 'Sensação de sufocamento' },
      { id: 'q12', label: 'Mãos tremendo' },
      { id: 'q13', label: 'Instável' },
      { id: 'q14', label: 'Medo de perder o controle' },
      { id: 'q15', label: 'Dificuldade de respirar' },
      { id: 'q16', label: 'Medo de morrer' },
      { id: 'q17', label: 'Assustado(a)' },
      { id: 'q18', label: 'Desconforto abdominal' },
      { id: 'q19', label: 'Rubor facial' },
      { id: 'q20', label: 'Suando sem ser de calor' },
    ],
    thresholds: [
      { max: 7,  label: 'Mínimo',   color: 'text-emerald-700 bg-emerald-50' },
      { max: 15, label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
      { max: 25, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
      { max: 63, label: 'Grave',    color: 'text-red-700 bg-red-50' },
    ],
  },

  // ── BDI-II-adaptado ────────────────────────────────────────────────────────
  'bdi2-adaptado': {
    options: INTENSITY_STATEMENT_0_3,
    items: [
      { id: 'q1',  label: 'Tristeza' },
      { id: 'q2',  label: 'Pessimismo em relação ao futuro' },
      { id: 'q3',  label: 'Sensação de fracasso em relação ao passado' },
      { id: 'q4',  label: 'Perda de prazer nas atividades' },
      { id: 'q5',  label: 'Sentimentos de culpa' },
      { id: 'q6',  label: 'Sentimento de estar sendo punido(a)' },
      { id: 'q7',  label: 'Insatisfação consigo mesmo(a)' },
      { id: 'q8',  label: 'Autocrítica excessiva' },
      { id: 'q9',  label: 'Pensamentos ou vontade de se machucar' },
      { id: 'q10', label: 'Choro com mais frequência que o habitual' },
      { id: 'q11', label: 'Agitação ou inquietação' },
      { id: 'q12', label: 'Perda de interesse por outras pessoas ou atividades' },
      { id: 'q13', label: 'Dificuldade para tomar decisões' },
      { id: 'q14', label: 'Sentimento de desvalorização' },
      { id: 'q15', label: 'Perda de energia' },
      { id: 'q16', label: 'Alteração no padrão de sono' },
      { id: 'q17', label: 'Irritabilidade' },
      { id: 'q18', label: 'Alteração no apetite' },
      { id: 'q19', label: 'Dificuldade de concentração' },
      { id: 'q20', label: 'Cansaço ou fadiga' },
      { id: 'q21', label: 'Perda de interesse por sexo' },
    ],
    criticalItems: [
      {
        itemId: 'q9',
        minValue: 1,
        label: 'Item 9 positivo',
        note: 'Investigar ideação suicida/autoagressão e considerar manejo de risco.',
      },
    ],
    thresholds: [
      { max: 13, label: 'Mínimo',   color: 'text-emerald-700 bg-emerald-50' },
      { max: 19, label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
      { max: 28, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
      { max: 63, label: 'Grave',    color: 'text-red-700 bg-red-50' },
    ],
    note: 'O item 9 (pensamentos de se machucar) requer atenção clínica imediata, independentemente do total. Versão adaptada com temas gerais, sem reproduzir os enunciados originais protegidos do instrumento.',
  },

  // ── PCL-5 ──────────────────────────────────────────────────────────────────
  pcl5: {
    options: SEVERITY_0_4,
    items: [
      { id: 'b1', label: 'Memórias repetidas, perturbadoras ou indesejadas da experiência' },
      { id: 'b2', label: 'Sonhos perturbadores sobre a experiência' },
      { id: 'b3', label: 'Sentir ou agir como se a experiência estivesse acontecendo de novo' },
      { id: 'b4', label: 'Sentir-se muito perturbado quando algo lembra a experiência' },
      { id: 'b5', label: 'Reações físicas intensas quando algo lembra a experiência (palpitações, falta de ar)' },
      { id: 'c1', label: 'Evitar memórias, pensamentos ou sentimentos ligados à experiência' },
      { id: 'c2', label: 'Evitar lembretes externos (pessoas, lugares, conversas) relacionados à experiência' },
      { id: 'd1', label: 'Dificuldade de lembrar partes importantes da experiência' },
      { id: 'd2', label: 'Crenças negativas fortes sobre si mesmo, os outros ou o mundo' },
      { id: 'd3', label: 'Culpar-se fortemente pela experiência ou pelo que aconteceu depois' },
      { id: 'd4', label: 'Sentimentos negativos intensos (medo, horror, raiva, culpa, vergonha)' },
      { id: 'd5', label: 'Perda de interesse em atividades que antes eram prazerosas' },
      { id: 'd6', label: 'Sentir-se distante ou afastado das outras pessoas' },
      { id: 'd7', label: 'Dificuldade de sentir emoções positivas (felicidade, amor)' },
      { id: 'e1', label: 'Comportamento irritável, crises de raiva ou agir de forma agressiva' },
      { id: 'e2', label: 'Assumir riscos ou fazer coisas prejudiciais sem necessidade' },
      { id: 'e3', label: 'Estar superalerta, vigilante ou "de guarda"' },
      { id: 'e4', label: 'Sentir-se agitado(a) ou sobressaltar-se facilmente' },
      { id: 'e5', label: 'Dificuldade de concentração' },
      { id: 'e6', label: 'Dificuldade para adormecer ou permanecer dormindo' },
    ],
    subscales: [
      {
        id: 'reexperiencia', label: 'Reexperiência',
        itemIds: ['b1','b2','b3','b4','b5'],
        thresholds: [
          { max: 10, label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 20, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 20, label: 'Grave',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'esquiva', label: 'Esquiva',
        itemIds: ['c1','c2'],
        thresholds: [
          { max: 4, label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 8, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
        ],
      },
      {
        id: 'cognicoes', label: 'Cognições/Humor',
        itemIds: ['d1','d2','d3','d4','d5','d6','d7'],
        thresholds: [
          { max: 14, label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 28, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
        ],
      },
      {
        id: 'hiperativacao', label: 'Hiperativação',
        itemIds: ['e1','e2','e3','e4','e5','e6'],
        thresholds: [
          { max: 12, label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 24, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
        ],
      },
    ],
    thresholds: [
      { max: 10, label: 'Improvável TEPT', color: 'text-emerald-700 bg-emerald-50' },
      { max: 20, label: 'Leve',            color: 'text-yellow-700 bg-yellow-50' },
      { max: 45, label: 'Moderado',        color: 'text-orange-700 bg-orange-50' },
      { max: 80, label: 'Grave',           color: 'text-red-700 bg-red-50' },
    ],
  },

  // ── SRQ-20 ─────────────────────────────────────────────────────────────────
  srq20: {
    options: YES_NO,
    items: [
      { id: 'q1',  label: 'Você tem dores de cabeça com frequência?' },
      { id: 'q2',  label: 'Tem falta de apetite?' },
      { id: 'q3',  label: 'Dorme mal?' },
      { id: 'q4',  label: 'Assusta-se com facilidade?' },
      { id: 'q5',  label: 'Tem tremores nas mãos?' },
      { id: 'q6',  label: 'Sente-se nervoso(a), tenso(a) ou preocupado(a)?' },
      { id: 'q7',  label: 'Tem má digestão?' },
      { id: 'q8',  label: 'Tem dificuldade de pensar com clareza?' },
      { id: 'q9',  label: 'Tem se sentido triste ultimamente?' },
      { id: 'q10', label: 'Tem chorado mais do que de costume?' },
      { id: 'q11', label: 'Encontra dificuldades para realizar suas atividades diárias com satisfação?' },
      { id: 'q12', label: 'Tem dificuldade para tomar decisões?' },
      { id: 'q13', label: 'O seu trabalho diário lhe causa sofrimento?' },
      { id: 'q14', label: 'É incapaz de desempenhar um papel útil em sua vida?' },
      { id: 'q15', label: 'Tem perdido o interesse pelas coisas?' },
      { id: 'q16', label: 'Você se sente uma pessoa inútil, sem préstimo?' },
      { id: 'q17', label: 'Tem tido a ideia de acabar com a vida?' },
      { id: 'q18', label: 'Sente-se cansado(a) o tempo todo?' },
      { id: 'q19', label: 'Tem sensações desagradáveis no estômago?' },
      { id: 'q20', label: 'Você se cansa com facilidade?' },
    ],
    thresholds: [
      { max: 7,  label: 'Baixa probabilidade de TMC', color: 'text-emerald-700 bg-emerald-50' },
      { max: 20, label: 'Provável transtorno mental comum', color: 'text-orange-700 bg-orange-50' },
    ],
    note: 'O item 17 (ideia de acabar com a vida) requer avaliação imediata de risco suicida, independentemente do total.',
  },

  // ── ISI ────────────────────────────────────────────────────────────────────
  isi: {
    options: [
      { value: 0, label: '0 — Nenhum' },
      { value: 1, label: '1 — Leve' },
      { value: 2, label: '2 — Moderado' },
      { value: 3, label: '3 — Grave' },
      { value: 4, label: '4 — Muito grave' },
    ],
    items: [
      { id: 'q1', label: 'Dificuldade para adormecer' },
      { id: 'q2', label: 'Dificuldade para permanecer dormindo' },
      { id: 'q3', label: 'Problema de acordar muito cedo' },
      { id: 'q4', label: 'Satisfação com o padrão atual de sono (0=muito satisfeito → 4=muito insatisfeito)' },
      { id: 'q5', label: 'Interferência no funcionamento diurno (fadiga, humor, desempenho, atenção)' },
      { id: 'q6', label: 'Quanto o problema de sono é perceptível para os outros' },
      { id: 'q7', label: 'Preocupação / sofrimento causado pelo problema de sono' },
    ],
    thresholds: [
      { max: 7,  label: 'Sem insônia clinicamente significativa', color: 'text-emerald-700 bg-emerald-50' },
      { max: 14, label: 'Insônia subclínica',   color: 'text-yellow-700 bg-yellow-50' },
      { max: 21, label: 'Insônia moderada',     color: 'text-orange-700 bg-orange-50' },
      { max: 28, label: 'Insônia grave',        color: 'text-red-700 bg-red-50' },
    ],
  },

  // ── ESS ────────────────────────────────────────────────────────────────────
  ess: {
    options: [
      { value: 0, label: 'Nunca cochilaria' },
      { value: 1, label: 'Pequena chance' },
      { value: 2, label: 'Chance moderada' },
      { value: 3, label: 'Alta chance' },
    ],
    items: [
      { id: 'q1', label: 'Sentado(a) e lendo' },
      { id: 'q2', label: 'Assistindo à televisão' },
      { id: 'q3', label: 'Sentado(a), inativo(a) em local público (sala de espera, teatro, reunião)' },
      { id: 'q4', label: 'Como passageiro de carro por 1 hora sem parar' },
      { id: 'q5', label: 'Deitando para descansar à tarde quando as circunstâncias permitem' },
      { id: 'q6', label: 'Sentado(a) e conversando com alguém' },
      { id: 'q7', label: 'Sentado(a) tranquilamente após o almoço sem álcool' },
      { id: 'q8', label: 'Em um carro, enquanto para por alguns minutos no trânsito' },
    ],
    thresholds: [
      { max: 5,  label: 'Normal',              color: 'text-emerald-700 bg-emerald-50' },
      { max: 10, label: 'Sonolência leve',      color: 'text-yellow-700 bg-yellow-50' },
      { max: 15, label: 'Sonolência moderada',  color: 'text-orange-700 bg-orange-50' },
      { max: 24, label: 'Sonolência grave/excessiva', color: 'text-red-700 bg-red-50' },
    ],
    note: 'Pontuação ≥10 recomenda avaliação de apneia do sono e outros distúrbios do sono.',
  },

  // ── AUDIT ──────────────────────────────────────────────────────────────────
  audit: {
    options: [
      { value: 0, label: '0' },
      { value: 1, label: '1' },
      { value: 2, label: '2' },
      { value: 3, label: '3' },
      { value: 4, label: '4' },
    ],
    items: [
      {
        id: 'q1', label: 'Com que frequência você toma bebida alcoólica?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Mensalmente ou menos' },
          { value: 2, label: '2–4× por mês' },
          { value: 3, label: '2–3× por semana' },
          { value: 4, label: '4+ vezes por semana' },
        ],
      },
      {
        id: 'q2', label: 'Quantas doses você toma num dia típico em que bebe?',
        options: [
          { value: 0, label: '1–2 doses' },
          { value: 1, label: '3–4 doses' },
          { value: 2, label: '5–6 doses' },
          { value: 3, label: '7–9 doses' },
          { value: 4, label: '10 ou mais doses' },
        ],
      },
      {
        id: 'q3', label: 'Com que frequência você toma 6 ou mais doses em uma única ocasião?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Menos de 1×/mês' },
          { value: 2, label: 'Mensalmente' },
          { value: 3, label: 'Semanalmente' },
          { value: 4, label: 'Diariamente ou quase' },
        ],
      },
      {
        id: 'q4', label: 'Com que frequência no último ano você não conseguiu parar de beber uma vez que havia começado?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Menos de 1×/mês' },
          { value: 2, label: 'Mensalmente' },
          { value: 3, label: 'Semanalmente' },
          { value: 4, label: 'Diariamente ou quase' },
        ],
      },
      {
        id: 'q5', label: 'Com que frequência no último ano deixou de fazer o que era esperado por causa da bebida?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Menos de 1×/mês' },
          { value: 2, label: 'Mensalmente' },
          { value: 3, label: 'Semanalmente' },
          { value: 4, label: 'Diariamente ou quase' },
        ],
      },
      {
        id: 'q6', label: 'Com que frequência no último ano precisou de uma dose de manhã para se sentir bem?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Menos de 1×/mês' },
          { value: 2, label: 'Mensalmente' },
          { value: 3, label: 'Semanalmente' },
          { value: 4, label: 'Diariamente ou quase' },
        ],
      },
      {
        id: 'q7', label: 'Com que frequência no último ano sentiu culpa ou remorso depois de beber?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Menos de 1×/mês' },
          { value: 2, label: 'Mensalmente' },
          { value: 3, label: 'Semanalmente' },
          { value: 4, label: 'Diariamente ou quase' },
        ],
      },
      {
        id: 'q8', label: 'Com que frequência não se lembrou do que aconteceu devido à bebida?',
        options: [
          { value: 0, label: 'Nunca' },
          { value: 1, label: 'Menos de 1×/mês' },
          { value: 2, label: 'Mensalmente' },
          { value: 3, label: 'Semanalmente' },
          { value: 4, label: 'Diariamente ou quase' },
        ],
      },
      {
        id: 'q9', label: 'Você ou alguém se machucou porque você havia bebido?',
        options: [
          { value: 0, label: 'Não' },
          { value: 2, label: 'Sim, mas não no último ano' },
          { value: 4, label: 'Sim, no último ano' },
        ],
      },
      {
        id: 'q10', label: 'Alguém (parente, médico) se preocupou com seu modo de beber ou sugeriu que parasse?',
        options: [
          { value: 0, label: 'Não' },
          { value: 2, label: 'Sim, mas não no último ano' },
          { value: 4, label: 'Sim, no último ano' },
        ],
      },
    ],
    thresholds: [
      { max: 7,  label: 'Uso de baixo risco',    color: 'text-emerald-700 bg-emerald-50' },
      { max: 15, label: 'Uso perigoso',           color: 'text-yellow-700 bg-yellow-50' },
      { max: 19, label: 'Uso nocivo',             color: 'text-orange-700 bg-orange-50' },
      { max: 40, label: 'Provável dependência',   color: 'text-red-700 bg-red-50' },
    ],
  },

  // ── CAGE ───────────────────────────────────────────────────────────────────
  cage: {
    options: YES_NO,
    items: [
      { id: 'c', label: 'Você alguma vez sentiu que deveria diminuir sua quantidade de bebida?' },
      { id: 'a', label: 'As pessoas o(a) irritam ao criticar sua maneira de beber?' },
      { id: 'g', label: 'Você se sente mal ou culpado(a) por causa da sua bebida?' },
      { id: 'e', label: 'Você costuma beber de manhã para afastar o nervosismo ou a ressaca?' },
    ],
    thresholds: [
      { max: 0, label: 'Sem indicativo de dependência', color: 'text-emerald-700 bg-emerald-50' },
      { max: 1, label: 'Atenção — uso problemático possível', color: 'text-yellow-700 bg-yellow-50' },
      { max: 4, label: 'Provável dependência de álcool',    color: 'text-red-700 bg-red-50' },
    ],
  },

  // ── WHODAS 2.0 ─────────────────────────────────────────────────────────────
  whodas: {
    options: DIFFICULTY_0_4,
    items: [
      { id: 'cog1', label: 'Concentrar-se em fazer algo por 10 minutos?' },
      { id: 'cog2', label: 'Lembrar coisas importantes que precisava fazer?' },
      { id: 'mob1', label: 'Andar por uma longa distância (1 km)?' },
      { id: 'mob2', label: 'Sair de casa?' },
      { id: 'aut1', label: 'Tomar banho sozinho(a)?' },
      { id: 'aut2', label: 'Vestir-se sozinho(a)?' },
      { id: 'rel1', label: 'Lidar com pessoas que não conhece?' },
      { id: 'rel2', label: 'Manter uma amizade?' },
      { id: 'atv1', label: 'Realizar suas atividades do lar?' },
      { id: 'atv2', label: 'Terminar tarefas importantes com rapidez?' },
      { id: 'soc1', label: 'Quanto os seus problemas de saúde afetaram a sua vida?' },
      { id: 'soc2', label: 'Quanto a sua incapacidade causou problemas para sua família?' },
    ],
    subscales: [
      {
        id: 'cognition', label: 'Cognição',
        itemIds: ['cog1','cog2'],
        thresholds: [
          { max: 2,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 5,  label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 8,  label: 'Grave',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'mobility', label: 'Mobilidade',
        itemIds: ['mob1','mob2'],
        thresholds: [
          { max: 2,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 5,  label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 8,  label: 'Grave',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'selfcare', label: 'Autocuidado',
        itemIds: ['aut1','aut2'],
        thresholds: [
          { max: 2,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 5,  label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 8,  label: 'Grave',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'relations', label: 'Relacionamentos',
        itemIds: ['rel1','rel2'],
        thresholds: [
          { max: 2,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 5,  label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 8,  label: 'Grave',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'activities', label: 'Atividades de vida',
        itemIds: ['atv1','atv2'],
        thresholds: [
          { max: 2,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 5,  label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 8,  label: 'Grave',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'participation', label: 'Participação social',
        itemIds: ['soc1','soc2'],
        thresholds: [
          { max: 2,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 5,  label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 8,  label: 'Grave',    color: 'text-red-700 bg-red-50' },
        ],
      },
    ],
    thresholds: [
      { max: 10, label: 'Incapacidade leve',     color: 'text-yellow-700 bg-yellow-50' },
      { max: 24, label: 'Incapacidade moderada', color: 'text-orange-700 bg-orange-50' },
      { max: 48, label: 'Incapacidade grave',    color: 'text-red-700 bg-red-50' },
    ],
  },

  // ── SDQ ────────────────────────────────────────────────────────────────────
  sdq: {
    options: SDQ_0_2,
    invertedItems: ['e7', 'h14', 'h15', 'p17', 'p18'],
    items: [
      { id: 'e1',  label: 'Frequentemente se queixa de dores de cabeça, barriga ou vômitos' },
      { id: 'e2',  label: 'Tem muitas preocupações, frequentemente parece preocupada(o)' },
      { id: 'e3',  label: 'Frequentemente parece infeliz, desanimada(o) ou chorosa(o)' },
      { id: 'e4',  label: 'Fica nervosa(o) em novas situações, facilmente perde a autoconfiança' },
      { id: 'e5',  label: 'Tem muitos medos, assusta-se facilmente' },
      { id: 'c6',  label: 'Frequentemente tem crises de raiva ou mau humor' },
      { id: 'e7',  label: 'É geralmente obediente [pontuação invertida]' },
      { id: 'c8',  label: 'Frequentemente briga com outras crianças ou as intimida' },
      { id: 'c9',  label: 'Frequentemente mente ou trapaceia' },
      { id: 'c10', label: 'Pega coisas que não são suas em casa, escola ou outros lugares' },
      { id: 'h11', label: 'Agitada(o), não consegue ficar parada(o) por muito tempo' },
      { id: 'h12', label: 'Fica se mexendo ou contorcendo constantemente' },
      { id: 'h13', label: 'Se distrai facilmente, não consegue se concentrar' },
      { id: 'h14', label: 'Pensa antes de agir [pontuação invertida]' },
      { id: 'h15', label: 'Termina o que começa, tem boa concentração [pontuação invertida]' },
      { id: 'p16', label: 'Prefere ficar sozinha(o) a estar com outras crianças' },
      { id: 'p17', label: 'Tem pelo menos um bom amigo [pontuação invertida]' },
      { id: 'p18', label: 'Em geral as outras crianças gostam dela(e) [pontuação invertida]' },
      { id: 'p19', label: 'Outras crianças a(o) implicam ou intimidam' },
      { id: 'p20', label: 'Se dá melhor com adultos do que com crianças' },
      { id: 'ps21', label: 'Tem consideração pelos sentimentos dos outros' },
      { id: 'ps22', label: 'Compartilha facilmente com outras crianças' },
      { id: 'ps23', label: 'Tem bom comportamento com crianças mais novas' },
      { id: 'ps24', label: 'Muitas vezes se oferece para ajudar os outros' },
      { id: 'ps25', label: 'É gentil com crianças mais novas' },
    ],
    subscales: [
      {
        id: 'emotional', label: 'Sintomas emocionais',
        itemIds: ['e1','e2','e3','e4','e5'],
        thresholds: [
          { max: 3,  label: 'Normal',     color: 'text-emerald-700 bg-emerald-50' },
          { max: 4,  label: 'Limítrofe',  color: 'text-yellow-700 bg-yellow-50' },
          { max: 10, label: 'Anormal',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'conduct', label: 'Problemas de conduta',
        itemIds: ['c6','e7','c8','c9','c10'],
        thresholds: [
          { max: 2,  label: 'Normal',     color: 'text-emerald-700 bg-emerald-50' },
          { max: 3,  label: 'Limítrofe',  color: 'text-yellow-700 bg-yellow-50' },
          { max: 10, label: 'Anormal',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'hyperactivity', label: 'Hiperatividade/Desatenção',
        itemIds: ['h11','h12','h13','h14','h15'],
        thresholds: [
          { max: 5,  label: 'Normal',     color: 'text-emerald-700 bg-emerald-50' },
          { max: 6,  label: 'Limítrofe',  color: 'text-yellow-700 bg-yellow-50' },
          { max: 10, label: 'Anormal',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'peer', label: 'Problemas com colegas',
        itemIds: ['p16','p17','p18','p19','p20'],
        thresholds: [
          { max: 2,  label: 'Normal',     color: 'text-emerald-700 bg-emerald-50' },
          { max: 3,  label: 'Limítrofe',  color: 'text-yellow-700 bg-yellow-50' },
          { max: 10, label: 'Anormal',    color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'prosocial', label: 'Comportamento pró-social',
        itemIds: ['ps21','ps22','ps23','ps24','ps25'],
        thresholds: [
          { max: 4,  label: 'Anormal',   color: 'text-red-700 bg-red-50' },
          { max: 5,  label: 'Limítrofe', color: 'text-yellow-700 bg-yellow-50' },
          { max: 10, label: 'Normal',    color: 'text-emerald-700 bg-emerald-50' },
        ],
      },
    ],
    thresholds: [
      { max: 13, label: 'Normal (dificuldades)',    color: 'text-emerald-700 bg-emerald-50' },
      { max: 16, label: 'Limítrofe (dificuldades)', color: 'text-yellow-700 bg-yellow-50' },
      { max: 40, label: 'Anormal (dificuldades)',   color: 'text-red-700 bg-red-50' },
    ],
    note: 'Total de dificuldades = soma das 4 primeiras subescalas. Pró-social é avaliado separadamente.',
  },

  // ── IES-R ──────────────────────────────────────────────────────────────────
  'ies-r': {
    options: IMPACT_0_4_TRAUMA,
    items: [
      { id: 'i1', label: 'Qualquer lembrete fez surgir pensamentos ou sentimentos sobre o evento' },
      { id: 'i2', label: 'Tive sonhos perturbadores sobre o evento' },
      { id: 'i3', label: 'Senti como se o evento estivesse acontecendo de novo' },
      { id: 'i4', label: 'Coisas do cotidiano me lembraram o evento' },
      { id: 'i5', label: 'Dificuldade em adormecer por causa de imagens ou pensamentos sobre o evento' },
      { id: 'i6', label: 'Ondas de sentimentos intensos em relação ao evento' },
      { id: 'i7', label: 'Imagens do evento apareceram em minha mente' },
      { id: 'i8', label: 'Outros lembretes do evento causaram reações físicas (sudorese, dificuldade para respirar)' },
      { id: 'ev1', label: 'Tentei não falar sobre o evento' },
      { id: 'ev2', label: 'Senti que era como se não tivesse acontecido ou não fosse real' },
      { id: 'ev3', label: 'Tentei não pensar nele' },
      { id: 'ev4', label: 'Percebi que ainda tenho muitos sentimentos a respeito, mas não os enfrentei' },
      { id: 'ev5', label: 'Meus sentimentos em relação ao evento foram entorpecidos' },
      { id: 'ev6', label: 'Tentei afastar o evento de minha memória' },
      { id: 'ev7', label: 'Me senti deprimido(a) por causa do evento' },
      { id: 'ev8', label: 'Tive sentimentos sobre ele, mas os mantive fora da minha consciência' },
      { id: 'h1', label: 'Tive dificuldade para me concentrar' },
      { id: 'h2', label: 'Fiquei agitado(a) e irritado(a)' },
      { id: 'h3', label: 'Fiquei alerta e vigilante' },
      { id: 'h4', label: 'Fiquei sobressaltado(a) facilmente' },
      { id: 'h5', label: 'Tive dificuldade em me concentrar' },
      { id: 'h6', label: 'Tive reações físicas ao lembrar do evento' },
    ],
    subscales: [
      {
        id: 'intrusion', label: 'Intrusão',
        itemIds: ['i1','i2','i3','i4','i5','i6','i7','i8'],
        thresholds: [
          { max: 8,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 19, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 32, label: 'Alto',     color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'avoidance', label: 'Evitação',
        itemIds: ['ev1','ev2','ev3','ev4','ev5','ev6','ev7','ev8'],
        thresholds: [
          { max: 8,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 19, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 32, label: 'Alto',     color: 'text-red-700 bg-red-50' },
        ],
      },
      {
        id: 'hyperarousal', label: 'Hiperexcitação',
        itemIds: ['h1','h2','h3','h4','h5','h6'],
        thresholds: [
          { max: 6,  label: 'Leve',     color: 'text-yellow-700 bg-yellow-50' },
          { max: 14, label: 'Moderado', color: 'text-orange-700 bg-orange-50' },
          { max: 24, label: 'Alto',     color: 'text-red-700 bg-red-50' },
        ],
      },
    ],
    thresholds: [
      { max: 8,  label: 'Leve',      color: 'text-yellow-700 bg-yellow-50' },
      { max: 25, label: 'Moderado',  color: 'text-orange-700 bg-orange-50' },
      { max: 43, label: 'Alto',      color: 'text-red-600 bg-red-50' },
      { max: 88, label: 'Muito alto — sugestivo de TEPT', color: 'text-red-800 bg-red-100' },
    ],
  },

  // ── ASRS-v1.1 (TDAH adulto) ────────────────────────────────────────────────
  'tdah-adulto': {
    options: FREQ_0_4,
    items: [
      { id: 'a1', label: 'Com que frequência você comete erros por falta de atenção em tarefas chatas ou difíceis?' },
      { id: 'a2', label: 'Com que frequência você tem dificuldade de manter a atenção em tarefas chatas ou repetitivas?' },
      { id: 'a3', label: 'Com que frequência você tem dificuldade de se concentrar no que as pessoas dizem?' },
      { id: 'a4', label: 'Com que frequência você deixa um projeto pela metade após fazer as partes mais fáceis?' },
      { id: 'a5', label: 'Com que frequência você tem dificuldade para fazer tarefas que requerem organização?' },
      { id: 'a6', label: 'Quando precisa fazer algo que requer muita concentração, com que frequência você evita ou adia?' },
      { id: 'b7',  label: 'Com que frequência você faz coisas desajeitadas ou esbarrões quando está apressado(a)?' },
      { id: 'b8',  label: 'Com que frequência você esquece compromissos ou obrigações?' },
      { id: 'b9',  label: 'Com que frequência você evita situações que requerem pensar muito?' },
      { id: 'b10', label: 'Com que frequência você fica se mexendo com mãos ou pés quando precisa ficar sentado(a)?' },
      { id: 'b11', label: 'Com que frequência você sai do lugar em situações em que se espera ficar sentado(a)?' },
      { id: 'b12', label: 'Com que frequência você tem dificuldade de relaxar e descansar quando tem tempo livre?' },
      { id: 'b13', label: 'Com que frequência você se sente como se precisasse estar sempre em atividade?' },
      { id: 'b14', label: 'Com que frequência você fala demais em situações sociais?' },
      { id: 'b15', label: 'Com que frequência você termina as frases das pessoas antes delas acabarem?' },
      { id: 'b16', label: 'Com que frequência você tem dificuldade de esperar sua vez?' },
      { id: 'b17', label: 'Com que frequência você interrompe os outros quando estão ocupados?' },
      { id: 'b18', label: 'Com que frequência você tem dificuldade de esperar em filas ou situações semelhantes?' },
    ],
    subscales: [
      {
        id: 'partA', label: 'Parte A — Triagem (6 itens)',
        itemIds: ['a1','a2','a3','a4','a5','a6'],
        thresholds: [
          { max: 11, label: 'Rastreio negativo',  color: 'text-emerald-700 bg-emerald-50' },
          { max: 24, label: 'Rastreio positivo — consistente com TDAH', color: 'text-orange-700 bg-orange-50' },
        ],
      },
      {
        id: 'partB', label: 'Parte B — Sintomas adicionais (12 itens)',
        itemIds: ['b7','b8','b9','b10','b11','b12','b13','b14','b15','b16','b17','b18'],
        thresholds: [
          { max: 48, label: 'Referência adicional', color: 'text-neutral-600 bg-neutral-50' },
        ],
      },
    ],
    thresholds: [
      { max: 35, label: 'Total baixo',  color: 'text-emerald-700 bg-emerald-50' },
      { max: 72, label: 'Total elevado', color: 'text-orange-700 bg-orange-50' },
    ],
    note: 'O rastreio da Parte A (≥4 itens com pontuação 3–4) é o critério principal do ASRS. O total de 72 é referência secundária.',
  },

  // ── EVA — Escala Visual Analógica de Dor ───────────────────────────────────
  'eva-dor': {
    options: EVA_0_10,
    items: [
      { id: 'q1', label: 'Intensidade da dor neste momento' },
    ],
    thresholds: [
      { max: 0,  label: 'Sem dor',        color: 'text-emerald-700 bg-emerald-50' },
      { max: 3,  label: 'Dor leve',       color: 'text-yellow-700 bg-yellow-50' },
      { max: 6,  label: 'Dor moderada',   color: 'text-orange-700 bg-orange-50' },
      { max: 10, label: 'Dor intensa',    color: 'text-red-700 bg-red-50' },
    ],
    note: 'Mede intensidade num instante — o valor isolado diz pouco. O uso clínico está na curva ao longo do tratamento. Diferença de 2 pontos costuma ser adotada como mudança clinicamente relevante.',
  },

  // ── Índice de Oswestry (ODI) ───────────────────────────────────────────────
  // 10 seções de 0 a 5 (bruto 0–50). O resultado é percentual: bruto × 2.
  oswestry: {
    options: ODI_0_5,
    items: [
      { id: 'q1',  label: 'Seção 1 — Intensidade da dor', options: [
        { value: 0, label: 'Não sinto dor no momento' },
        { value: 1, label: 'A dor é muito leve no momento' },
        { value: 2, label: 'A dor é moderada no momento' },
        { value: 3, label: 'A dor é razoavelmente intensa no momento' },
        { value: 4, label: 'A dor é muito intensa no momento' },
        { value: 5, label: 'A dor é a pior imaginável no momento' },
      ] },
      { id: 'q2',  label: 'Seção 2 — Cuidados pessoais (lavar-se, vestir-se)', options: [
        { value: 0, label: 'Cuido de mim normalmente, sem aumentar a dor' },
        { value: 1, label: 'Cuido de mim normalmente, mas isso aumenta a dor' },
        { value: 2, label: 'Cuidar de mim dói e faço devagar e com cuidado' },
        { value: 3, label: 'Preciso de alguma ajuda, mas faço a maior parte sozinho(a)' },
        { value: 4, label: 'Preciso de ajuda todos os dias na maioria dos cuidados' },
        { value: 5, label: 'Não me visto, lavo-me com dificuldade e fico na cama' },
      ] },
      { id: 'q3',  label: 'Seção 3 — Levantar peso', options: [
        { value: 0, label: 'Levanto peso sem aumentar a dor' },
        { value: 1, label: 'Levanto peso, mas isso aumenta a dor' },
        { value: 2, label: 'A dor impede levantar peso do chão, mas consigo se estiver bem posicionado (ex.: sobre a mesa)' },
        { value: 3, label: 'A dor impede levantar peso, mas consigo pesos leves ou médios bem posicionados' },
        { value: 4, label: 'Consigo levantar apenas objetos muito leves' },
        { value: 5, label: 'Não consigo levantar nem carregar nada' },
      ] },
      { id: 'q4',  label: 'Seção 4 — Caminhar', options: [
        { value: 0, label: 'A dor não me impede de caminhar qualquer distância' },
        { value: 1, label: 'A dor me impede de caminhar mais de 1,5 km' },
        { value: 2, label: 'A dor me impede de caminhar mais de 500 m' },
        { value: 3, label: 'A dor me impede de caminhar mais de 100 m' },
        { value: 4, label: 'Só consigo caminhar usando bengala ou muletas' },
        { value: 5, label: 'Fico na cama a maior parte do tempo e me arrasto até o banheiro' },
      ] },
      { id: 'q5',  label: 'Seção 5 — Sentar', options: [
        { value: 0, label: 'Sento em qualquer cadeira pelo tempo que quiser' },
        { value: 1, label: 'Sento pelo tempo que quiser apenas na minha cadeira favorita' },
        { value: 2, label: 'A dor me impede de sentar por mais de 1 hora' },
        { value: 3, label: 'A dor me impede de sentar por mais de 30 minutos' },
        { value: 4, label: 'A dor me impede de sentar por mais de 10 minutos' },
        { value: 5, label: 'A dor me impede de sentar' },
      ] },
      { id: 'q6',  label: 'Seção 6 — Ficar em pé', options: [
        { value: 0, label: 'Fico em pé o tempo que quiser, sem aumentar a dor' },
        { value: 1, label: 'Fico em pé o tempo que quiser, mas isso aumenta a dor' },
        { value: 2, label: 'A dor me impede de ficar em pé por mais de 1 hora' },
        { value: 3, label: 'A dor me impede de ficar em pé por mais de 30 minutos' },
        { value: 4, label: 'A dor me impede de ficar em pé por mais de 10 minutos' },
        { value: 5, label: 'A dor me impede de ficar em pé' },
      ] },
      { id: 'q7',  label: 'Seção 7 — Dormir', options: [
        { value: 0, label: 'Meu sono nunca é perturbado pela dor' },
        { value: 1, label: 'Meu sono é ocasionalmente perturbado pela dor' },
        { value: 2, label: 'Por causa da dor, durmo menos de 6 horas' },
        { value: 3, label: 'Por causa da dor, durmo menos de 4 horas' },
        { value: 4, label: 'Por causa da dor, durmo menos de 2 horas' },
        { value: 5, label: 'A dor me impede totalmente de dormir' },
      ] },
      { id: 'q8',  label: 'Seção 8 — Vida sexual', options: [
        { value: 0, label: 'Normal, sem aumentar a dor' },
        { value: 1, label: 'Normal, mas aumenta a dor' },
        { value: 2, label: 'Quase normal, mas muito dolorosa' },
        { value: 3, label: 'Severamente limitada pela dor' },
        { value: 4, label: 'Quase inexistente por causa da dor' },
        { value: 5, label: 'A dor impede qualquer vida sexual' },
      ] },
      { id: 'q9',  label: 'Seção 9 — Vida social', options: [
        { value: 0, label: 'Normal, sem aumentar a dor' },
        { value: 1, label: 'Normal, mas aumenta a dor' },
        { value: 2, label: 'Sem efeito importante, exceto em atividades mais intensas (ex.: esporte)' },
        { value: 3, label: 'Limitada — não saio com a mesma frequência' },
        { value: 4, label: 'Restrita ao ambiente de casa' },
        { value: 5, label: 'Não tenho vida social por causa da dor' },
      ] },
      { id: 'q10', label: 'Seção 10 — Locomoção / viagens', options: [
        { value: 0, label: 'Viajo para qualquer lugar sem dor' },
        { value: 1, label: 'Viajo para qualquer lugar, mas isso aumenta a dor' },
        { value: 2, label: 'A dor é ruim, mas suporto viagens de mais de 2 horas' },
        { value: 3, label: 'A dor me restringe a viagens de menos de 1 hora' },
        { value: 4, label: 'A dor me restringe a viagens curtas e necessárias, de menos de 30 minutos' },
        { value: 5, label: 'A dor me impede de viajar, exceto para tratamento' },
      ] },
    ],
    subscales: [
      {
        id: 'percentual',
        label: 'Percentual de incapacidade',
        itemIds: ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10'],
        multiplier: 2,
        thresholds: [
          { max: 20,  label: 'Incapacidade mínima',   color: 'text-emerald-700 bg-emerald-50' },
          { max: 40,  label: 'Incapacidade moderada', color: 'text-yellow-700 bg-yellow-50' },
          { max: 60,  label: 'Incapacidade intensa',  color: 'text-orange-700 bg-orange-50' },
          { max: 80,  label: 'Aleijado',              color: 'text-red-700 bg-red-50' },
          { max: 100, label: 'Restrito ao leito',     color: 'text-red-800 bg-red-100' },
        ],
      },
    ],
    thresholds: [
      { max: 20,  label: 'Incapacidade mínima',   color: 'text-emerald-700 bg-emerald-50' },
      { max: 40,  label: 'Incapacidade moderada', color: 'text-yellow-700 bg-yellow-50' },
      { max: 60,  label: 'Incapacidade intensa',  color: 'text-orange-700 bg-orange-50' },
      { max: 80,  label: 'Aleijado',              color: 'text-red-700 bg-red-50' },
      { max: 100, label: 'Restrito ao leito',     color: 'text-red-800 bg-red-100' },
    ],
    note: 'O total já é o percentual de incapacidade (soma bruta de 0–50 multiplicada por 2). A seção 8 pode ser omitida quando não se aplica — nesse caso o cálculo padrão do ODI usa 45 como denominador, ajuste que esta versão não faz automaticamente.',
  },

  // ── Escala de Equilíbrio de Berg ───────────────────────────────────────────
  // Aplicada pelo profissional. 14 tarefas de 0 a 4, total 0–56.
  berg: {
    options: BERG_0_4,
    items: [
      { id: 'q1',  label: '1. Posição sentada para posição em pé' },
      { id: 'q2',  label: '2. Permanecer em pé sem apoio' },
      { id: 'q3',  label: '3. Permanecer sentado sem apoio nas costas, com os pés apoiados' },
      { id: 'q4',  label: '4. Posição em pé para posição sentada' },
      { id: 'q5',  label: '5. Transferências (cadeira para cadeira)' },
      { id: 'q6',  label: '6. Permanecer em pé sem apoio com os olhos fechados' },
      { id: 'q7',  label: '7. Permanecer em pé sem apoio com os pés juntos' },
      { id: 'q8',  label: '8. Alcançar à frente com o braço estendido, permanecendo em pé' },
      { id: 'q9',  label: '9. Pegar um objeto do chão a partir da posição em pé' },
      { id: 'q10', label: '10. Virar-se e olhar para trás sobre os ombros direito e esquerdo' },
      { id: 'q11', label: '11. Girar 360 graus' },
      { id: 'q12', label: '12. Posicionar os pés alternadamente no degrau ou banquinho' },
      { id: 'q13', label: '13. Permanecer em pé sem apoio com um pé à frente' },
      { id: 'q14', label: '14. Permanecer em pé sobre uma perna' },
    ],
    thresholds: [
      { max: 20, label: 'Alto risco de queda',     color: 'text-red-700 bg-red-50' },
      { max: 40, label: 'Risco moderado de queda', color: 'text-orange-700 bg-orange-50' },
      { max: 56, label: 'Baixo risco de queda',    color: 'text-emerald-700 bg-emerald-50' },
    ],
    note: 'Cada tarefa tem critérios próprios de pontuação (tempo de sustentação, necessidade de apoio, supervisão). Consulte o protocolo completo ao pontuar — as opções aqui são o resumo dos níveis, não os descritores integrais.',
  },
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

export function getThresholdLevel(score: number, thresholds: ScoreLevel[]): ScoreLevel {
  return thresholds.find(t => score <= t.max) ?? thresholds[thresholds.length - 1]
}

export function calcScaleScore(
  instrumentId: string,
  answers: Record<string, string>,
): { score: number | null; scoreDetails: string | null } {
  const config = SCALE_CONFIGS[instrumentId]
  if (!config) return { score: null, scoreDetails: null }

  const invertedSet = new Set(config.invertedItems ?? [])
  const maxOptionValue = Math.max(...config.options.map(o => o.value))

  function getValue(itemId: string): number {
    const item = config.items.find(i => i.id === itemId)
    const raw = parseInt(answers[itemId] ?? '0', 10) || 0
    if (invertedSet.has(itemId)) {
      const itemMax = item?.options ? Math.max(...item.options.map(o => o.value)) : maxOptionValue
      return itemMax - raw
    }
    return raw
  }

  if (config.subscales) {
    const details: Record<string, number> = {}
    let total = 0
    for (const sub of config.subscales) {
      const raw = sub.itemIds.reduce((sum, id) => sum + getValue(id), 0)
      const adjusted = raw * (sub.multiplier ?? 1)
      details[sub.id] = adjusted
      total += adjusted
    }
    return { score: total, scoreDetails: JSON.stringify(details) }
  }

  const total = config.items.reduce((sum, item) => sum + getValue(item.id), 0)
  return { score: total, scoreDetails: null }
}

export function getCriticalResponses(
  instrumentId: string,
  answers: Record<string, string> | null | undefined,
): Array<{ label: string; note: string; value: number }> {
  const config = SCALE_CONFIGS[instrumentId]
  if (!config?.criticalItems || !answers) return []

  return config.criticalItems
    .map(item => ({
      label: item.label,
      note: item.note,
      value: parseInt(answers[item.itemId] ?? '0', 10) || 0,
      minValue: item.minValue,
    }))
    .filter(item => item.value >= item.minValue)
    .map(item => ({ label: item.label, note: item.note, value: item.value }))
}

export type ScaleInterpretation = {
  score: number
  level?: ScoreLevel
  note?: string
  critical: Array<{ label: string; note: string; value: number }>
  subscales: Array<{
    id: string
    label: string
    score: number
    level: ScoreLevel
  }>
}

export function interpretScaleResult(
  instrumentId: string,
  score: number | null | undefined,
  scoreDetails: string | null | undefined,
  answers: Record<string, string> | null | undefined,
): ScaleInterpretation | null {
  const config = SCALE_CONFIGS[instrumentId]
  if (!config || score == null) return null

  let details: Record<string, number> = {}
  if (scoreDetails) {
    try { details = JSON.parse(scoreDetails) } catch { details = {} }
  }

  return {
    score,
    level: config.thresholds ? getThresholdLevel(score, config.thresholds) : undefined,
    note: config.note,
    critical: getCriticalResponses(instrumentId, answers),
    subscales: (config.subscales ?? []).map(sub => {
      const subScore = details[sub.id] ?? 0
      return {
        id: sub.id,
        label: sub.label,
        score: subScore,
        level: getThresholdLevel(subScore, sub.thresholds),
      }
    }),
  }
}
