import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CalendarDays, ShieldCheck } from 'lucide-react'
import BlogShell from '@/components/blog/BlogShell'
import postsJson from '@/content/blog-posts.json'
import { usePageSeo } from '@/lib/pageSeo'
import type { BlogPost } from '@/types/blog'

const posts = postsJson as BlogPost[]
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })

export default function BlogPage() {
  usePageSeo({
    title: 'Conteúdos para psicólogos | Blog UseCognia',
    description: 'Guias práticos sobre agenda, prontuário, segurança, LGPD e gestão do consultório psicológico.',
    canonicalPath: '/blog',
    jsonLd: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Blog UseCognia', url: 'https://usecognia.com.br/blog', description: 'Conteúdos sobre organização e gestão para psicólogos.', publisher: { '@type': 'Organization', name: 'UseCognia', url: 'https://usecognia.com.br' } },
  })
  return (
    <BlogShell>
      <main>
        <section className="border-b border-[#DDE5DC] bg-[#1D352D] text-white">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20"><div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold text-sage-200"><BookOpen className="h-4 w-4" /> Blog UseCognia</p>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">Conteúdo prático para cuidar melhor da rotina profissional.</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">Guias sobre prontuário, agenda, privacidade e gestão para psicólogos que querem trabalhar com mais organização.</p>
          </div></div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-14 sm:py-16" aria-labelledby="artigos-recentes">
          <div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-sage-700">Biblioteca</p><h2 id="artigos-recentes" className="mt-2 text-3xl font-bold">Artigos recentes</h2></div><span className="hidden text-sm text-[#7C776B] sm:block">Novos conteúdos toda semana</span></div>
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map(post => (
              <article key={post.slug} className="group flex flex-col rounded-2xl border border-[#DDE5DC] bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-lifted sm:p-7">
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold"><span className="rounded-full bg-sage-50 px-3 py-1.5 text-sage-800">{post.category}</span><span className="inline-flex items-center gap-1.5 text-[#7C776B]"><CalendarDays className="h-3.5 w-3.5" /> {dateFormatter.format(new Date(`${post.publishedAt}T00:00:00Z`))}</span></div>
                <h3 className="mt-5 text-2xl font-bold leading-snug group-hover:text-sage-800"><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3>
                <p className="mt-3 flex-1 leading-relaxed text-[#5F5A51]">{post.description}</p>
                <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#ECEFEA] pt-5 text-sm"><span className="text-[#7C776B]">{post.readingMinutes} min de leitura</span><Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-1.5 font-bold text-sage-700 hover:text-sage-900">Ler artigo <ArrowRight className="h-4 w-4" /></Link></div>
              </article>
            ))}
          </div>
        </section>
        <section className="border-y border-[#DDE5DC] bg-white"><div className="mx-auto grid max-w-6xl items-center gap-7 px-5 py-12 md:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-4"><span className="rounded-xl bg-sage-50 p-3 text-sage-700"><ShieldCheck className="h-6 w-6" /></span><div><h2 className="text-xl font-bold">Compromisso editorial</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5F5A51]">Usamos fontes oficiais, mostramos a data de atualização e não tratamos conteúdo informativo como orientação clínica, ética ou jurídica individual.</p></div></div>
          <Link to="/seguranca" className="inline-flex items-center gap-2 font-bold text-sage-700 hover:text-sage-900">Conheça nossa segurança <ArrowRight className="h-4 w-4" /></Link>
        </div></section>
      </main>
    </BlogShell>
  )
}
