# Radar de Psicólogos (prospecção B2B interna)

Ferramenta administrativa para descobrir psicólogos com presença profissional
pública e sinais de baixa maturidade digital (provável agenda/prontuário/
cobrança manuais), pontuar esses sinais de forma explicável e apresentá-los
em `/admin/prospeccao` para aprovação humana. **Nenhuma mensagem é enviada
automaticamente nesta versão** — o sistema produz apenas rascunhos, após
aprovação manual de um administrador.

## Arquitetura

Módulo `backend/src/modules/prospecting/`, seguindo os mesmos padrões dos
demais módulos administrativos do UseCognia (ex: `churn`):

```
providers/      SearchProvider (interface) + MockSearchProvider + GenericHttpSearchProvider
query-builder/  monta queries a partir de profissão/cidade/estado/abordagem + termos negativos
crawler/        SsrfGuard + RobotsService + SiteCrawlerService (só sites próprios)
scoring/        signal-detectors.ts (puro/testável) + ScoringService (soma e limita 0-100)
dedup/          DedupeService — 6 regras de match, nesta ordem
draft/          DraftService — gera rascunho só após aprovação humana
jobs/           5 jobs idempotentes, gated por PROSPECTING_ENABLED
entities/       Prospect, ProspectSignal, ProspectActivity, ProspectingSearch
```

Frontend: `frontend/src/pages/admin/ProspectingPage.tsx` +
`frontend/src/hooks/api/prospecting.ts`, rota `/admin/prospeccao` (protegida
por `AdminRoute`, mesmo padrão de `/admin/churn`).

## Fluxo

1. Administrador configura uma busca (cidade, estado, abordagem, modalidade,
   fontes) em `/admin/prospeccao` e pode **simular** antes de executar.
2. `QueryBuilderService` monta as queries (incluindo operadores
   `site:linkedin.com/in` e `site:psymeetsocial.com` quando aplicável) e
   aplica termos negativos (`-paciente -vaga -CRP ...`).
3. `SearchProvider` (mock ou HTTP real) executa as buscas. **Nunca acessa
   diretamente** as URLs de LinkedIn/PsyMeet retornadas — só persiste
   title/url/snippet/source/position/discoveredAt.
4. `DedupeService` verifica se o resultado já existe (domínio → e-mail →
   telefone → URL canônica → nome+cidade → LinkedIn/PsyMeet URL). Duplicatas
   viram uma `ProspectActivity` de merge; novidades viram um `Prospect` com
   status `discovered`.
5. Ao analisar (`POST .../prospects/:id/analyze`), se a fonte for um site
   próprio, o `SiteCrawlerService` busca até `PROSPECTING_MAX_PAGES_PER_DOMAIN`
   páginas (homepage/contato/agendamento), respeitando robots.txt, SSRF guard
   e rate-limit. `signal-detectors.ts` extrai sinais públicos; `ScoringService`
   soma os pontos e limita a 0-100.
6. Score ≥ `PROSPECTING_MIN_SCORE` marca o lead como `qualified`.
7. Um administrador revisa o lead (`/admin/prospeccao`), vê todas as
   evidências e pode **aprovar**, **descartar**, marcar **não contatar** ou
   **excluir**.
8. Só após `approve()` é possível gerar um rascunho (`DraftService`) — nunca
   enviado, apenas exibido para o administrador copiar manualmente.

## Limites de coleta (obrigatórios)

- **Sem scraping de LinkedIn**: descoberta só via resultados indexados de um
  provedor de busca autorizado (`site:linkedin.com/in ...`). O crawler
  (`SiteCrawlerService`) bloqueia explicitamente qualquer domínio
  `linkedin.com` — testado em `crawler/site-crawler.service.spec.ts`.
- **Sem scraping do PsyMeet sem autorização confirmada**: mesma lógica —
  domínios `psymeetsocial.com`/`psymeet.com.br` são bloqueados no crawler.
  Antes de qualquer crawling direto de um site profissional, verificamos:
  1. robots.txt (`RobotsService`, falha fechada — bloqueia se não conseguir
     verificar);
  2. Nesta versão, **não** fizemos crawling do PsyMeet porque não há
     confirmação registrada de que os Termos de Uso da plataforma permitem
     acesso automatizado de terceiros para fins comerciais. Essa decisão está
     codificada (não é um TODO): `BLOCKED_DOMAINS` em `site-crawler.service.ts`.
     Se uma revisão jurídica futura confirmar autorização, o domínio pode ser
     removido dessa lista.
- **Sem SSRF**: `SsrfGuard` resolve DNS e bloqueia IPs privados/loopback/
  link-local antes de qualquer requisição, inclusive em cada hop de redirect.
- **Sem dados sensíveis/de pacientes**: os detectores só operam sobre texto
  público de páginas institucionais (homepage/contato/agendamento) e nunca
  armazenam orientação sexual, religião, saúde, CPF, endereço residencial etc.
- **Sem envio automático**: não existe nenhum código neste módulo capaz de
  enviar e-mail, WhatsApp ou mensagem de LinkedIn. `DraftService` não tem
  nenhuma dependência de envio (verificado em `draft.service.spec.ts`).

## Configuração do provider real

Por padrão, `PROSPECTING_SEARCH_PROVIDER=mock` — nenhuma chamada de rede é
feita, resultados sintéticos determinísticos são gerados para desenvolvimento
e testes.

### Opção recomendada: Google Custom Search JSON API (grátis até 100 buscas/dia)

1. [Google Cloud Console](https://console.cloud.google.com) → criar/selecionar um projeto → **APIs & Services → Credentials** → criar uma **API key**. Restrinja a key à "Custom Search API" (Enable a API primeiro em **APIs & Services → Library**).
2. [Programmable Search Engine](https://programmablesearchengine.google.com) → criar um mecanismo novo → em "Sites to search" escolha "Search the entire web" → copie o **Search engine ID** (`cx`).
3. Configure:

```
PROSPECTING_ENABLED=true
PROSPECTING_SEARCH_PROVIDER=google
PROSPECTING_SEARCH_API_KEY=<API key do passo 1>
PROSPECTING_SEARCH_ENGINE_ID=<cx do passo 2>
```

`GoogleCustomSearchProvider` (`backend/src/modules/prospecting/providers/google-custom-search.provider.ts`) já lida com o formato de resposta do Google (`items[]`) e para de tentar novamente automaticamente quando a cota diária estoura (HTTP 429) — evita gastar tentativas à toa quando a cota já acabou.

### Alternativa: provider HTTP genérico

Para qualquer outra API de busca web autorizada:

```
PROSPECTING_ENABLED=true
PROSPECTING_SEARCH_PROVIDER=http
PROSPECTING_SEARCH_API_KEY=<sua chave>
PROSPECTING_SEARCH_BASE_URL=<endpoint GET da API>
```

O `GenericHttpSearchProvider` espera uma resposta JSON no formato
`{ results: [{ title, url, snippet }] }` (ou `items` com `link`/`description`),
autenticação via header `Authorization: Bearer <key>`.
Se o provedor escolhido usa um formato diferente, ajuste `parseResponse()` em
`backend/src/modules/prospecting/providers/generic-http-search.provider.ts`.

## Executando uma busca de teste

Com o backend rodando e `PROSPECTING_SEARCH_PROVIDER=mock` (padrão):

```bash
curl -X POST http://localhost:3001/admin/prospecting/searches/preview \
  -H "Content-Type: application/json" \
  --cookie "<cookie de sessão admin>" \
  -d '{"city":"Campinas","state":"SP","sources":["own_site","linkedin_search","psymeet_search"]}'
```

Ou pelo painel: `/admin/prospeccao` → "Nova busca" → "Simular" (não persiste
nada) ou "Executar busca" (persiste leads).

## Jobs em background

Os 5 jobs (`discoverProspects`, `analyzePendingProspects`,
`expireOldProspects`, `retryFailedAnalyses`, `calculateProspectingMetrics`)
seguem o padrão de `OnModuleInit` + `setInterval` + `AdvisoryLockService` já
usado por `ChurnScoreJob`, mas **só se registram se `PROSPECTING_ENABLED=true`**
— por padrão nada roda automaticamente em produção.

## LGPD

Ver [`PROSPECTING_PRIVACY_CHECKLIST.md`](./PROSPECTING_PRIVACY_CHECKLIST.md).
