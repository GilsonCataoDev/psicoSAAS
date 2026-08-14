import test from 'node:test'
import assert from 'node:assert/strict'
import { buildNewsPost, parseRss, relevanceScore, selectNews } from './publish-daily-news.mjs'

const source = { name: 'CFP', host: 'site.cfp.org.br' }
const rss = `<?xml version="1.0"?><rss><channel><item>
  <title><![CDATA[CFP publica atualização sobre saúde mental]]></title>
  <link>https://site.cfp.org.br/noticia-exemplo/?utm_source=rss</link>
  <pubDate>Thu, 13 Aug 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[Orientação para psicólogos e profissionais de saúde mental.]]></description>
</item></channel></rss>`

test('interpreta RSS e remove parâmetros de rastreamento', () => {
  const [item] = parseRss(rss, source)
  assert.equal(item.title, 'CFP publica atualização sobre saúde mental')
  assert.equal(item.link, 'https://site.cfp.org.br/noticia-exemplo')
  assert.ok(relevanceScore(item) > 0)
})

test('seleciona apenas notícia recente, oficial e ainda não utilizada', () => {
  const [item] = parseRss(rss, source)
  const now = new Date('2026-08-13T15:00:00Z')
  assert.equal(selectNews([item], [], now).length, 1)
  assert.equal(selectNews([item], [{ references: [{ url: item.link }] }], now).length, 0)
  assert.equal(selectNews([{ ...item, link: 'https://example.com/copia' }], [], now).length, 0)
})

test('descarta notícia geral quando o tema psicológico não aparece no título', () => {
  const now = new Date('2026-08-13T15:00:00Z')
  const generalNews = {
    title: 'Estudo atualiza dados sobre doença renal',
    description: 'O portal também reúne conteúdos sobre saúde mental.',
    link: 'https://agenciabrasil.ebc.com.br/saude/noticia-exemplo',
    publishedAt: 'Thu, 13 Aug 2026 12:00:00 GMT',
    source: 'Agência Brasil — Saúde',
    expectedHost: 'agenciabrasil.ebc.com.br',
  }
  assert.equal(selectNews([generalNews], [], now).length, 0)
})

test('gera artigo cauteloso com referências e sem copiar descrição do feed', () => {
  const [item] = parseRss(rss, source)
  const post = buildNewsPost([item], '2026-08-13')
  assert.equal(post.slug, 'psicologia-em-pauta-2026-08-13')
  assert.equal(post.references[0].url, item.link)
  assert.doesNotMatch(JSON.stringify(post), /Orientação para psicólogos e profissionais/)
  assert.match(post.intro.join(' '), /informativo/)
})
