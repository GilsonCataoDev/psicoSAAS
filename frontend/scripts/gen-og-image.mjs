import sharp from 'sharp'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1A3028"/>
      <stop offset="100%" stop-color="#0F1F18"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.02"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Subtle grid texture -->
  <g opacity="0.06">
    <line x1="0" y1="105" x2="1200" y2="105" stroke="#fff" stroke-width="1"/>
    <line x1="0" y1="210" x2="1200" y2="210" stroke="#fff" stroke-width="1"/>
    <line x1="0" y1="315" x2="1200" y2="315" stroke="#fff" stroke-width="1"/>
    <line x1="0" y1="420" x2="1200" y2="420" stroke="#fff" stroke-width="1"/>
    <line x1="0" y1="525" x2="1200" y2="525" stroke="#fff" stroke-width="1"/>
    <line x1="200" y1="0" x2="200" y2="630" stroke="#fff" stroke-width="1"/>
    <line x1="400" y1="0" x2="400" y2="630" stroke="#fff" stroke-width="1"/>
    <line x1="600" y1="0" x2="600" y2="630" stroke="#fff" stroke-width="1"/>
    <line x1="800" y1="0" x2="800" y2="630" stroke="#fff" stroke-width="1"/>
    <line x1="1000" y1="0" x2="1000" y2="630" stroke="#fff" stroke-width="1"/>
  </g>

  <!-- Green accent top bar -->
  <rect x="0" y="0" width="1200" height="5" fill="#4AAF76"/>

  <!-- Left content area -->
  <!-- Logo mark (stylised leaf/brain) -->
  <g transform="translate(90, 90)">
    <rect width="52" height="52" rx="14" fill="#2F7657"/>
    <circle cx="26" cy="24" r="10" fill="none" stroke="#A8D5B8" stroke-width="2.5"/>
    <line x1="26" y1="14" x2="26" y2="9" stroke="#A8D5B8" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="26" y1="34" x2="26" y2="39" stroke="#A8D5B8" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="16" y1="24" x2="11" y2="24" stroke="#A8D5B8" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="36" y1="24" x2="41" y2="24" stroke="#A8D5B8" stroke-width="2.5" stroke-linecap="round"/>
  </g>

  <!-- Brand name -->
  <text x="155" y="130" font-family="Georgia, serif" font-size="42" font-weight="700" fill="#ffffff" letter-spacing="-0.5">
    <tspan fill="#ffffff">Use</tspan><tspan fill="#4AAF76">Cognia</tspan>
  </text>

  <!-- Main headline -->
  <text x="90" y="248" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#ffffff" letter-spacing="-1">
    Reduza faltas.
  </text>
  <text x="90" y="322" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#ffffff" letter-spacing="-1">
    Organize o
  </text>
  <text x="90" y="396" font-family="Georgia, serif" font-size="64" font-weight="700" fill="#4AAF76" letter-spacing="-1">
    consultório.
  </text>

  <!-- Subline -->
  <text x="90" y="458" font-family="Arial, sans-serif" font-size="24" fill="#ffffff" opacity="0.65" letter-spacing="0">
    Agenda, prontuário e documentos para
  </text>
  <text x="90" y="488" font-family="Arial, sans-serif" font-size="24" fill="#ffffff" opacity="0.65">
    psicólogos autônomos.
  </text>

  <!-- CTA pill -->
  <rect x="90" y="526" width="248" height="48" rx="24" fill="#2F7657"/>
  <text x="214" y="556" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">
    Testar 7 dias grátis
  </text>

  <!-- Right: product mock card -->
  <g transform="translate(680, 80)">
    <!-- Card shadow -->
    <rect x="4" y="6" width="440" height="470" rx="20" fill="#000000" opacity="0.35"/>
    <!-- Card bg -->
    <rect width="440" height="470" rx="20" fill="url(#card)" stroke="#ffffff" stroke-width="1" stroke-opacity="0.12"/>

    <!-- Card top bar -->
    <rect width="440" height="56" rx="20" fill="#ffffff" fill-opacity="0.07"/>
    <rect x="0" y="36" width="440" height="20" fill="#ffffff" fill-opacity="0.07"/>
    <text x="20" y="37" font-family="Arial, sans-serif" font-size="11" fill="#A8D5B8" font-weight="700" letter-spacing="2">PAINEL USECOGNIA</text>
    <text x="20" y="52" font-family="Arial, sans-serif" font-size="13" fill="#ffffff" opacity="0.55">Hoje, 02 de junho</text>
    <rect x="330" y="16" width="90" height="24" rx="12" fill="#4AAF76"/>
    <text x="375" y="33" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#0F1F18" text-anchor="middle">Pro ativo</text>

    <!-- Stat cards -->
    <rect x="16" y="72" width="196" height="80" rx="12" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>
    <text x="28" y="96" font-family="Arial, sans-serif" font-size="11" fill="#ffffff" opacity="0.45">Consultas hoje</text>
    <text x="28" y="136" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#ffffff">4</text>

    <rect x="228" y="72" width="196" height="80" rx="12" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>
    <text x="240" y="96" font-family="Arial, sans-serif" font-size="11" fill="#ffffff" opacity="0.45">Faltas evitadas</text>
    <text x="240" y="136" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#4AAF76">12</text>

    <!-- Agenda section -->
    <rect x="16" y="168" width="408" height="176" rx="12" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1"/>
    <text x="28" y="192" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#ffffff">Agenda</text>
    <text x="370" y="192" font-family="Arial, sans-serif" font-size="11" fill="#ffffff" opacity="0.38">recorrência ativa</text>

    <rect x="28" y="202" width="384" height="36" rx="8" fill="#0D1512"/>
    <text x="42" y="226" font-family="Arial, sans-serif" font-size="13" font-weight="500" fill="#ffffff">09:00 · Ana Paula</text>

    <rect x="28" y="244" width="384" height="36" rx="8" fill="#0D1512"/>
    <text x="42" y="268" font-family="Arial, sans-serif" font-size="13" font-weight="500" fill="#ffffff">10:00 · Pedro Lima</text>

    <rect x="28" y="286" width="384" height="36" rx="8" fill="#0D1512"/>
    <text x="42" y="310" font-family="Arial, sans-serif" font-size="13" font-weight="500" fill="#ffffff">14:00 · Marina Costa</text>

    <!-- Document highlight -->
    <rect x="16" y="360" width="408" height="94" rx="12" fill="#2F7657" fill-opacity="0.25" stroke="#4AAF76" stroke-opacity="0.4" stroke-width="1"/>
    <text x="28" y="386" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#A8D5B8" letter-spacing="2">DOCUMENTO PRONTO</text>
    <text x="28" y="410" font-family="Arial, sans-serif" font-size="13" fill="#ffffff">Declaração com QR de autenticidade</text>
    <text x="28" y="432" font-family="Arial, sans-serif" font-size="13" fill="#ffffff" opacity="0.6">gerada em uma página.</text>
  </g>
</svg>`

const svgBuffer = Buffer.from(svg)

sharp(svgBuffer)
  .png()
  .toFile(join(__dir, '../public/og-image.png'))
  .then(() => console.log('✓ og-image.png gerada em frontend/public/'))
  .catch(err => { console.error('Erro:', err); process.exit(1) })
