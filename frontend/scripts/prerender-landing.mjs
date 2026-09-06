import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
const siteUrl = 'https://usecognia.com.br'
const indexPath = join(dist, 'index.html')

const faqs = JSON.parse(readFileSync(join(root, 'src', 'content', 'landing-faq.json'), 'utf8'))

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;')

const trustSignals = [
  'Feito para profissionais de saúde',
  'Dados protegidos com criptografia',
  '7 dias de teste com acesso completo',
  'Cancele antes do vencimento',
]

const pains = [
  { title: 'Quantas horas por semana você perde remarcando sessões no WhatsApp?', text: 'Disponibilize seus horários em um link público e deixe o paciente escolher entre as opções que você liberou.' },
  { title: 'Quanto você deixa de receber por não acompanhar cobranças e pagamentos?', text: 'Visualize valores pendentes e recebidos sem depender de planilhas, anotações ou memória.' },
  { title: 'Quantos pacientes você precisa lembrar manualmente antes de cada consulta?', text: 'Centralize agenda, confirmações e histórico para reduzir tarefas repetitivas e evitar informações espalhadas.' },
]

const howItWorks = [
  { step: '1', title: 'Crie sua conta', text: 'Informe seus dados profissionais e entre no sistema em menos de dois minutos.' },
  { step: '2', title: 'Cadastre o primeiro paciente', text: 'Organize contato, histórico, sessões e documentos em uma ficha única.' },
  { step: '3', title: 'Centralize sua rotina', text: 'Use agenda, prontuário e financeiro juntos, sem precisar configurar tudo de uma vez.' },
]

const features = [
  { title: 'Link público com datas disponíveis', text: 'O paciente escolhe uma data real da sua agenda, sem ficar testando dia por dia ou esperando resposta.' },
  { title: 'Prontuário clínico digital', text: 'Registre evoluções, acompanhe histórico e mantenha dados clínicos em uma rotina mais segura.' },
  { title: 'Cobranças e recebimentos organizados', text: 'Acompanhe pendências, registre pagamentos e envie cobranças de forma mais profissional.' },
  { title: 'Mensagens e lembretes', text: 'Padronize comunicações importantes e reduza trabalho repetitivo antes e depois das sessões.' },
]

const trialItems = [
  '7 dias com acesso completo ao plano Pro',
  'Agenda online com link público de agendamento',
  'Pacientes ilimitados durante o teste',
  'Prontuário, documentos e financeiro incluídos',
  'WhatsApp, IA e cobranças quando configurados',
]

const list = items => items.map(item => `<li class="mb-2">${escapeHtml(item)}</li>`).join('')

const body = `<div class="min-h-screen bg-[#F7F8F5] text-[#211F1C]">
<header class="border-b border-[#E1E6DE]"><div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-5"><a href="/" class="text-xl font-bold">Use<span class="text-[#2F7657]">Cognia</span></a><nav class="flex items-center gap-4 text-sm font-semibold"><a href="/plataforma">Plataforma</a><a href="/precos">Preços</a><a href="/blog">Conteúdos</a><a href="/cadastro" class="rounded-md bg-[#213F34] px-4 py-2.5 text-white">Começar 7 dias grátis</a></nav></div></header>
<main>
<section class="bg-[#1D352D] text-white"><div class="mx-auto max-w-6xl px-5 py-20">
<p class="text-sm font-bold text-[#B7DFCD]">Gestão clínica para profissionais de saúde</p>
<h1 class="mt-6 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Sua clínica organizada. Mais tempo para cuidar de quem importa.</h1>
<p class="mt-5 max-w-2xl text-lg text-white/80">Agenda, pacientes, prontuário e financeiro em um só lugar.</p>
<ul class="mt-6 text-white/70">${list(trustSignals)}</ul>
<p class="mt-8"><a href="/cadastro" class="inline-block rounded-md bg-[#CFF3DE] px-6 py-3 font-bold text-[#143D2D]">Começar 7 dias grátis</a></p>
<p class="mt-3 text-sm text-white/50">Leva menos de 2 minutos · cartão obrigatório · R$97,90/mês após o teste</p>
</div></section>

<section class="mx-auto max-w-6xl px-5 py-16"><h2 class="mb-8 text-3xl font-bold">O que trava a rotina de quem atende</h2><div class="grid gap-6 md:grid-cols-3">${pains.map(item => `<article><h3 class="text-xl font-bold">${escapeHtml(item.title)}</h3><p class="mt-3 leading-relaxed text-[#5F5A51]">${escapeHtml(item.text)}</p></article>`).join('')}</div></section>

<section class="mx-auto max-w-6xl px-5 py-16"><h2 class="mb-8 text-3xl font-bold">Recursos do UseCognia</h2><div class="grid gap-6 md:grid-cols-2">${features.map(item => `<article><h3 class="text-xl font-bold">${escapeHtml(item.title)}</h3><p class="mt-3 leading-relaxed text-[#5F5A51]">${escapeHtml(item.text)}</p></article>`).join('')}</div></section>

<section class="mx-auto max-w-6xl px-5 py-16"><h2 class="mb-8 text-3xl font-bold">Como começar</h2><ol class="grid gap-6 md:grid-cols-3">${howItWorks.map(item => `<li><h3 class="text-xl font-bold">${escapeHtml(item.step)}. ${escapeHtml(item.title)}</h3><p class="mt-3 leading-relaxed text-[#5F5A51]">${escapeHtml(item.text)}</p></li>`).join('')}</ol></section>

<section class="mx-auto max-w-6xl px-5 py-16"><h2 class="text-3xl font-bold">Experimente tudo por 7 dias antes de pagar.</h2><p class="mt-4 max-w-2xl leading-relaxed text-[#5F5A51]">Acesso completo ao plano Pro durante o período de teste. Cancele antes do vencimento e nenhum valor será cobrado. Após os 7 dias, a assinatura é de R$97,90 por mês.</p><ul class="mt-6">${list(trialItems)}</ul><p class="mt-8"><a href="/cadastro" class="inline-block rounded-md bg-[#213F34] px-6 py-3 font-bold text-white">Começar 7 dias grátis</a></p></section>

<section class="mx-auto max-w-3xl px-5 py-16"><h2 class="mb-8 text-3xl font-bold">Perguntas frequentes</h2>${faqs.map(item => `<div class="mt-6"><h3 class="font-bold">${escapeHtml(item.question)}</h3><p class="mt-2 leading-relaxed text-[#5F5A51]">${escapeHtml(item.answer)}</p></div>`).join('')}</section>
</main>
<footer class="border-t border-[#E1E6DE] bg-white"><div class="mx-auto max-w-6xl px-5 py-10 text-sm text-[#5F5A51]">© ${new Date().getFullYear()} UseCognia · <a href="/privacidade">Privacidade</a> · <a href="/termos">Termos</a> · <a href="/seguranca">Segurança</a> · <a href="mailto:usecognia@gmail.com">Contato</a></div></footer>
</div>`

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}

let html = readFileSync(indexPath, 'utf8')

if (!html.includes('<div id="root"></div>')) {
  throw new Error('prerender-landing: <div id="root"></div> não encontrado em dist/index.html')
}

// O FAQPage estático do index.html é substituído pelo gerado a partir de landing-faq.json,
// garantindo que o schema nunca divirja das perguntas exibidas na página.
html = html.replace(
  /<script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "FAQPage"[\s\S]*?<\/script>/,
  `<script type="application/ld+json">${JSON.stringify(faqJsonLd).replaceAll('<', '\\u003c')}</script>`,
)

html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`)

writeFileSync(indexPath, html)

console.log(`Landing prerenderizada: hero + ${features.length} recursos + ${faqs.length} FAQs`)
