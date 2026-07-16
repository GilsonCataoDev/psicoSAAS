# Graphify no UseCognia

O Graphify é usado somente no desenvolvimento para mapear relações entre o frontend, backend e migrations. Ele não faz parte do build ou do deploy e não deve receber acesso ao banco de produção.

## Primeiro uso

Na raiz do projeto:

```bash
npm run graphify:setup
npm run graphify
```

O setup cria um ambiente Python isolado em `.tools/graphify` e instala a versão fixada pelo projeto com suporte a SQL. O mapa é gerado em `graphify-out/`, incluindo `graph.html`, `GRAPH_REPORT.md` e `graph.json`. O script força `--code-only` e `--no-label`, portanto não inicia análise semântica de documentos, imagens ou mídia e não usa uma API de IA.

Esses diretórios estão no `.gitignore`: são artefatos locais, não documentação pública.

## Regras de segurança

- Execute contra os arquivos do repositório, nunca com uma URL ou credencial do PostgreSQL.
- Não copie exports, anexos, backups, `.env` ou dados reais de pacientes para a pasta analisada.
- Não instale introspecção de banco nem configure backends de IA para este fluxo.
- Revise qualquer relatório antes de compartilhar: ele pode revelar nomes de arquivos, módulos e detalhes internos da arquitetura.
- A atualização da versão deve ser feita conscientemente no `scripts/graphify.mjs` e validada em ambiente isolado.

## Consultas úteis

Depois de gerar o mapa, use o executável isolado ou passe argumentos pelo script:

```bash
npm run graphify -- explain "Patient"
npm run graphify -- path "Booking" "Financial"
npm run graphify -- query "onde o isolamento por psicólogo é aplicado?"
```
