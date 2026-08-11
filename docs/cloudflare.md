# Cloudflare — guia de configuração manual (proxy/CDN gratuito)

Este documento cobre a configuração manual do Cloudflare na frente da API e do frontend. **Nenhuma configuração de DNS é feita automaticamente pelo código** — tudo aqui é feito manualmente pelo usuário no painel do Cloudflare.

## Por que

Cloudflare (tier gratuito) oferece proxy reverso com HTTPS, mitigação de DDoS na borda, WAF básico e cache de assets estáticos, sem custo, sem trocar o provedor de hospedagem atual (Railway/Vercel).

## O código já está pronto

- `main.ts` já confia no primeiro proxy (`trust proxy: 1`) — necessário para que `req.ip` (usado pelo rate limiting) reflita o IP real do visitante em vez do IP do proxy. Cloudflare já popula `X-Forwarded-For` corretamente, então nenhuma mudança de código é necessária.
- CORS já usa whitelist explícita de origins (`ALLOWED_ORIGINS`/`FRONTEND_URL`).
- Cookies de sessão já são `httpOnly` + `secure` (produção) + `sameSite` apropriado.
- Rate limiting global já ativo (`ThrottlerModule`, 3 req/s + 100 req/min por IP).

## Passo a passo manual

1. **Adicionar o domínio ao Cloudflare** (painel → Add a Site), plano Free.
2. **Atualizar os nameservers** do domínio no registrador para os fornecidos pelo Cloudflare (fora do escopo deste repositório — feito no painel do registrador).
3. **DNS**: criar registros A/CNAME para a API (Railway) e o frontend (Vercel) apontando para os hosts atuais, com o ícone de nuvem **laranja** ("Proxied") ativado — isso ativa o proxy/CDN/WAF.
4. **SSL/TLS → Overview**: selecionar modo **"Full (strict)"** — exige certificado válido na origem (Railway/Vercel já fornecem TLS automático, então isso funciona sem configuração extra).
5. **SSL/TLS → Edge Certificates**: ativar "Always Use HTTPS" e "Automatic HTTPS Rewrites".
6. **WAF gratuito**: em Security → WAF, as regras gerenciadas do Free tier já cobrem OWASP básico. Opcional: adicionar uma regra de rate limiting adicional na borda (Security → Rate limiting rules) como camada extra além do rate limit já existente na aplicação.
7. **Bot Fight Mode** (Security → Bots): pode ser ativado no Free tier para reduzir tráfego automatizado malicioso.
8. **Cache**: como a API é dinâmica (autenticada), garantir que as rotas de `/api/*` **não** sejam cacheadas — criar uma Page Rule ou Cache Rule com "Cache Level: Bypass" para o subdomínio/rota da API. O frontend estático (Vercel) pode usar cache padrão.

## Atenção — não afrouxar a CSP

A Content-Security-Policy definida em `backend/src/main.ts` (`script-src 'self'`, sem `unsafe-inline`) **não deve ser relaxada** para acomodar features do Cloudflare. Especificamente:

- **Rocket Loader** (otimização de carregamento de JS): injeta um script de terceiro no HTML e quebra `script-src 'self'`. Manter **desativado** (Speed → Optimization → Rocket Loader: Off).
- **Email Obfuscation / Auto Minify / outras injeções de script**: revisar antes de ativar qualquer feature que reescreva HTML/JS servido pelo frontend, pelo mesmo motivo.
- Se algum recurso do Cloudflare exigir ajuste de CSP, ajustar a diretiva especificamente (nunca usar `unsafe-inline`/`unsafe-eval` como atalho) e documentar aqui o motivo.

## Custo

Tudo listado acima está dentro do plano **Free** do Cloudflare. Custos só apareceriam se o usuário optar manualmente por planos pagos (Pro/Business) ou por produtos adicionais (ex.: Argo, Load Balancing) — nenhum deles é necessário para o que está documentado aqui.
