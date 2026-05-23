# Financeiro SaaS

Dashboard financeiro para uma operacao SaaS B2B. O projeto simula uma visao mensal de receita, faturas em aberto e risco de atraso, com foco em leitura rapida para times administrativos.

## Funcionalidades

- Indicadores de receita recebida, valores em aberto e contas em risco.
- Lista de faturas recentes com cliente, plano, vencimento, valor e status.
- Filtro por status da fatura.
- Grafico simples de MRR por plano usando CSS.
- Layout responsivo com adaptacao da tabela para telas menores.

## O que este projeto mostra

- Manipulacao de listas e filtros no React.
- Calculo de metricas a partir de dados locais.
- Formatacao de moeda e datas no padrao brasileiro.
- Organizacao visual de dashboard administrativo.
- Separacao clara entre dados, estado e componentes de apresentacao.

## Stack

- React
- TypeScript
- Vite
- CSS
- Lucide React

## Como rodar

```bash
npm install
npm run dev
```

## Possiveis melhorias

- Conectar a uma API de cobrancas.
- Adicionar ordenacao por vencimento ou valor.
- Incluir exportacao real em CSV.
- Criar testes para os calculos financeiros.
