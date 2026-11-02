# store-notes-api

API Node.js/TypeScript do **Caderno Lojas** (protótipo). O front é o
[`store-notes-front`](https://github.com/FelipeGuimaraes1106/store-notes-front).

Mesmo padrão da `smart-city-legacy`: Fastify + Zod (validação e OpenAPI) e Clean Architecture
organizada por conceito, com repositório mock para rodar sem banco.

## Rodar

Node 24 (`.node-version`).

```bash
cp .env.example .env
npm install
npm run dev
```

- `GET http://localhost:3333/health` — status da API
- `http://localhost:3333/docs` — Swagger, gerado dos schemas Zod das rotas

| Script | O que faz |
| --- | --- |
| `npm run dev` | `tsx watch` em `src/main.ts` |
| `npm run build` | Compila para `dist/` |
| `npm start` | Roda o build |
| `npm run lint` | Typecheck de `src/` e `tests/` |
| `npm test` | vitest, sem banco e sem rede |
