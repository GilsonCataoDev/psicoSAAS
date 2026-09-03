import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, ExternalLink } from 'lucide-react'
import BlogShell from '@/components/blog/BlogShell'
import postsJson from '@/content/blog-posts.json'
import { usePageSeo } from '@/lib/pageSeo'
import type { BlogPost } from '@/types/blog'

const posts = postsJson as BlogPost[]
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })

function Article({ post }: { post: BlogPost }) {
  const canonicalPath = `/blog/${post.slug}`
  const absoluteImage = new URL(post.image, 'https://usecognia.com.br').toString()
  const relatedPosts = post.relatedSlugs.map(slug => posts.find(item => item.slug === slug)).filter((item): item is BlogPost => Boolean(item))
  const faqSchema = post.faq?.length ? { '@type': 'FAQPage', mainEntity: post.faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) } : null
  usePageSeo({
    title: `${post.title} | UseCognia`,
    description: post.description,
    canonicalPath,
    type: 'article',
    image: absoluteImage,
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    section: post.category,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'BlogPosting', headline: post.title, description: post.description, image: absoluteImage, datePublished: post.publishedAt, dateModified: post.updatedAt, inLanguage: 'pt-BR', mainEntityOfPage: `https://usecognia.com.br${canonicalPath}`, author: { '@type': 'Organization', name: post.author, url: 'https://usecognia.com.br' }, publisher: { '@type': 'Organization', name: 'UseCognia', url: 'https://usecognia.com.br', logo: { '@type': 'ImageObject', url: 'https://usecognia.com.br/pwa-512.png' } }, keywords: post.keywords.join(', ') },
        { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://usecognia.com.br/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://usecognia.com.br/blog' },
          { '@type': 'ListItem', position: 3, name: post.title, item: `https://usecognia.com.br${canonicalPath}` },
        ] },
        ...(faqSchema ? [faqSchema] : []),
      ],
    },
  })
  return (
    <BlogShell>
      <main><article>
        <header className="border-b border-[#DDE5DC] bg-white dark:border-white/10 dark:bg-[#17211D]"><div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
          <nav aria-label="Navegação estrutural" className="flex flex-wrap items-center gap-2 text-sm"><Link to="/" className="font-semibold text-sage-700 hover:text-sage-900 dark:text-sage-200 dark:hover:text-white">Início</Link><span aria-hidden="true" className="text-neutral-400">/</span><Link to="/blog" className="inline-flex items-center gap-1.5 font-semibold text-sage-700 hover:text-sage-900 dark:text-sage-200 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> Blog</Link><span aria-hidden="true" className="text-neutral-400">/</span><span className="text-[#7C776B] dark:text-neutral-300">{post.category}</span></nav>
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.16em] text-sage-700 dark:text-sage-200">{post.category}</p>
          <h1 className="mt-4 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl">{post.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-[#5F5A51] dark:text-neutral-300">{post.description}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#ECEFEA] pt-5 text-sm text-[#7C776B] dark:border-white/10 dark:text-neutral-300"><span>Por {post.author}</span><span>Atualizado em {dateFormatter.format(new Date(`${post.updatedAt}T00:00:00Z`))}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> {post.readingMinutes} min</span></div>
          <img src={post.image} alt={`Capa do artigo ${post.title}`} width="1200" height="630" className="mt-8 aspect-[1200/630] w-full rounded-2xl border border-[#DDE5DC] object-cover dark:border-white/10" />
        </div></header>
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_240px] lg:py-16">
          <div className="min-w-0 max-w-3xl text-[1.04rem] leading-8 text-[#49443D] dark:text-neutral-200">
            {post.intro.map(paragraph => <p key={paragraph} className="mb-5 text-justify">{paragraph}</p>)}
            {post.sections.map(section => <section key={section.heading} className="mt-10"><h2 className="mb-4 text-2xl font-bold leading-snug text-[#211F1C] dark:text-neutral-50">{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph} className="mb-5 text-justify">{paragraph}</p>)}</section>)}
            {post.faq?.length ? <section className="mt-12 border-t border-[#DDE5DC] pt-8 dark:border-white/10"><h2 className="text-2xl font-bold text-[#211F1C] dark:text-neutral-50">Perguntas frequentes</h2><div className="mt-5 space-y-6">{post.faq.map(item => <div key={item.question}><h3 className="font-bold text-[#211F1C] dark:text-neutral-50">{item.question}</h3><p className="mt-2 text-justify text-base leading-7">{item.answer}</p></div>)}</div></section> : null}
            <section className="mt-12 rounded-2xl border border-sage-200 bg-sage-50 p-6 dark:border-sage-400/20 dark:bg-sage-400/10 sm:p-8"><h2 className="text-2xl font-bold text-sage-900 dark:text-sage-100">Checklist rápido</h2><ul className="mt-5 space-y-3">{post.checklist.map(item => <li key={item} className="flex items-start gap-3 text-base leading-6 text-sage-900 dark:text-neutral-100"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage-600 dark:text-sage-200" /> {item}</li>)}</ul></section>
            <section className="mt-12 border-t border-[#DDE5DC] pt-8 dark:border-white/10"><h2 className="text-xl font-bold text-[#211F1C] dark:text-neutral-50">Fontes consultadas</h2><ul className="mt-4 space-y-3 text-sm leading-6">{post.references.map(reference => <li key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2 font-semibold text-sage-700 underline decoration-sage-300 underline-offset-4 hover:text-sage-900 dark:text-sage-200 dark:hover:text-white">{reference.label} <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0" /></a></li>)}</ul><p className="mt-6 rounded-lg bg-[#F0F1ED] p-4 text-sm leading-6 text-[#5F5A51] dark:bg-white/5 dark:text-neutral-300">Conteúdo informativo. Ele não substitui avaliação profissional nem orientação individual do CFP, do CRP ou de assessoria jurídica especializada.</p></section>
            {relatedPosts.length > 0 && <section className="mt-12 border-t border-[#DDE5DC] pt-8 dark:border-white/10"><h2 className="text-xl font-bold text-[#211F1C] dark:text-neutral-50">Continue lendo</h2><div className="mt-4 grid gap-4">{relatedPosts.map(item => <Link key={item.slug} to={`/blog/${item.slug}`} className="group rounded-xl border border-[#DDE5DC] bg-white p-4 transition hover:border-sage-300 dark:border-white/10 dark:bg-[#17211D]"><span className="text-xs font-bold uppercase tracking-wide text-sage-700">{item.category}</span><span className="mt-1 flex items-center justify-between gap-3 font-bold text-[#211F1C] group-hover:text-sage-700 dark:text-neutral-50">{item.title}<ArrowRight className="h-4 w-4 shrink-0" /></span></Link>)}</div></section>}
          </div>
          <aside className="h-fit rounded-2xl border border-[#DDE5DC] bg-white p-5 dark:border-white/10 dark:bg-[#17211D] lg:sticky lg:top-24"><p className="text-sm font-bold text-[#211F1C] dark:text-neutral-50">Organize sua rotina no UseCognia</p><p className="mt-2 text-sm leading-6 text-[#5F5A51] dark:text-neutral-300">Agenda, pacientes, prontuário, documentos e financeiro em um só lugar.</p><Link to="/cadastro" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-sage-800 px-4 py-3 text-sm font-bold text-white hover:bg-sage-900">Testar grátis <ArrowRight className="h-4 w-4" /></Link><p className="mt-3 text-center text-xs text-[#7C776B] dark:text-neutral-300">Sem cartão para começar.</p></aside>
        </div>
      </article></main>
    </BlogShell>
  )
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const post = posts.find(item => item.slug === slug)
  return post ? <Article post={post} /> : <Navigate to="/blog" replace />
}
