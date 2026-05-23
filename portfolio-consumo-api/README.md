# Consulta de Usuarios

Projeto React para demonstrar consumo basico de API REST. A aplicacao consulta usuarios da API publica JSONPlaceholder e exibe os dados em cards com busca local.

## Funcionalidades

- Requisicao HTTP com `fetch`.
- Estado de carregamento enquanto os dados sao buscados.
- Tratamento de erro quando a API nao responde corretamente.
- Botao para recarregar os dados.
- Busca por nome, email, empresa ou cidade.
- Cards responsivos com dados recebidos da API.

## O que este projeto mostra

- Uso de `useEffect` para carregar dados ao abrir a tela.
- Funcao assincroma com `async/await`.
- Validacao simples de resposta HTTP com `response.ok`.
- Tipagem TypeScript para o formato retornado pela API.
- Separacao entre dados remotos, estado de UI e renderizacao.

## API utilizada

```txt
https://jsonplaceholder.typicode.com/users
```

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

- Adicionar paginacao.
- Criar uma camada de servico para chamadas HTTP.
- Usar React Query para cache e revalidacao.
- Adicionar testes para loading, erro e sucesso.
