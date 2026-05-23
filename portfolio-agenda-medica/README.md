# Agenda Medica

Painel de agenda diaria para uma clinica de saude. A ideia do projeto e simular uma tela operacional usada por recepcao ou equipe clinica para acompanhar consultas, pendencias e informacoes rapidas do atendimento.

## Funcionalidades

- Busca por paciente, profissional ou observacao da consulta.
- Filtro por status: confirmada, pendente ou acao clinica.
- Indicadores calculados a partir da lista de consultas.
- Cards com horario, duracao, sala, modalidade e observacao.
- Layout responsivo para uso em desktop e telas menores.

## O que este projeto mostra

- Componentizacao com React e TypeScript.
- Uso de `useState` e `useMemo` para filtros e dados derivados.
- Modelagem simples de tipos para entidades de agenda.
- CSS responsivo sem framework visual.
- Cuidado com hierarquia de informacao em tela de rotina.

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

- Integrar com uma API de agendamentos.
- Adicionar criacao e edicao de consulta.
- Persistir filtros na URL.
- Adicionar testes de componentes para os estados de filtro.
