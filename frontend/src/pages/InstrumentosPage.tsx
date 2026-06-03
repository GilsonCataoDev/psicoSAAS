import { useState, useMemo } from 'react'
import {
  Search, Download, X,
  ClipboardList, Baby, Target, FileSignature, MessageSquare,
  HeartPulse, Activity, BarChart3, ShieldAlert,
  PenLine, Smile, Moon, Gauge, Compass, Users, Brain,
  AlertCircle, Globe, Sun, ListChecks, Zap, TrendingUp, Award, Flame, Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'

// ── Tipos ────────────────────────────────────────────────────────────────────

type InstrumentCategory = 'formulario' | 'escala' | 'registro' | 'entrevista'
type AgeGroup = 'all' | 'infantil' | 'adolescente' | 'adulto'

interface Instrument {
  id: string
  title: string
  description: string
  category: InstrumentCategory
  tags: string[]
  ageGroups: AgeGroup[]
  template: string
  Icon: LucideIcon
}

// ── Metadados de categoria ────────────────────────────────────────────────────

const CAT_LABEL: Record<InstrumentCategory, string> = {
  formulario:  'Formulário',
  escala:      'Escala',
  registro:    'Registro',
  entrevista:  'Entrevista',
}

const CAT_COLOR: Record<InstrumentCategory, string> = {
  formulario:  'bg-sage-100 text-sage-700',
  escala:      'bg-violet-100 text-violet-700',
  registro:    'bg-amber-100 text-amber-700',
  entrevista:  'bg-sky-100 text-sky-700',
}

const CARD_ACCENTS = [
  'bg-sage-50 text-sage-600 ring-sage-200',
  'bg-violet-50 text-violet-600 ring-violet-200',
  'bg-sky-50 text-sky-600 ring-sky-200',
  'bg-amber-50 text-amber-600 ring-amber-200',
  'bg-rose-50 text-rose-600 ring-rose-200',
  'bg-teal-50 text-teal-600 ring-teal-200',
  'bg-indigo-50 text-indigo-600 ring-indigo-200',
  'bg-orange-50 text-orange-600 ring-orange-200',
]

// ── Biblioteca de instrumentos ───────────────────────────────────────────────

const INSTRUMENTS: Instrument[] = [
  {
    id: 'anamnese-adulto',
    title: 'Anamnese Psicológica — Adulto',
    description: 'Levantamento inicial completo: queixa, história de vida, saúde, vínculos e objetivos terapêuticos.',
    category: 'formulario',
    tags: ['anamnese', 'avaliação inicial', 'adulto'],
    ageGroups: ['adulto'],
    Icon: ClipboardList,
    template: `ANAMNESE PSICOLÓGICA — ADULTO

IDENTIFICAÇÃO
Nome completo:
Data de nascimento:
Idade:
Sexo/Gênero:
Estado civil:
Profissão/Ocupação:
Escolaridade:
Telefone:
E-mail:
Como nos conheceu:

QUEIXA PRINCIPAL
Queixa principal (nas próprias palavras):
Há quanto tempo o problema existe:
O que motivou buscar ajuda agora:

HISTÓRIA DO PROBLEMA
Início e evolução:
Situações ou eventos associados:
Fatores que pioram ou aliviam:
Tentativas anteriores de resolução:

HISTÓRIA DE VIDA
Infância e adolescência relevantes:
Relacionamentos afetivos:
Vida profissional:
Rede de apoio:

SAÚDE
Problemas de saúde atuais:
Medicamentos em uso:
Uso de álcool, tabaco ou substâncias:
Histórico de internações:

HISTÓRICO PSICOLÓGICO
Acompanhamentos anteriores:
Tratamentos psiquiátricos:
Medicação psiquiátrica:
Histórico familiar de transtornos mentais:

OBJETIVOS
O que espera do processo terapêutico:
Objetivos para o acompanhamento:
Observações iniciais do(a) profissional:`,
  },
  {
    id: 'anamnese-infantil',
    title: 'Anamnese Psicológica — Infantil e Adolescente',
    description: 'Levantamento com responsável: desenvolvimento, contexto familiar, escola e histórico de saúde.',
    category: 'formulario',
    tags: ['anamnese', 'infantil', 'adolescente', 'avaliação inicial'],
    ageGroups: ['infantil', 'adolescente'],
    Icon: Baby,
    template: `ANAMNESE INFANTIL E ADOLESCENTE

IDENTIFICAÇÃO
Nome da criança/adolescente:
Data de nascimento:
Idade:
Sexo/Gênero:
Série/Escola:
Nome do responsável:
Parentesco:
Telefone do responsável:
Como foi encaminhado(a):

QUEIXA PRINCIPAL
Queixa relatada pelo responsável:
Queixa do próprio paciente (quando aplicável):
Há quanto tempo o problema existe:

HISTÓRIA DO DESENVOLVIMENTO
Gestação e parto:
Marcos de desenvolvimento (fala, marcha, controle esfincteriano):
Histórico escolar e rendimento:
Relacionamento com pares:

CONTEXTO FAMILIAR
Composição familiar:
Dinâmica e relacionamentos familiares:
Eventos significativos na família:
Responsáveis principais pelo cuidado:

SAÚDE
Problemas de saúde atuais:
Medicamentos em uso:
Alergias:
Sono, alimentação e rotina:

ACOMPANHAMENTOS ANTERIORES
Psicológico:
Fonoaudiológico:
Neurológico/Psiquiátrico:
Outros:

OBJETIVOS
Expectativas do responsável:
Expectativas do paciente (quando aplicável):
Observações iniciais do(a) profissional:`,
  },
  {
    id: 'evolucao-sessao',
    title: 'Evolução de Sessão',
    description: 'Registro clínico da sessão: demanda trabalhada, intervenções, resposta observada e próximos passos.',
    category: 'formulario',
    tags: ['evolução', 'prontuário', 'registro clínico'],
    ageGroups: ['all'],
    Icon: PenLine,
    template: `EVOLUÇÃO DE SESSÃO

Data:
Pessoa atendida:
Número da sessão:

DEMANDA TRABALHADA
Conteúdo principal abordado na sessão:

INTERVENÇÕES REALIZADAS
Técnicas e intervenções utilizadas:

RESPOSTA OBSERVADA
Como o(a) paciente respondeu às intervenções:
Afeto observado:

COMBINADOS E ORIENTAÇÕES
Tarefas ou combinados para a próxima semana:

PONTOS PARA ACOMPANHAMENTO
Temas a retomar:

PRÓXIMA SESSÃO
Data prevista:
Foco para a próxima sessão:

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'plano-terapeutico',
    title: 'Plano Terapêutico Individual',
    description: 'Hipóteses clínicas, objetivos, frequência, estratégias e indicadores de progresso.',
    category: 'formulario',
    tags: ['planejamento', 'objetivos', 'hipóteses clínicas'],
    ageGroups: ['all'],
    Icon: Target,
    template: `PLANO TERAPÊUTICO INDIVIDUAL

Data de elaboração:
Revisão prevista para:

DEMANDA INICIAL
Queixa principal:
Contexto relevante:

HIPÓTESES CLÍNICAS INICIAIS
Hipóteses diagnósticas (descritivas):
Fatores de manutenção identificados:

OBJETIVOS TERAPÊUTICOS
Objetivo geral:
Objetivos específicos:

FREQUÊNCIA E MODALIDADE
Frequência proposta:
Duração estimada do processo:
Modalidade (presencial/online):

ABORDAGEM E ESTRATÉGIAS
Referencial teórico:
Estratégias e técnicas planejadas:

INDICADORES DE PROGRESSO
Como será avaliado o progresso:
Critérios de alta ou revisão:

CUIDADOS ÉTICOS E DE SIGILO
Observações éticas específicas do caso:

OBSERVAÇÕES:`,
  },
  {
    id: 'contrato-terapeutico',
    title: 'Contrato Terapêutico / Combinados',
    description: 'Honorários, faltas, cancelamento, sigilo, comunicação, emergências e proteção de dados.',
    category: 'formulario',
    tags: ['contrato', 'ética', 'sigilo', 'LGPD'],
    ageGroups: ['all'],
    Icon: FileSignature,
    template: `CONTRATO TERAPÊUTICO / COMBINADOS

Data:
Profissional responsável:
Pessoa atendida:

FREQUÊNCIA E DURAÇÃO
Frequência das sessões:
Duração de cada sessão:
Local/modalidade:

HONORÁRIOS E PAGAMENTO
Valor por sessão:
Forma de pagamento:
Data limite de pagamento:

FALTAS E CANCELAMENTOS
Política de cancelamento:
Prazo mínimo para cancelamento sem cobrança:
Faltas consecutivas e encerramento do processo:

COMUNICAÇÃO
Canais de comunicação disponíveis:
Horários de atendimento para contato:
Urgências e emergências:

SIGILO PROFISSIONAL
Limites do sigilo (exceções legais/éticas):
Situações de risco iminente:

PROTEÇÃO DE DADOS (LGPD)
Uso e armazenamento de dados pessoais:
Direito de acesso e exclusão de dados:

ACEITE
Concordância da pessoa atendida ou responsável:
Assinatura/data:`,
  },
  {
    id: 'triagem-inicial',
    title: 'Entrevista de Triagem Inicial',
    description: 'Avaliação breve de demanda, urgência, risco, disponibilidade e adequação ao atendimento.',
    category: 'entrevista',
    tags: ['triagem', 'avaliação inicial', 'risco'],
    ageGroups: ['all'],
    Icon: MessageSquare,
    template: `ENTREVISTA DE TRIAGEM INICIAL

Data da triagem:
Forma de contato inicial:
Encaminhamento (se houver):

DEMANDA RELATADA
Descrição breve do motivo de busca:
Urgência percebida:
Expectativas em relação ao atendimento:

HISTÓRICO BREVÊ
Acompanhamentos psicológicos/psiquiátricos anteriores:
Medicação psiquiátrica atual:
Internações psiquiátricas:

RASTREIO DE RISCO
Ideação suicida ou autolesão atual:
Plano ou tentativas prévias:
Outros riscos identificados:

DISPONIBILIDADE E LOGÍSTICA
Frequência desejada:
Modalidade preferida:
Preferência de horário:
Forma de pagamento:

DECISÃO DE TRIAGEM
Atendimento regular:
Encaminhamento para:
Retorno agendado para:
Observações:`,
  },
  {
    id: 'entrevista-motivacional',
    title: 'Entrevista Motivacional',
    description: 'Exploração da ambivalência, estágio de mudança, importância, confiança e próximos passos.',
    category: 'entrevista',
    tags: ['motivação', 'mudança', 'ambivalência', 'EM'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: Compass,
    template: `ENTREVISTA MOTIVACIONAL

ESTÁGIO DE MUDANÇA
Pré-contemplação (não reconhece o problema):
Contemplação (ambivalente quanto à mudança):
Preparação (decidido a mudar em breve):
Ação (em processo de mudança):
Manutenção (sustentando a mudança):

EXPLORAÇÃO DA AMBIVALÊNCIA
O que te preocupa na situação atual:
O que seria diferente se a mudança ocorresse:
Prós da mudança:
Contras ou medos em relação à mudança:

IMPORTÂNCIA DA MUDANÇA
O quanto é importante mudar? (0 a 10):
Por que essa nota e não menor:
O que tornaria essa nota maior:

CONFIANÇA NA MUDANÇA
O quanto confia em conseguir mudar? (0 a 10):
O que aumentaria essa confiança:
Recursos e apoios disponíveis:

METAS E PRÓXIMOS PASSOS
Meta principal identificada:
Próximos passos concretos:
Possíveis obstáculos:
Estratégias para superar obstáculos:

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'phq9',
    title: 'PHQ-9 — Rastreio de Depressão',
    description: 'Escala de 9 itens para rastreio de depressão. Uso clínico livre — não substitui diagnóstico.',
    category: 'escala',
    tags: ['depressão', 'rastreio', 'PHQ-9'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: Brain,
    template: `PHQ-9 — RASTREIO DE DEPRESSÃO

Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos seguintes problemas?
(0 = Nenhuma vez | 1 = Vários dias | 2 = Mais da metade dos dias | 3 = Quase todos os dias)

Pouco interesse ou prazer em fazer as coisas:
Sentir-se para baixo, deprimido(a) ou sem esperança:
Dificuldade para adormecer, permanecer dormindo ou dormir demais:
Sentir-se cansado(a) ou com pouca energia:
Falta de apetite ou comer em excesso:
Sentir-se mal consigo mesmo(a) ou que é um fracasso:
Dificuldade de concentrar-se em coisas como ler ou assistir TV:
Mover-se ou falar tão lentamente que outras pessoas perceberam:
Pensamentos de que seria melhor estar morto(a) ou de se machucar:

PONTUAÇÃO TOTAL:
INTERPRETAÇÃO:
(0–4: Mínimo | 5–9: Leve | 10–14: Moderado | 15–19: Moderadamente grave | 20–27: Grave)

DIFICULDADE FUNCIONAL:
Se marcou algum problema, eles dificultaram seu trabalho, cuidados domésticos ou relacionamentos?

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'gad7',
    title: 'GAD-7 — Transtorno de Ansiedade Generalizada',
    description: 'Escala de 7 itens para rastreio de ansiedade generalizada. Uso clínico livre.',
    category: 'escala',
    tags: ['ansiedade', 'rastreio', 'GAD-7'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: Activity,
    template: `GAD-7 — TRANSTORNO DE ANSIEDADE GENERALIZADA

Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos seguintes problemas?
(0 = Nenhuma vez | 1 = Vários dias | 2 = Mais da metade dos dias | 3 = Quase todos os dias)

Sentir-se nervoso(a), ansioso(a) ou no limite:
Não ser capaz de parar ou controlar a preocupação:
Preocupar-se muito com coisas diferentes:
Dificuldade para relaxar:
Ficar tão agitado(a) que é difícil ficar parado(a):
Sentir-se facilmente irritado(a) ou irritável:
Sentir medo como se algo horrível pudesse acontecer:

PONTUAÇÃO TOTAL:
INTERPRETAÇÃO:
(0–4: Mínimo | 5–9: Leve | 10–14: Moderado | 15–21: Grave)

DIFICULDADE FUNCIONAL:
Se marcou algum problema, eles dificultaram suas atividades diárias?

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'dass21',
    title: 'DASS-21 — Depressão, Ansiedade e Estresse',
    description: 'Versão abreviada da escala DASS para rastreio em três subescalas. Uso clínico livre.',
    category: 'escala',
    tags: ['depressão', 'ansiedade', 'estresse', 'DASS-21'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: BarChart3,
    template: `DASS-21 — DEPRESSÃO, ANSIEDADE E ESTRESSE

Na semana passada, em que medida cada afirmação se aplicou a você?
(0 = Não se aplicou | 1 = Às vezes | 2 = Bastante | 3 = Muito/quase sempre)

SUBESCALA DE DEPRESSÃO
Não consegui sentir nenhum sentimento positivo:
Senti falta de iniciativa para fazer as coisas:
Senti que a vida não tinha sentido:
Senti-me triste e deprimido(a):
Não consegui entusiasmar-me com nada:
Senti que não tinha valor:

SUBESCALA DE ANSIEDADE
Senti minha boca seca:
Senti dificuldade em respirar sem ter feito esforço:
Tive tremores:
Senti que estava prestes a entrar em pânico:
Senti o coração acelerado sem fazer esforço:
Senti medo sem razão aparente:

SUBESCALA DE ESTRESSE
Fiquei perturbado(a) por coisas sem importância:
Senti dificuldade em relaxar:
Fui difícil de me acalmar após algo perturbador:
Fiquei impaciente quando algo me impediu:
Senti-me irritável:
Senti que estava muito agitado(a):

PONTUAÇÕES (multiplicar cada subescala por 2):
Depressão:
Ansiedade:
Estresse:

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'rastreio-risco',
    title: 'Rastreio de Risco Suicida',
    description: 'Avaliação de ideação, histórico, fatores de risco e proteção, e conduta do profissional.',
    category: 'formulario',
    tags: ['risco', 'suicídio', 'segurança', 'urgência'],
    ageGroups: ['all'],
    Icon: ShieldAlert,
    template: `RASTREIO DE RISCO SUICIDA

Data da avaliação:

IDEAÇÃO SUICIDA
Pensamentos de morte ou de que seria melhor estar morto(a):
Ideação suicida passiva (desejar morrer):
Ideação suicida ativa sem plano:
Ideação suicida com plano:
Intenção de agir:

HISTÓRICO
Tentativas prévias de suicídio:
Número e gravidade das tentativas:
Comportamento autolesivo sem intenção suicida:

FATORES DE RISCO
Desesperança:
Impulsividade:
Abuso de substâncias:
Isolamento social:
Eventos de vida adversos recentes:
Acesso a meios letais:

FATORES DE PROTEÇÃO
Vínculos afetivos:
Razões para viver:
Religiosidade/espiritualidade:
Plano de segurança existente:

CONDUTA DO(A) PROFISSIONAL
Nível de risco (baixo / médio / alto / iminente):
Conduta adotada:
Encaminhamentos realizados:
Plano de segurança elaborado:
Próxima avaliação:`,
  },
  {
    id: 'bai-adaptado',
    title: 'Inventário de Ansiedade — Adaptado',
    description: 'Lista de sintomas físicos e cognitivos de ansiedade com escala de intensidade de 4 pontos.',
    category: 'escala',
    tags: ['ansiedade', 'sintomas', 'BAI'],
    ageGroups: ['adulto'],
    Icon: HeartPulse,
    template: `INVENTÁRIO DE ANSIEDADE — ADAPTADO

Na semana passada, com que intensidade você foi incomodado(a) pelos seguintes sintomas?
(0 = Absolutamente não | 1 = Levemente | 2 = Moderadamente | 3 = Gravemente)

Dormência ou formigamento:
Sensação de calor:
Tremores nas pernas:
Incapaz de relaxar:
Medo de que aconteça o pior:
Tontura ou atordoamento:
Palpitações ou coração acelerado:
Desequilíbrio:
Aterrorizado(a):
Nervoso(a):
Sensação de sufocamento:
Mãos tremendo:
Instável:
Medo de perder o controle:
Dificuldade de respirar:
Medo de morrer:
Assustado(a):
Desconforto abdominal:
Rubor facial:
Suando sem ser de calor:

PONTUAÇÃO TOTAL:
INTERPRETAÇÃO:
(0–7: Mínimo | 8–15: Leve | 16–25: Moderado | 26–63: Grave)

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'registro-pensamentos',
    title: 'Registro de Pensamentos Automáticos',
    description: 'Técnica de TCC para identificar situação, emoção, pensamento automático e alternativas.',
    category: 'registro',
    tags: ['TCC', 'pensamentos automáticos', 'cognição'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: Brain,
    template: `REGISTRO DE PENSAMENTOS AUTOMÁTICOS

Data:

SITUAÇÃO
Descreva o evento, pensamento ou memória que desencadeou o estado emocional negativo:

EMOÇÕES
Quais emoções você sentiu? (Liste e avalie intensidade de 0 a 100%):

PENSAMENTOS AUTOMÁTICOS
Quais pensamentos passaram pela sua cabeça:
Qual é o pensamento mais perturbador:
Quanto você acredita nesse pensamento? (0 a 100%):

EVIDÊNCIAS A FAVOR
O que sustenta esse pensamento como verdadeiro:

EVIDÊNCIAS CONTRA
O que contradiz esse pensamento. O que um amigo próximo diria:

PENSAMENTO ALTERNATIVO
Um pensamento mais equilibrado e realista seria:
Quanto você acredita nesse pensamento alternativo? (0 a 100%):

RESULTADO
Emoções após a reestruturação e intensidades:
O que você vai fazer como resultado desta análise:`,
  },
  {
    id: 'diario-humor',
    title: 'Diário de Humor Semanal',
    description: 'Autorregistro diário de humor, sono, eventos significativos e padrões semanais.',
    category: 'registro',
    tags: ['humor', 'autorregistro', 'monitoramento'],
    ageGroups: ['all'],
    Icon: Smile,
    template: `DIÁRIO DE HUMOR SEMANAL

Semana de:

SEGUNDA-FEIRA
Humor geral (0–10):
Eventos significativos:
Sono (horas e qualidade):
Observações:

TERÇA-FEIRA
Humor geral (0–10):
Eventos significativos:
Sono:
Observações:

QUARTA-FEIRA
Humor geral (0–10):
Eventos significativos:
Sono:
Observações:

QUINTA-FEIRA
Humor geral (0–10):
Eventos significativos:
Sono:
Observações:

SEXTA-FEIRA
Humor geral (0–10):
Eventos significativos:
Sono:
Observações:

FINAL DE SEMANA
Humor geral (0–10):
Eventos significativos:
Sono:
Observações:

REFLEXÃO DA SEMANA
O que foi mais desafiador esta semana:
O que foi positivo:
Padrões que percebi:`,
  },
  {
    id: 'rastreio-sono',
    title: 'Rastreio de Sono',
    description: 'Avaliação do padrão de sono, comportamentos associados e impacto funcional.',
    category: 'registro',
    tags: ['sono', 'insônia', 'higiene do sono'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: Moon,
    template: `RASTREIO DE SONO

Período avaliado:

PADRÃO DE SONO ATUAL
Horário habitual de deitar:
Horário habitual de acordar:
Duração média do sono:
Vezes que acorda durante a noite:
Dificuldade para adormecer (0 a 10):
Qualidade subjetiva do sono (0 a 10):

COMPORTAMENTOS RELACIONADOS AO SONO
Uso de telas antes de dormir:
Consumo de cafeína (quantidade e horário):
Atividade física (frequência e horário):
Cochilos durante o dia:
Uso de álcool ou medicamentos para dormir:

IMPACTO DO SONO
Sonolência diurna (0 a 10):
Impacto na concentração:
Impacto no humor:
Impacto na produtividade:

SINTOMAS ESPECÍFICOS
Ronco relatado:
Apneia suspeitada:
Pesadelos ou terrores noturnos:
Sonambulismo:

HISTÓRICO
Início do problema de sono:
Eventos associados ao início:
Tratamentos anteriores para o sono:

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'funcionalidade',
    title: 'Avaliação de Funcionalidade Global',
    description: 'Avaliação do funcionamento em trabalho, relacionamentos, autocuidado e autonomia.',
    category: 'formulario',
    tags: ['funcionalidade', 'AVD', 'qualidade de vida'],
    ageGroups: ['adulto'],
    Icon: Gauge,
    template: `AVALIAÇÃO DE FUNCIONALIDADE GLOBAL

Data:
Período avaliado:

TRABALHO / ESTUDOS
Produtividade (0 a 10):
Concentração e memória (0 a 10):
Relacionamento com colegas (0 a 10):
Cumprimento de responsabilidades (0 a 10):
Observações:

RELACIONAMENTOS PESSOAIS
Qualidade dos relacionamentos íntimos (0 a 10):
Relações familiares (0 a 10):
Relações sociais (0 a 10):
Isolamento social (0 = nenhum | 10 = total):
Observações:

AUTOCUIDADO
Higiene e cuidados pessoais (0 a 10):
Alimentação (0 a 10):
Sono (0 a 10):
Atividade física (0 a 10):
Lazer e atividades prazerosas (0 a 10):

AUTONOMIA
Realiza atividades domésticas:
Gerencia finanças pessoais:
Sai de casa sozinho(a):
Usa transporte público:

AVALIAÇÃO GLOBAL DE FUNCIONAMENTO
Pontuação AGF estimada (0–100):
Justificativa:

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  // ── INSTRUMENTOS VALIDADOS ───────────────────────────────────────────────────

  {
    id: 'pcl5',
    title: 'PCL-5 — Rastreio de TEPT',
    description: 'Lista de verificação de TEPT para o DSM-5 (20 itens). Domínio público — National Center for PTSD.',
    category: 'escala',
    tags: ['TEPT', 'trauma', 'estresse pós-traumático', 'PCL-5'],
    ageGroups: ['adulto'],
    Icon: AlertCircle,
    template: `PCL-5 — LISTA DE VERIFICAÇÃO DE TEPT (DSM-5)

Nas últimas 4 semanas, com que intensidade você foi incomodado pelos seguintes problemas
relacionados a uma experiência estressante ou perturbadora?
(0 = Nem um pouco | 1 = Um pouco | 2 = Moderadamente | 3 = Muito | 4 = Extremamente)

REEXPERIÊNCIA
Memórias repetidas, perturbadoras ou indesejadas da experiência:
Sonhos perturbadores sobre a experiência:
Sentir ou agir como se a experiência estivesse acontecendo de novo:
Sentir-se muito perturbado quando algo lembra a experiência:
Reações físicas intensas quando algo lembra a experiência (palpitações, falta de ar):

ESQUIVA
Evitar memórias, pensamentos ou sentimentos ligados à experiência:
Evitar lembretes externos (pessoas, lugares, conversas, objetos) relacionados:

COGNIÇÕES/HUMOR NEGATIVO
Dificuldade de lembrar partes importantes da experiência:
Crenças negativas fortes sobre si mesmo, os outros ou o mundo:
Culpar-se fortemente pela experiência ou pelo que aconteceu depois:
Sentimentos negativos intensos (medo, horror, raiva, culpa, vergonha):
Perda de interesse em atividades que antes eram prazerosas:
Sentir-se distante ou afastado das outras pessoas:
Dificuldade de sentir emoções positivas (felicidade, amor):

HIPERATIVAÇÃO
Comportamento irritável, crises de raiva ou agir de forma agressiva:
Assumir riscos ou fazer coisas prejudiciais sem necessidade:
Estar superalerta, vigilante ou "de guarda":
Sentir-se agitado(a) ou sobressaltar-se facilmente:
Dificuldade de concentração:
Dificuldade para adormecer ou permanecer dormindo:

PONTUAÇÃO TOTAL (0–80):
INTERPRETAÇÃO:
(0–10: improvável TEPT | 11–20: leve | 21–45: moderado | >45: grave)

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'srq20',
    title: 'SRQ-20 — Rastreio de Transtornos Mentais Comuns',
    description: 'Questionário de autorrelato da OMS para rastreio de TMC em atenção primária. Domínio público.',
    category: 'escala',
    tags: ['TMC', 'rastreio', 'saúde mental', 'SRQ-20', 'OMS'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: ListChecks,
    template: `SRQ-20 — RASTREIO DE TRANSTORNOS MENTAIS COMUNS

Nos últimos 30 dias: (Sim / Não)

1. Você tem dores de cabeça com frequência?
2. Tem falta de apetite?
3. Dorme mal?
4. Assusta-se com facilidade?
5. Tem tremores nas mãos?
6. Sente-se nervoso(a), tenso(a) ou preocupado(a)?
7. Tem má digestão?
8. Tem dificuldade de pensar com clareza?
9. Tem se sentido triste ultimamente?
10. Tem chorado mais do que de costume?
11. Encontra dificuldade para realizar com satisfação suas atividades diárias?
12. Tem dificuldade para tomar decisões?
13. O seu trabalho diário lhe causa sofrimento?
14. É incapaz de desempenhar um papel útil em sua vida?
15. Tem perdido o interesse pelas coisas?
16. Você se sente uma pessoa inútil, sem préstimo?
17. Tem tido a ideia de acabar com a vida?
18. Sente-se cansado(a) o tempo todo?
19. Tem sensações desagradáveis no estômago?
20. Você se cansa com facilidade?

CONTAGEM DE RESPOSTAS "SIM":
INTERPRETAÇÃO:
(0–7: baixa probabilidade de TMC | ≥8: provável transtorno mental comum)

⚠ O item 17 exige avaliação imediata de risco suicida, independentemente da pontuação total.

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'isi',
    title: 'ISI — Índice de Gravidade da Insônia',
    description: 'Escala de 7 itens para avaliação da gravidade da insônia. Autor: Charles M. Morin. Domínio público.',
    category: 'escala',
    tags: ['insônia', 'sono', 'ISI', 'gravidade'],
    ageGroups: ['adulto'],
    Icon: Moon,
    template: `ISI — ÍNDICE DE GRAVIDADE DA INSÔNIA

Avalie a GRAVIDADE dos seguintes problemas de sono:
(0 = Sem problema | 1 = Leve | 2 = Moderado | 3 = Grave | 4 = Muito grave)

Dificuldade para adormecer:
Dificuldade para permanecer dormindo:
Problema de acordar muito cedo:

Avalie sua SATISFAÇÃO com o padrão atual de sono:
(0 = Muito satisfeito | 1 = Satisfeito | 2 = Neutro | 3 = Insatisfeito | 4 = Muito insatisfeito)
Satisfação com o sono atual:

Avalie em que medida o problema de sono INTERFERE no funcionamento diário:
(0 = Nenhuma interferência | 4 = Interferência muito grave)
Interferência no funcionamento diurno (fadiga, humor, desempenho, atenção):
Quanto o problema de sono é PERCEPTÍVEL para os outros (afeta qualidade de vida):
PREOCUPAÇÃO/sofrimento causado pelo problema de sono:

PONTUAÇÃO TOTAL (0–28):
INTERPRETAÇÃO:
(0–7: sem insônia clinicamente significativa | 8–14: insônia subclínica | 15–21: insônia moderada | 22–28: insônia grave)

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'ess',
    title: 'ESS — Escala de Sonolência de Epworth',
    description: 'Escala de 8 itens para avaliar sonolência diurna excessiva. Autor: Murray Johns. Domínio público.',
    category: 'escala',
    tags: ['sonolência', 'sono', 'ESS', 'Epworth'],
    ageGroups: ['adulto'],
    Icon: Sun,
    template: `ESS — ESCALA DE SONOLÊNCIA DE EPWORTH

Com que frequência você cochilaria ou adormeceria nas seguintes situações?
(0 = Nunca | 1 = Pequena chance | 2 = Chance moderada | 3 = Alta chance)

Sentado(a) e lendo:
Assistindo à televisão:
Sentado(a), inativo(a) em local público (sala de espera, teatro, reunião):
Como passageiro de carro por 1 hora sem parar:
Deitando para descansar à tarde quando as circunstâncias permitem:
Sentado(a) e conversando com alguém:
Sentado(a) tranquilamente após o almoço sem álcool:
Em um carro, enquanto para por alguns minutos no trânsito:

PONTUAÇÃO TOTAL (0–24):
INTERPRETAÇÃO:
(0–5: normal | 6–10: sonolência leve | 11–15: sonolência moderada | >15: sonolência grave / excessiva)

Sonolência ≥10 pontos recomenda avaliação de apneia do sono e outros distúrbios.

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'audit',
    title: 'AUDIT — Uso de Álcool',
    description: 'Teste de identificação de transtornos por uso de álcool (10 itens). OMS. Domínio público.',
    category: 'escala',
    tags: ['álcool', 'AUDIT', 'dependência', 'OMS'],
    ageGroups: ['adulto'],
    Icon: Flame,
    template: `AUDIT — TESTE DE IDENTIFICAÇÃO DE TRANSTORNOS POR USO DE ÁLCOOL

PARTE A — Consumo de álcool

1. Com que frequência você toma bebida alcoólica?
(0=Nunca | 1=Mensalmente ou menos | 2=2–4x por mês | 3=2–3x por semana | 4=4+ vezes por semana)
Resposta:

2. Quantas doses de bebida alcoólica você toma num dia típico em que bebe?
(0=1–2 | 1=3–4 | 2=5–6 | 3=7–9 | 4=10 ou mais)
Resposta:

3. Com que frequência você toma 6 ou mais doses em uma única ocasião?
(0=Nunca | 1=Menos de 1x/mês | 2=Mensalmente | 3=Semanalmente | 4=Diariamente ou quase)
Resposta:

PARTE B — Sintomas de dependência

4. Com que frequência no último ano você não conseguiu parar de beber uma vez que havia começado?
(0=Nunca | 1=Menos de 1x/mês | 2=Mensalmente | 3=Semanalmente | 4=Diariamente)
Resposta:

5. Com que frequência no último ano deixou de fazer o que era esperado por causa da bebida?
Resposta:

6. Com que frequência no último ano precisou de uma dose de manhã para se sentir bem?
Resposta:

PARTE C — Uso nocivo de álcool

7. Com que frequência no último ano sentiu culpa ou remorso depois de beber?
Resposta:

8. Com que frequência não se lembrou do que aconteceu devido à bebida?
Resposta:

9. Você ou alguém se machucou porque você havia bebido?
(0=Não | 2=Sim, mas não no último ano | 4=Sim, no último ano)
Resposta:

10. Alguém (parente, médico) se preocupou com seu modo de beber ou sugeriu que parasse?
(0=Não | 2=Sim, mas não no último ano | 4=Sim, no último ano)
Resposta:

PONTUAÇÃO TOTAL (0–40):
INTERPRETAÇÃO:
(0–7: uso de baixo risco | 8–15: uso perigoso | 16–19: uso nocivo | ≥20: provável dependência)

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'cage',
    title: 'CAGE — Rastreio de Dependência de Álcool',
    description: 'Questionário breve de 4 itens para rastreio de dependência alcoólica. Autor: J. Ewing. Domínio público.',
    category: 'escala',
    tags: ['álcool', 'CAGE', 'dependência', 'rastreio rápido'],
    ageGroups: ['adulto'],
    Icon: Zap,
    template: `CAGE — RASTREIO DE DEPENDÊNCIA DE ÁLCOOL

Responda Sim ou Não às perguntas abaixo:

C — Cut down: Alguma vez você sentiu que deveria diminuir sua quantidade de bebida?
Resposta (Sim / Não):

A — Annoyed: As pessoas o(a) irritam ao criticar sua maneira de beber?
Resposta (Sim / Não):

G — Guilty: Você se sente mal ou culpado(a) por causa da sua bebida?
Resposta (Sim / Não):

E — Eye-opener: Você costuma beber de manhã para afastar o nervosismo ou a ressaca?
Resposta (Sim / Não):

PONTUAÇÃO (1 ponto por resposta "Sim"):
INTERPRETAÇÃO:
(0: sem dependência | 1: atenção para uso problemático | ≥2: provável dependência de álcool)

Sensibilidade ~88%, Especificidade ~83% para dependência alcoólica.

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'meem',
    title: 'MEEM — Mini-Exame do Estado Mental',
    description: 'Rastreio cognitivo global (30 pontos). Adaptação brasileira: Brucki et al. (2003). Domínio público.',
    category: 'escala',
    tags: ['cognitivo', 'MEEM', 'MMSE', 'demência', 'idosos'],
    ageGroups: ['adulto'],
    Icon: Brain,
    template: `MEEM — MINI-EXAME DO ESTADO MENTAL
Adaptação brasileira (Brucki et al., 2003)

ORIENTAÇÃO TEMPORAL (máx. 5 pontos)
Ano:                        (  /1)
Estação do ano:             (  /1)
Mês:                        (  /1)
Dia do mês:                 (  /1)
Dia da semana:              (  /1)

ORIENTAÇÃO ESPACIAL (máx. 5 pontos)
País:                       (  /1)
Estado:                     (  /1)
Cidade:                     (  /1)
Local (hospital/bairro):    (  /1)
Andar ou sala:              (  /1)

MEMÓRIA IMEDIATA — Repita: CARRO, VASO, TIJOLO (máx. 3 pontos)
Palavra 1:                  (  /1)
Palavra 2:                  (  /1)
Palavra 3:                  (  /1)

ATENÇÃO E CÁLCULO — Subtrair 7 de 100 (5 vezes) (máx. 5 pontos)
93:  (  /1)  |  86:  (  /1)  |  79:  (  /1)  |  72:  (  /1)  |  65:  (  /1)

EVOCAÇÃO — Repita as 3 palavras anteriores (máx. 3 pontos)
Palavra 1:                  (  /1)
Palavra 2:                  (  /1)
Palavra 3:                  (  /1)

LINGUAGEM E PRAXIA (máx. 9 pontos)
Nomeação (relógio + caneta):                (  /2)
Repetição: "Nem aqui, nem ali, nem lá":     (  /1)
Comando 3 estágios (pegar papel/dobrar/jogar): (  /3)
Leitura e obediência ("feche os olhos"):    (  /1)
Escrever uma frase com sentido:             (  /1)
Copiar pentágonos interseccionados:         (  /1)

PONTUAÇÃO TOTAL (0–30):
PONTO DE CORTE AJUSTADO POR ESCOLARIDADE:
(Analfabetos: 13 | Fundamental incompleto: 18 | Médio/Superior: 26)

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'whodas',
    title: 'WHODAS 2.0 — Avaliação de Funcionalidade (12 itens)',
    description: 'Escala da OMS para avaliação de funcionalidade e incapacidade em 6 domínios. Domínio público.',
    category: 'escala',
    tags: ['funcionalidade', 'WHODAS', 'OMS', 'CIF', 'incapacidade'],
    ageGroups: ['adulto'],
    Icon: Globe,
    template: `WHODAS 2.0 — AVALIAÇÃO DE FUNCIONALIDADE (12 itens)
Organização Mundial da Saúde — Domínio público

Nos últimos 30 dias, avalie o GRAU DE DIFICULDADE para:
(0 = Nenhuma | 1 = Leve | 2 = Moderada | 3 = Grave | 4 = Extrema/Não conseguiu)

COGNIÇÃO
1. Concentrar-se em fazer algo por 10 minutos?
   Escore:
2. Lembrar coisas importantes que precisava fazer?
   Escore:

MOBILIDADE
3. Andar por uma longa distância (1 km)?
   Escore:
4. Sair de casa?
   Escore:

AUTOCUIDADO
5. Tomar banho sozinho(a)?
   Escore:
6. Vestir-se sozinho(a)?
   Escore:

RELACIONAMENTOS
7. Lidar com pessoas que não conhece?
   Escore:
8. Manter uma amizade?
   Escore:

ATIVIDADES DE VIDA
9. Realizar suas atividades do lar?
   Escore:
10. Terminar tarefas importantes com rapidez?
    Escore:

PARTICIPAÇÃO SOCIAL
11. Quanto os seus problemas de saúde afetaram a sua vida?
    Escore:
12. Quanto a sua incapacidade causou problemas para sua família?
    Escore:

PONTUAÇÃO TOTAL (0–48):
(Converter para escala 0–100 se necessário: pontuação/48 × 100)
INTERPRETAÇÃO: quanto maior a pontuação, maior a incapacidade funcional.

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'sdq',
    title: 'SDQ — Capacidades e Dificuldades (4–17 anos)',
    description: 'Questionário de 25 itens para rastreio comportamental infantojuvenil. Autor: R. Goodman. Domínio público.',
    category: 'escala',
    tags: ['SDQ', 'infantil', 'adolescente', 'comportamento', 'rastreio'],
    ageGroups: ['infantil', 'adolescente'],
    Icon: Award,
    template: `SDQ — QUESTIONÁRIO DE CAPACIDADES E DIFICULDADES
Versão para pais — Robert Goodman (www.sdqinfo.org) — Domínio público

Para cada item: 0 = Não verdadeiro | 1 = Parcialmente verdadeiro | 2 = Completamente verdadeiro

SINTOMAS EMOCIONAIS (escore normal: 0–3)
1. Frequentemente se queixa de dores de cabeça, barriga ou vômitos:
2. Tem muitas preocupações, frequentemente parece preocupada(o):
3. Frequentemente parece infeliz, desanimada(o) ou chorosa(o):
4. Fica nervosa(o) em novas situações, facilmente perde a autoconfiança:
5. Tem muitos medos, assusta-se facilmente:
   Subtotal Sintomas Emocionais:

PROBLEMAS DE CONDUTA (escore normal: 0–2)
6. Frequentemente tem crises de raiva ou mau humor:
7. É geralmente obediente [INVERTIDO — 2=não verdadeiro vale 0]:
8. Frequentemente briga com outras crianças ou as intimida:
9. Frequentemente mente ou trapaceia:
10. Pega coisas que não são suas em casa, escola ou outros lugares:
    Subtotal Problemas de Conduta:

HIPERATIVIDADE/DESATENÇÃO (escore normal: 0–5)
11. Agitada(o), não consegue ficar parada(o) por muito tempo:
12. Fica se mexendo ou contorcendo constantemente:
13. Se distrai facilmente, não consegue se concentrar:
14. Pensa antes de agir [INVERTIDO]:
15. Termina o que começa, tem boa concentração [INVERTIDO]:
    Subtotal Hiperatividade:

PROBLEMAS COM COLEGAS (escore normal: 0–2)
16. Prefere ficar sozinha(o) a estar com outras crianças:
17. Tem pelo menos um bom amigo [INVERTIDO]:
18. Em geral as outras crianças gostam dela(e) [INVERTIDO]:
19. Outras crianças a(o) implicam ou intimidam:
20. Se dá melhor com adultos do que com crianças:
    Subtotal Problemas com Colegas:

COMPORTAMENTO PRÓ-SOCIAL (escore normal: 6–10)
21. Tem consideração pelos sentimentos dos outros:
22. Compartilha facilmente com outras crianças:
23. Tem bom comportamento com crianças mais novas:
24. Muitas vezes se oferece para ajudar os outros:
25. É gentil com crianças mais novas:
    Subtotal Pró-Social:

TOTAL DE DIFICULDADES (soma subescalas 1–4, máx. 40):
INTERPRETAÇÃO:
(0–13: normal | 14–16: limítrofe | 17–40: anormal)

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'gaf',
    title: 'GAF — Avaliação Global do Funcionamento',
    description: 'Escala de 0–100 do DSM-IV para avaliação do funcionamento psicossocial e ocupacional. Domínio público.',
    category: 'escala',
    tags: ['GAF', 'funcionamento', 'DSM', 'psicossocial'],
    ageGroups: ['all'],
    Icon: TrendingUp,
    template: `GAF — AVALIAÇÃO GLOBAL DO FUNCIONAMENTO (DSM-IV)

DATA DA AVALIAÇÃO:
PERÍODO AVALIADO: □ Atual   □ Melhor nível no último ano

Indique o nível de funcionamento psicológico, social e ocupacional numa escala hipotética
de saúde mental-doença. Não inclua comprometimento funcional por causas físicas ou ambientais.

ESCALA DE REFERÊNCIA:
100–91: Funcionamento superior. Sem sintomas.
90–81: Sintomas ausentes ou mínimos; boa funcionalidade.
80–71: Sintomas transitórios; comprometimento leve.
70–61: Sintomas leves; alguma dificuldade no funcionamento.
60–51: Sintomas moderados ou dificuldades moderadas no funcionamento.
50–41: Sintomas graves ou comprometimento grave.
40–31: Comprometimento em diversas áreas (trabalho, família, julgamento).
30–21: Comportamento influenciado por delírios/alucinações ou grave comprometimento na comunicação.
20–11: Perigo de machucar a si ou a outros, incapacidade de cuidar de si.
10–1: Risco persistente de violência grave ou incapacidade total.
0: Informação inadequada.

PONTUAÇÃO GAF ATUAL (0–100):
JUSTIFICATIVA CLÍNICA:

Sintomas predominantes:
Funcionamento no trabalho/estudos:
Funcionamento nos relacionamentos:
Autocuidado e vida diária:

PONTUAÇÃO GAF MELHOR NÍVEL (último ano):
OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'ies-r',
    title: 'IES-R — Impacto do Evento (Revisado)',
    description: 'Escala de 22 itens para avaliação de resposta ao trauma (intrusão, evitação, hiperexcitação). Domínio público.',
    category: 'escala',
    tags: ['trauma', 'TEPT', 'IES-R', 'impacto de evento'],
    ageGroups: ['adulto'],
    Icon: AlertCircle,
    template: `IES-R — ESCALA DE IMPACTO DO EVENTO (REVISADA)
Weiss & Marmar (1997) — Domínio público

A seguir estão reações que as pessoas têm depois de acontecimentos perturbadores na vida.
Pense no EVENTO ESPECÍFICO que avaliamos e avalie o quanto cada item o(a) perturbou
NOS ÚLTIMOS 7 DIAS.
(0 = Absolutamente não | 1 = Um pouco | 2 = Moderadamente | 3 = Bastante | 4 = Extremamente)

INTRUSÃO (8 itens)
1. Qualquer lembrete fez surgir pensamentos ou sentimentos sobre o evento:
2. Tive sonhos perturbadores sobre o evento:
3. Senti como se o evento estivesse acontecendo de novo:
4. Coisas do cotidiano me lembraram o evento:
5. Dificuldade em adormecer por causa de imagens ou pensamentos sobre o evento:
6. Ondas de sentimentos intensos em relação ao evento:
7. Imagens do evento apareceram em minha mente:
8. Outros lembretes do evento causaram reações físicas (sudorese, dificuldade para respirar):
   Subtotal Intrusão:

EVITAÇÃO (8 itens)
9. Tentei não falar sobre o evento:
10. Senti que era como se não tivesse acontecido ou como se não fosse real:
11. Tentei não pensar nele:
12. Percebi que ainda tenho muitos sentimentos a respeito, mas não os enfrentei:
13. Meus sentimentos em relação ao evento foram entorpecidos:
14. Tentei afastar o evento de minha memória:
15. Me senti deprimido(a) por causa do evento:
16. Tive sentimentos sobre ele, mas os mantive fora da minha consciência:
    Subtotal Evitação:

HIPEREXCITAÇÃO (6 itens)
17. Tive dificuldade para me concentrar:
18. Fiquei agitado(a) e irritado(a):
19. Fiquei alerta e vigilante:
20. Fiquei sobressaltado(a) facilmente:
21. Tive dificuldade em me concentrar:
22. Tive reações físicas ao lembrar do evento:
    Subtotal Hiperexcitação:

PONTUAÇÃO TOTAL (0–88):
INTERPRETAÇÃO:
(0–8: leve | 9–25: moderado | 26–43: alto | >44: muito alto — sugestivo de TEPT)

EVENTO AVALIADO:
OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'cssrs-simplificado',
    title: 'C-SSRS — Avaliação de Risco Suicida (Columbia)',
    description: 'Versão simplificada da escala Columbia para avaliação de ideação e comportamento suicida. Domínio público.',
    category: 'formulario',
    tags: ['suicídio', 'risco', 'C-SSRS', 'Columbia'],
    ageGroups: ['all'],
    Icon: ShieldAlert,
    template: `C-SSRS — ESCALA DE COLUMBIA PARA AVALIAÇÃO DO RISCO SUICIDA (Simplificada)
Columbia University — Domínio público

DATA DA AVALIAÇÃO:
PERÍODO DE AVALIAÇÃO: □ Últimas 4 semanas  □ Ao longo da vida  □ Desde a última consulta

PARTE 1 — IDEAÇÃO SUICIDA (responda Sim/Não)
1. Desejo passivo de estar morto(a):
   "Você desejou estar morto(a) ou adormecer e não acordar mais?"
   Resposta:

2. Pensamento suicida ativo sem método:
   "Você teve pensamentos de se matar, mas sem saber como?"
   Resposta:

3. Ideação com método (sem plano):
   "Você pensou em se matar e tinha alguma ideia de como faria?"
   Resposta:

4. Ideação com algum plano:
   "Você teve intenção de agir com base nesses pensamentos?"
   Resposta:

5. Plano determinado e intenção de agir:
   "Você tinha um plano específico de como se matar e estava decidido a realizá-lo?"
   Resposta:

INTENSIDADE DA IDEAÇÃO (se houve ideação acima):
Frequência:
Duração:
Controlabilidade:
Fator de dissuasão:
Motivo dos pensamentos:

PARTE 2 — COMPORTAMENTO SUICIDA (ao longo da vida / período especificado)
Comportamento suicida preparatório:
Tentativa interrompida:
Tentativa abortada:
Tentativa de suicídio (número e última vez):
Comportamento autolesivo sem intenção suicida:

NÍVEL DE RISCO ESTIMADO:
□ Sem risco | □ Baixo | □ Moderado | □ Alto | □ Iminente

CONDUTA ADOTADA:
Plano de segurança:
Encaminhamentos:
Próximo contato:

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'tdah-adulto',
    title: 'Avaliação de TDAH — Adulto (ASRS-v1.1)',
    description: 'Escala de autorrelato de TDAH para adultos da OMS (18 itens). Domínio público.',
    category: 'escala',
    tags: ['TDAH', 'atenção', 'hiperatividade', 'ASRS', 'adulto'],
    ageGroups: ['adulto'],
    Icon: Activity,
    template: `ASRS-v1.1 — ESCALA DE AUTORRELATO DE TDAH PARA ADULTOS (OMS)
Domínio público — Kessler et al. (2005)

Com que frequência você experienciou os seguintes problemas
no último mês?
(0 = Nunca | 1 = Raramente | 2 = Às vezes | 3 = Frequentemente | 4 = Muito frequentemente)

PARTE A — TRIAGEM (6 itens — altamente preditivos)
1. Com que frequência você comete erros por falta de atenção quando trabalha num projeto chato ou difícil?
   Resposta:
2. Com que frequência você tem dificuldade de manter a atenção quando está fazendo uma tarefa chata ou repetitiva?
   Resposta:
3. Com que frequência você tem dificuldade de se concentrar no que as pessoas dizem, mesmo quando falam diretamente com você?
   Resposta:
4. Com que frequência você deixa um projeto pela metade depois de ter feito as partes mais fáceis, com dificuldade para terminar?
   Resposta:
5. Com que frequência você tem dificuldade para fazer tarefas que requerem organização?
   Resposta:
6. Quando você precisa fazer algo que requer muita concentração, com que frequência você evita ou adia esse início?
   Resposta:

PARTE B — SINTOMAS ADICIONAIS (12 itens)
7. Com que frequência você faz coisas desajeitadas ou esbarrões quando está apressado(a)?
   Resposta:
8. Com que frequência você esquece compromissos ou obrigações?
   Resposta:
9. Com que frequência você evita situações que requerem pensar muito?
   Resposta:
10. Com que frequência você fica se mexendo com suas mãos ou pés quando precisa ficar sentado(a) por muito tempo?
    Resposta:
11. Com que frequência você sente como se estivesse agitado(a) por dentro?
    Resposta:
12. Com que frequência você sai do lugar em situações em que se espera que fique sentado(a)?
    Resposta:
13. Com que frequência você tem dificuldade de relaxar e descansar quando tem tempo livre?
    Resposta:
14. Com que frequência você se sente como se estivesse precisando estar sempre em atividade?
    Resposta:
15. Com que frequência você fala demais em situações sociais?
    Resposta:
16. Com que frequência você termina as frases das pessoas antes de elas acabarem, enquanto conversa?
    Resposta:
17. Com que frequência você tem dificuldade de esperar sua vez nas situações que requerem espera?
    Resposta:
18. Com que frequência você interrompe os outros quando estão ocupados?
    Resposta:

PONTUAÇÃO PARTE A (rastreio positivo se ≥4 itens com escores 3–4):
PONTUAÇÃO TOTAL (0–72):

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
  {
    id: 'exposicao-gradual',
    title: 'Registro de Exposição Gradual (TCC)',
    description: 'Hierarquia de exposição e registro de SUDS antes, durante e após cada exposição. Técnica TCC.',
    category: 'registro',
    tags: ['TCC', 'exposição', 'ansiedade', 'hierarquia', 'fobia'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: TrendingUp,
    template: `REGISTRO DE EXPOSIÇÃO GRADUAL — TCC

Paciente:
Situação-alvo / Fobia:
Data de início:

HIERARQUIA DE EXPOSIÇÃO (do menor ao maior SUDS)
SUDS = Unidades Subjetivas de Desconforto (0–100)

Nível 1 — SUDS estimado:   | Situação:
Nível 2 — SUDS estimado:   | Situação:
Nível 3 — SUDS estimado:   | Situação:
Nível 4 — SUDS estimado:   | Situação:
Nível 5 — SUDS estimado:   | Situação:
Nível 6 — SUDS estimado:   | Situação:
Nível 7 — SUDS estimado:   | Situação:
Nível 8 — SUDS estimado:   | Situação:
Nível 9 — SUDS estimado:   | Situação:
Nível 10 — SUDS estimado:  | Situação:

REGISTRO DE SESSÃO DE EXPOSIÇÃO
Data:
Situação praticada (nível):
SUDS antes da exposição:
SUDS pico durante a exposição:
SUDS ao final da exposição:
Duração da exposição:
Estratégias de coping utilizadas:
Observações:

Data:
Situação praticada (nível):
SUDS antes da exposição:
SUDS pico durante a exposição:
SUDS ao final da exposição:
Duração da exposição:
Observações:

CONCLUSÕES E PRÓXIMOS PASSOS:`,
  },
  {
    id: 'conceptualizacao-cognitiva',
    title: 'Conceitualização Cognitiva (TCC)',
    description: 'Formulação do caso no modelo cognitivo: dados relevantes, crenças centrais, estratégias e situações-problema.',
    category: 'formulario',
    tags: ['TCC', 'conceitualização', 'crenças centrais', 'formulação de caso'],
    ageGroups: ['adulto', 'adolescente'],
    Icon: Brain,
    template: `CONCEITUALIZAÇÃO COGNITIVA — FORMULAÇÃO DE CASO (TCC)
Baseado em Beck (1995)

DADOS RELEVANTES DE INFÂNCIA/HISTÓRICO
Experiências relevantes que moldaram as crenças:

CRENÇAS CENTRAIS (sobre si, os outros e o mundo)
Crença central sobre si mesmo(a):
Crença central sobre os outros:
Crença central sobre o futuro/mundo:

CRENÇAS INTERMEDIÁRIAS
Regras/Atitudes: "Devo..."
Pressupostos condicionais: "Se... então..."
Crenças permissivas: "Posso..."

ESTRATÉGIAS COMPENSATÓRIAS (comportamentos para lidar com crenças)
Estratégia principal usada:
Consequências das estratégias:

SITUAÇÃO-PROBLEMA 1
Situação:
Pensamento automático:
Significado do pensamento:
Emoção e intensidade (%):
Comportamento resultante:

SITUAÇÃO-PROBLEMA 2
Situação:
Pensamento automático:
Significado do pensamento:
Emoção e intensidade (%):
Comportamento resultante:

SITUAÇÃO-PROBLEMA 3
Situação:
Pensamento automático:
Significado do pensamento:
Emoção e intensidade (%):
Comportamento resultante:

METAS TERAPÊUTICAS BASEADAS NA CONCEITUALIZAÇÃO:
Intervenções planejadas para crenças centrais:
Técnicas para pensamentos automáticos:

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },

  // ── FORMULÁRIOS CLÍNICOS (mantidos abaixo) ────────────────────────────────

  {
    id: 'grupo-familiar',
    title: 'Genograma / Mapa Familiar',
    description: 'Registro descritivo da estrutura familiar, vínculos e padrões transgeracionais.',
    category: 'formulario',
    tags: ['família', 'genograma', 'sistêmica'],
    ageGroups: ['all'],
    Icon: Users,
    template: `GENOGRAMA / MAPA FAMILIAR

Data:

COMPOSIÇÃO FAMILIAR (descreva os membros significativos)
Nome / Parentesco / Idade / Observação relevante:
Nome / Parentesco / Idade / Observação relevante:
Nome / Parentesco / Idade / Observação relevante:
Nome / Parentesco / Idade / Observação relevante:

RELACIONAMENTOS SIGNIFICATIVOS
Relacionamento com a mãe/figura materna:
Relacionamento com o pai/figura paterna:
Relacionamento com irmãos/irmãs:
Relacionamento com filhos (se houver):
Relacionamento com parceiro(a):

PADRÕES FAMILIARES
Padrões de comunicação observados:
Conflitos recorrentes na família:
Perdas ou separações significativas:
Doenças físicas ou mentais na família:

RECURSOS FAMILIARES
Vínculos de apoio identificados:
Figuras de referência positiva:

EVENTOS MARCANTES
Eventos que impactaram a dinâmica familiar:

OBSERVAÇÕES DO(A) PROFISSIONAL:`,
  },
]

// ── Renderizador de linha do template ────────────────────────────────────────

function renderLine(line: string, idx: number) {
  if (!line.trim()) return <div key={idx} className="h-2" />

  const isHeader =
    line === line.toUpperCase() &&
    line.trim().length > 2 &&
    /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÜÇ\s/—]+$/.test(line.trim())

  if (isHeader) {
    return (
      <div key={idx} className="flex items-center gap-3 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 whitespace-nowrap">
          {line.trim()}
        </p>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>
    )
  }

  const colonIdx = line.indexOf(':')
  if (colonIdx > 0) {
    const label = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim()
    return (
      <div key={idx} className="grid grid-cols-[180px_1fr] gap-3 items-end py-1 border-b border-dashed border-neutral-150">
        <span className="text-[11px] font-semibold text-neutral-500 pb-0.5 leading-tight">{label}</span>
        <span className="text-sm text-neutral-700 pb-0.5 min-h-[1.5rem]">
          {value || <span className="text-neutral-200 select-none">_</span>}
        </span>
      </div>
    )
  }

  return (
    <p key={idx} className="text-xs text-neutral-400 italic py-0.5">
      {line}
    </p>
  )
}

// ── Modal de instrumento ─────────────────────────────────────────────────────

function InstrumentModal({
  instrument,
  onClose,
}: {
  instrument: Instrument | null
  onClose: () => void
}) {
  if (!instrument) return null

  const lines = instrument.template.split('\n')
  const fieldCount = lines.filter(l => l.trim().endsWith(':')).length

  function escHtml(v: string) {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function printInstrument() {
    const win = window.open('', '_blank')
    if (!win) { toast.error('Não foi possível abrir a janela de impressão.'); return }

    const rows = lines.map(line => {
      if (!line.trim()) return '<div style="height:8px"></div>'
      const isHeader =
        line === line.toUpperCase() &&
        line.trim().length > 2 &&
        /^[A-ZÁÀÃÂÉÊÍÓÔÕÚÜÇ\s/—]+$/.test(line.trim())
      if (isHeader) {
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0 4px">
          <span style="font-size:8.5px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#6b7280;white-space:nowrap">${escHtml(line.trim())}</span>
          <div style="flex:1;height:1px;background:#d1d5db"></div></div>`
      }
      const ci = line.indexOf(':')
      if (ci > 0) {
        const label = escHtml(line.slice(0, ci).trim())
        const value = escHtml(line.slice(ci + 1).trim())
        return `<div style="display:grid;grid-template-columns:170px 1fr;gap:8px;padding:5px 0;border-bottom:1px dashed #e5e7eb">
          <span style="font-size:9px;font-weight:600;color:#6b7280;padding-top:2px">${label}</span>
          <span style="font-size:11px;color:#374151;padding-bottom:3px">${value || ''}</span></div>`
      }
      return `<p style="font-size:9px;color:#9ca3af;font-style:italic;margin:2px 0">${escHtml(line)}</p>`
    }).join('')

    const catLabel = CAT_LABEL[instrument.category]

    win.document.write(`<!doctype html><html><head><title>${escHtml(instrument.title)}</title>
<style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}
html,body{width:210mm;min-height:297mm;margin:0;background:#fff;font-family:Arial,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:14px}
.badge{display:inline-block;font-size:8px;font-weight:700;padding:2px 7px;border-radius:20px;border:1px solid #d1d5db;color:#374151;margin-top:4px}
</style>
</head><body><div>
<div class="header">
  <p style="font-size:14px;font-weight:700;margin:0 0 2px">${escHtml(instrument.title)}</p>
  <p style="font-size:9.5px;color:#6b7280;margin:0 0 4px">${escHtml(instrument.description)}</p>
  <span class="badge">${escHtml(catLabel)}</span>
  <span class="badge" style="margin-left:4px">${fieldCount} campos</span>
  <span class="badge" style="margin-left:4px">Profissional: ___________________________ | CRP: ____________ | Data: ____/____/____</span>
</div>
${rows}
<p style="font-size:8px;color:#9ca3af;margin-top:16px;border-top:1px solid #e5e7eb;padding-top:8px">Instrumento de apoio clínico · não substitui prontuário oficial · UseCognia</p>
</div></body></html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 150)
  }

  return (
    <Modal open={!!instrument} onClose={onClose} title={instrument.title} size="lg">
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <instrument.Icon className="w-5 h-5 text-sage-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-600 leading-relaxed">{instrument.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[instrument.category]}`}>
                {CAT_LABEL[instrument.category]}
              </span>
              {instrument.tags.map(t => (
                <span key={t} className="text-[11px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs text-neutral-400 shrink-0">{fieldCount} campos</span>
        </div>

        {/* Formulário */}
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-sage-400" />
              <span className="text-xs font-medium text-neutral-500">Formulário para preenchimento</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span>Profissional: <span className="inline-block w-24 border-b border-neutral-300">&nbsp;</span></span>
              <span>Data: <span className="inline-block w-16 border-b border-neutral-300">&nbsp;</span></span>
            </div>
          </div>
          <div className="px-5 py-4 space-y-0.5 max-h-[50vh] overflow-y-auto">
            {lines.map((line, idx) => renderLine(line, idx))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400">
            Instrumento de apoio clínico · não substitui prontuário oficial
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary text-sm">Fechar</button>
            <button type="button" onClick={printInstrument} className="btn-primary text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Card de instrumento ──────────────────────────────────────────────────────

function InstrumentCard({
  instrument,
  index,
  onClick,
}: {
  instrument: Instrument
  index: number
  onClick: () => void
}) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length]
  const fieldCount = instrument.template.split('\n').filter(l => l.trim().endsWith(':')).length

  return (
    <button
      type="button"
      onClick={onClick}
      className="card group flex flex-col items-start gap-3 p-4 text-left hover:shadow-lifted hover:-translate-y-px transition-all duration-200 hover:border-sage-200 cursor-pointer"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${accent}`}>
        <instrument.Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-neutral-800 leading-tight">{instrument.title}</p>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CAT_COLOR[instrument.category]}`}>
            {CAT_LABEL[instrument.category]}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-neutral-400 line-clamp-2">{instrument.description}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {instrument.tags.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] text-neutral-400 bg-neutral-50 border border-neutral-100 px-1.5 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-between pt-1 border-t border-neutral-100">
        <span className="text-[11px] text-neutral-300">{fieldCount} campos</span>
        <span className="text-xs font-medium text-sage-600 group-hover:text-sage-700">
          Abrir →
        </span>
      </div>
    </button>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

const ALL_CATEGORIES: Array<{ value: InstrumentCategory | 'all'; label: string }> = [
  { value: 'all',        label: 'Todos' },
  { value: 'formulario', label: 'Formulários' },
  { value: 'escala',     label: 'Escalas' },
  { value: 'registro',   label: 'Registros' },
  { value: 'entrevista', label: 'Entrevistas' },
]

const ALL_AGES: Array<{ value: AgeGroup | 'all'; label: string }> = [
  { value: 'all',         label: 'Todas as idades' },
  { value: 'infantil',    label: 'Infantil' },
  { value: 'adolescente', label: 'Adolescente' },
  { value: 'adulto',      label: 'Adulto' },
]

export default function InstrumentosPage() {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<InstrumentCategory | 'all'>('all')
  const [ageFilter, setAgeFilter] = useState<AgeGroup | 'all'>('all')
  const [selected, setSelected] = useState<Instrument | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return INSTRUMENTS.filter(inst => {
      const matchCat  = catFilter === 'all' || inst.category === catFilter
      const matchAge  = ageFilter === 'all' || inst.ageGroups.includes(ageFilter as AgeGroup) || inst.ageGroups.includes('all')
      const matchQ    = !q || inst.title.toLowerCase().includes(q) || inst.description.toLowerCase().includes(q) || inst.tags.some(t => t.toLowerCase().includes(q))
      return matchCat && matchAge && matchQ
    })
  }, [search, catFilter, ageFilter])

  return (
    <div className="animate-slide-up space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Instrumentos Clínicos</h1>
        <p className="page-subtitle">Formulários, escalas e registros para apoio clínico</p>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, descrição ou assunto..."
          className="input-field pl-9 py-2.5 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Categoria */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {ALL_CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCatFilter(value as InstrumentCategory | 'all')}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                catFilter === value ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Faixa etária */}
        <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {ALL_AGES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setAgeFilter(value as AgeGroup | 'all')}
              className={`flex-none px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                ageFilter === value ? 'bg-white shadow-sm font-medium text-neutral-800' : 'text-neutral-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contador */}
      <p className="text-xs text-neutral-400">
        {filtered.length} instrumento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="text-sm text-neutral-400">Nenhum instrumento encontrado para os filtros selecionados.</p>
          <button
            onClick={() => { setSearch(''); setCatFilter('all'); setAgeFilter('all') }}
            className="mt-3 text-xs text-sage-600 hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((inst, i) => (
            <InstrumentCard
              key={inst.id}
              instrument={inst}
              index={i}
              onClick={() => setSelected(inst)}
            />
          ))}
        </div>
      )}

      {/* Nota CFP */}
      <p className="text-xs text-neutral-400 border-t border-neutral-100 pt-4">
        Testes psicológicos privativos devem ser utilizados exclusivamente por psicólogas(os) habilitados,
        conforme orientação do CFP e lista do{' '}
        <a
          href="https://satepsi.cfp.org.br/"
          target="_blank"
          rel="noreferrer"
          className="text-sage-600 hover:underline"
        >
          SATEPSI
        </a>
        . As escalas de rastreio aqui listadas são de uso clínico livre e não substituem avaliação psicológica formal.
      </p>

      <InstrumentModal instrument={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
