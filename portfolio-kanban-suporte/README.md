# Kanban Suporte

Quadro de atendimento para uma operacao de suporte B2B. O projeto simula uma fila de tickets com etapas de triagem, atendimento, espera pelo cliente e resolucao.

## Funcionalidades

- Busca por numero do ticket, cliente ou assunto.
- Filtro por prioridade.
- Movimento de tickets entre colunas.
- Contadores por coluna.
- Indicador de tickets criticos ainda abertos.
- Tags, responsavel e prazo de SLA em cada card.

## O que este projeto mostra

- Estado mutavel com React para atualizar o status dos tickets.
- Uso de tipos para controlar status e prioridade.
- Renderizacao de listas agrupadas por coluna.
- Componentizacao de cards, estatisticas e filtros.
- Interface responsiva para uma ferramenta de operacao.

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

- Adicionar drag and drop.
- Persistir os tickets em uma API.
- Criar tela de detalhe do ticket.
- Adicionar testes para movimentacao entre colunas.
