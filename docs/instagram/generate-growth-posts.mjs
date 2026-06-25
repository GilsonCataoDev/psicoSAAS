import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from '../../frontend/node_modules/sharp/dist/index.mjs'

const outDir = path.resolve('docs/instagram/posts-growth-usecognia')
const W = 1080
const H = 1350

const colors = {
  bg: '#FBFBF8',
  surface: '#FFFFFF',
  ink: '#37332E',
  muted: '#7C776B',
  green: '#2F7657',
  dark: '#244D3D',
  deep: '#1D352D',
  blue: '#4DA8DA',
  blueSoft: '#D9EFFA',
  greenSoft: '#D9EFE4',
  warm: '#CC7C66',
  line: '#E7E2D8',
}

function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function wrap(text, maxChars) {
  const words = text.split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function textBlock(text, x, y, size, weight, fill, maxChars, lineHeight = Math.round(size * 1.16), anchor = 'start') {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${wrap(text, maxChars)
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`)
    .join('')}</text>`
}

function logo(x = 84, y = 82, scale = 0.52, light = false) {
  const word = light ? '#FFFFFF' : colors.ink
  const accent = light ? '#9BE7BD' : colors.green
  const strokeA = light ? '#9BE7BD' : colors.green
  const strokeB = light ? '#8DD7FF' : colors.blue
  const dark = light ? '#FFFFFF' : colors.dark
  return `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M56 4C29.5 4 9.5 22.6 9.5 42.4S29.5 80.8 56 80.8" fill="none" stroke="${strokeA}" stroke-width="17" stroke-linecap="round"/>
    <path d="M57.2 20.2c10.7 0 19.8 8.4 20.5 19.1 6.8 1.9 11.9 8.1 11.9 15.6 0 8.6-6.8 15.9-15.4 16.3" fill="none" stroke="${strokeB}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M56 29.5v37.2M56 42.3l18.6-10.5M56 42.3l19.8 11.6M56 58.6l14 9.3" fill="none" stroke="${dark}" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="56" cy="42.3" r="7.2" fill="${dark}"/><circle cx="74.6" cy="31.8" r="7.2" fill="${dark}"/><circle cx="75.8" cy="53.9" r="7.2" fill="${dark}"/><circle cx="70" cy="67.9" r="7.2" fill="${dark}"/><circle cx="56" cy="58.6" r="7.2" fill="${dark}"/>
  </g>
  <text x="${x + 78 * scale}" y="${y + 61 * scale}" font-family="Inter, Arial, sans-serif" font-size="${34 * scale}" font-weight="760" fill="${word}">Use<tspan fill="${accent}">Cognia</tspan></text>`
}

function footer(cta, dark = false) {
  return `
  <rect x="84" y="1192" width="360" height="72" rx="20" fill="${dark ? '#9BE7BD' : colors.green}"/>
  <text x="264" y="1238" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="780" fill="${dark ? colors.deep : '#FFFFFF'}">${esc(cta)}</text>
  <text x="996" y="1236" text-anchor="end" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="650" fill="${dark ? '#FFFFFF99' : colors.muted}">usecognia.com.br</text>`
}

function phoneMockup(x, y, w, h, active = 1) {
  const row = (yy, label, color = colors.dark) => `
    <rect x="${x + 42}" y="${yy}" width="${w - 84}" height="50" rx="14" fill="${color}" opacity="${color === colors.dark ? 0.08 : 1}"/>
    <circle cx="${x + 70}" cy="${yy + 25}" r="9" fill="${color === colors.dark ? colors.green : '#FFFFFF'}"/>
    <text x="${x + 92}" y="${yy + 33}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700" fill="${color === colors.dark ? colors.ink : '#FFFFFF'}">${esc(label)}</text>`
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="42" fill="#12231D" opacity="0.16"/>
  <rect x="${x + 12}" y="${y - 12}" width="${w}" height="${h}" rx="42" fill="${colors.surface}" stroke="${colors.line}" stroke-width="3"/>
  <rect x="${x + 44}" y="${y + 22}" width="${w - 64}" height="18" rx="9" fill="${colors.line}"/>
  <text x="${x + 42}" y="${y + 92}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" fill="${colors.deep}">Agenda</text>
  ${row(y + 124, '09:00 Ana')}
  ${row(y + 190, '10:00 Pedro', active ? colors.green : colors.dark)}
  ${row(y + 256, '14:00 Marina')}
  <rect x="${x + 42}" y="${y + 344}" width="${w - 84}" height="92" rx="22" fill="${colors.greenSoft}"/>
  <text x="${x + 68}" y="${y + 386}" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800" fill="${colors.dark}">Lembrete enviado</text>
  <text x="${x + 68}" y="${y + 416}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="500" fill="${colors.ink}">WhatsApp • confirmado</text>`
}

function card(x, y, w, h, title, body, fill = colors.surface) {
  return `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${fill}" stroke="${fill === colors.surface ? colors.line : 'transparent'}"/>
  <text x="${x + 34}" y="${y + 58}" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="800" fill="${colors.dark}">${esc(title)}</text>
  ${textBlock(body, x + 34, y + 104, 23, 520, colors.ink, 26, 32)}`
}

const posts = [
  {
    file: '01-consultorio-vazando-pacientes',
    bg: colors.deep,
    light: true,
    eyebrow: 'DOR REAL DA ROTINA CLÍNICA',
    title: 'Seu consultório pode estar vazando pacientes.',
    subtitle: 'Nem toda perda vem da demanda. Às vezes, ela começa em uma agenda confusa.',
    art: `
      <rect x="84" y="670" width="912" height="410" rx="34" fill="#FFFFFF" opacity="0.08"/>
      <rect x="132" y="718" width="410" height="86" rx="22" fill="#FFFFFF" opacity="0.11"/>
      <text x="172" y="772" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="760" fill="#FFFFFF">Sessão sem confirmação</text>
      <rect x="132" y="830" width="510" height="86" rx="22" fill="#FFFFFF" opacity="0.11"/>
      <text x="172" y="884" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="760" fill="#FFFFFF">Paciente esqueceu o horário</text>
      <rect x="132" y="942" width="610" height="86" rx="22" fill="#9BE7BD" opacity="0.95"/>
      <text x="172" y="996" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="820" fill="${colors.deep}">Organização também é retenção</text>
      <path d="M828 704c72 38 98 108 78 178-19 67-84 103-150 93-78-12-132-75-126-148 7-89 105-165 198-123z" fill="#4DA8DA" opacity=".2"/>
      <path d="M780 790h118M780 842h88M780 894h132" stroke="#9BE7BD" stroke-width="16" stroke-linecap="round"/>`,
    cta: 'Entrar no Beta',
  },
  {
    file: '02-psicologo-nao-e-secretaria',
    bg: colors.bg,
    light: false,
    eyebrow: 'PARA PSICÓLOGOS E ESTAGIÁRIOS',
    title: 'Você estudou para atender. Não para virar secretaria.',
    subtitle: 'Agenda, prontuário, pacientes e confirmações não precisam ficar espalhados.',
    art: `
      ${card(84, 705, 422, 152, 'Antes', 'Planilha, WhatsApp, caderno e lembretes soltos.', colors.surface)}
      ${card(574, 705, 422, 152, 'Depois', 'Rotina clínica centralizada no UseCognia.', colors.greenSoft)}
      <path d="M506 780h68" stroke="${colors.blue}" stroke-width="12" stroke-linecap="round"/>
      <path d="M548 752l28 28-28 28" fill="none" stroke="${colors.blue}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="154" y="930" width="772" height="118" rx="28" fill="${colors.blueSoft}"/>
      <text x="540" y="1004" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="31" font-weight="820" fill="${colors.deep}">Menos retrabalho entre uma sessão e outra.</text>`,
    cta: 'Testar grátis',
  },
  {
    file: '03-agenda-clara-paciente-lembrado',
    bg: colors.bg,
    light: false,
    eyebrow: 'AGENDA + LEMBRETES',
    title: 'Agenda clara. Paciente lembrado. Sessão mantida.',
    subtitle: 'Um fluxo simples pode reduzir faltas e tirar confirmações manuais da sua cabeça.',
    art: `
      ${phoneMockup(636, 642, 288, 486)}
      <rect x="84" y="690" width="470" height="390" rx="34" fill="${colors.surface}" stroke="${colors.line}" stroke-width="3"/>
      <text x="130" y="760" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="820" fill="${colors.deep}">O loop é simples:</text>
      <circle cx="142" cy="830" r="14" fill="${colors.green}"/><text x="178" y="840" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="700" fill="${colors.ink}">cria o horário</text>
      <circle cx="142" cy="900" r="14" fill="${colors.blue}"/><text x="178" y="910" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="700" fill="${colors.ink}">envia o link</text>
      <circle cx="142" cy="970" r="14" fill="${colors.warm}"/><text x="178" y="980" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="700" fill="${colors.ink}">lembrete automático</text>
      <circle cx="142" cy="1040" r="14" fill="${colors.green}"/><text x="178" y="1050" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="700" fill="${colors.ink}">menos esquecimento</text>`,
    cta: 'Ver o UseCognia',
  },
  {
    file: '04-prontuario-espalhado',
    bg: colors.bg,
    light: false,
    eyebrow: 'PRONTUÁRIO DIGITAL',
    title: 'O histórico do paciente não deveria ficar espalhado.',
    subtitle: 'A continuidade do cuidado depende de registro, contexto e acesso rápido.',
    art: `
      <rect x="130" y="684" width="820" height="430" rx="34" fill="${colors.surface}" stroke="${colors.line}" stroke-width="3"/>
      <rect x="178" y="734" width="248" height="328" rx="24" fill="${colors.greenSoft}"/>
      <text x="218" y="794" font-family="Inter, Arial, sans-serif" font-size="31" font-weight="820" fill="${colors.deep}">Paciente</text>
      <text x="218" y="848" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="650" fill="${colors.ink}">Histórico</text>
      <text x="218" y="900" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="650" fill="${colors.ink}">Evoluções</text>
      <text x="218" y="952" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="650" fill="${colors.ink}">Documentos</text>
      <path d="M502 766h340M502 836h284M502 906h360M502 976h230" stroke="${colors.line}" stroke-width="22" stroke-linecap="round"/>
      <path d="M502 766h170M502 836h220M502 906h130M502 976h190" stroke="${colors.blue}" stroke-width="10" stroke-linecap="round"/>
      <rect x="530" y="1020" width="278" height="54" rx="16" fill="${colors.deep}"/>
      <text x="669" y="1055" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" fill="#FFFFFF">Tudo em um lugar</text>`,
    cta: 'Organizar agora',
  },
  {
    file: '05-beta-gratuito-usecognia',
    bg: colors.deep,
    light: true,
    eyebrow: 'BETA GRATUITO',
    title: 'Psicólogos e estagiários: testem o UseCognia grátis.',
    subtitle: 'Acesso antecipado para quem quer organizar a rotina clínica desde agora.',
    art: `
      <rect x="84" y="684" width="912" height="382" rx="36" fill="#FFFFFF" opacity="0.08"/>
      <rect x="132" y="736" width="380" height="104" rx="26" fill="#FFFFFF" opacity="0.12"/>
      <text x="176" y="799" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="820" fill="#FFFFFF">Acesso antecipado</text>
      <rect x="132" y="874" width="516" height="104" rx="26" fill="#FFFFFF" opacity="0.12"/>
      <text x="176" y="937" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="820" fill="#FFFFFF">Influencie funcionalidades</text>
      <rect x="132" y="1012" width="438" height="104" rx="26" fill="#9BE7BD"/>
      <text x="176" y="1075" font-family="Inter, Arial, sans-serif" font-size="29" font-weight="850" fill="${colors.deep}">Suporte próximo</text>
      <rect x="714" y="742" width="210" height="294" rx="34" fill="#FFFFFF" opacity=".96"/>
      <text x="748" y="812" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="850" fill="${colors.deep}">Beta</text>
      <path d="M752 864h120M752 918h86M752 972h132" stroke="${colors.green}" stroke-width="14" stroke-linecap="round"/>`,
    cta: 'Quero testar',
  },
]

function svg(post) {
  const dark = post.bg === colors.deep
  const titleFill = dark ? '#FFFFFF' : colors.deep
  const bodyFill = dark ? '#FFFFFFCC' : colors.ink
  const eyebrowFill = dark ? '#9BE7BD' : colors.green
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <rect width="${W}" height="${H}" fill="${post.bg}"/>
  ${dark ? `<circle cx="940" cy="118" r="270" fill="${colors.blue}" opacity=".16"/><circle cx="80" cy="1240" r="300" fill="#9BE7BD" opacity=".11"/>` : `<rect x="36" y="36" width="1008" height="1278" rx="42" fill="${colors.surface}" stroke="${colors.line}" stroke-width="2"/>`}
  ${logo(84, 78, 0.64, post.light)}
  <text x="84" y="216" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="830" letter-spacing="4" fill="${eyebrowFill}">${esc(post.eyebrow)}</text>
  ${textBlock(post.title, 84, 330, 76, 860, titleFill, 22, 86)}
  ${textBlock(post.subtitle, 84, 545, 34, 520, bodyFill, 42, 45)}
  ${post.art}
  ${footer(post.cta, dark)}
  </svg>`
}

await fs.mkdir(outDir, { recursive: true })

for (const post of posts) {
  const markup = svg(post)
  const svgPath = path.join(outDir, `${post.file}.svg`)
  const pngPath = path.join(outDir, `${post.file}.png`)
  await fs.writeFile(svgPath, markup, 'utf8')
  await sharp(Buffer.from(markup)).png().toFile(pngPath)
  console.log(pngPath)
}
