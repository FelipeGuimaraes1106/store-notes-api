# Arquitetura — store-notes-api

> Fonte de verdade sobre **como o código é organizado** e **onde cada coisa deve ficar**. Leia antes
> de criar ou mover qualquer arquivo. As regras numeradas estão em `docs/REGRAS.md`.

## 1. Visão geral

API do **Caderno Lojas** (protótipo), consumida pelo `store-notes-front`. Mesma arquitetura da
`smart-city-legacy`.

**Stack:** Node.js 24 + TypeScript, Fastify 5, Zod 3 (validação e OpenAPI via
`fastify-type-provider-zod` 4), Vitest. São as mesmas majors da `smart-city-legacy`, para código e
padrões passarem de um repo para o outro sem adaptação.

**Estado atual:** só o esqueleto — servidor, contrato de erro, CORS, `/docs` e `GET /health`. Ainda
não há domínio nem banco: o primeiro port nasce com mock (regra 3) e o Postgres entra com a primeira
tabela (Seção 8).

## 2. Por que Clean Architecture?

As dependências sempre apontam para dentro, das camadas externas para as internas. Isso garante que:

1. **Regra de negócio não depende de framework.** Um service não sabe que existe Fastify.
2. **Trocar a fonte de dados é barato.** Mock em memória ou Postgres: só a implementação do port
   muda, o use case nem percebe.
3. **Teste é simples.** Use case é classe com dependências no construtor e service é função pura —
   nada disso precisa subir servidor.

> **A pasta não é a camada.** `src/` é organizado por conceito (`models/`, `services/`,
> `repositories/`, `stores/`, `controllers/`, `db/`, `config/`), não por `domain/`/`application/`/
> `infrastructure/`. A Regra de Dependência vale do mesmo jeito; só não dá para ler a camada pelo
> nome da pasta de topo — o mapeamento está na Seção 3.

### A Regra de Dependência

```
controllers/rest (rotas) → application/use-cases → models/ + services/
        repositories/*.mock.repo.ts, *.postgres.repo.ts, db/ ↗ (implementam repositories/*.repository.ts)
```

A rota é ao mesmo tempo o adapter de entrada e infraestrutura (depende do Fastify): chama o use case
já montado no `container`, nunca instancia repositório nem acessa banco.

❌ **Proibido:** `models/` ou `services/` importar de `application/`, `repositories/`, `controllers/`
ou de pacote de framework (`fastify`, `zod`, `pg`).
❌ **Proibido:** `application/use-cases/` importar `*.mock.repo.ts`, `*.postgres.repo.ts`,
`controllers/` ou `fastify` — só o port (`repositories/*.repository.ts`) e
`stores/repositories.store.ts`.
❌ **Proibido:** qualquer arquivo além de `main.ts` importar `stores/repositories.mock.store.ts` ou
`stores/repositories.postgres.store.ts` — eles nomeiam implementação concreta.
❌ **Proibido:** rota (`controllers/rest/routes/*.ts`) tocar `pg` ou `fetch` — ela só chama
`container.<useCase>.execute(...)`.
❌ **Proibido:** lógica de negócio em rota ou repositório — pertence a `services/`.

## 3. Camadas (conceituais — não são pastas de topo)

### 3.1 `models/` + `services/` — o coração do negócio

Entidades, tipos e regras puras, sem dependência externa. Services são funções puras com contrato
explícito (`<name>.contracts.service.ts`), testadas em `tests/domain/`.

### 3.2 `application/use-cases/` + ports + `stores/` — casos de uso e contratos

- `application/use-cases/` — uma classe por ação (`list_things.ts` → `ListThings`), que recebe o
  `RepositoriesStore` no construtor e expõe `execute(...)`. Erro de negócio com status HTTP sai por
  `httpError(message, status)`: é o `.statusCode` dele que o error handler de `server.ts` devolve.
- `repositories/<name>.repository.ts` — o **port**: interface sem lógica, que a infraestrutura
  implementa. Mora na mesma pasta das implementações, mas conceitualmente é da camada de aplicação.
- `stores/repositories.store.ts` — `RepositoriesStore`, o registry tipado de todos os ports (chave em
  `snake_case`). É a lista única de dependências externas do domínio: um use case que precise de
  outro repositório passa a usar `this.store.<chave>`, sem mudar de assinatura.
- `stores/services.store.ts` — `ServicesStore`, uma chave por service apontando para o contrato, mais
  `ServicesContractCheck`, o tipo que só compila se cada módulo satisfaz seu contrato (o `implements`
  que um módulo de funções não pode declarar). Não é injetado: função pura não tem implementação
  alternativa para trocar.

### 3.3 Implementações — detalhes técnicos

- `repositories/*.mock.repo.ts` (memória, sempre presente) e `repositories/*.postgres.repo.ts`
  (banco), lado a lado com o port e distinguidos pelo sufixo. Seed extenso do mock fica em
  `repositories/__mock__/<name>.mock-data.ts`.
- `stores/repositories.mock.store.ts` / `stores/repositories.postgres.store.ts` — registram o
  **construtor** de cada implementação, com as mesmas chaves do `RepositoriesStore`. O construtor, e
  não a instância, porque é ele que carrega informação nova: a superfície pública da classe é a do
  port, a assinatura de construção não. Por nomearem classe concreta, só `main.ts` os importa.
- `db/` — pool do Postgres e tipos de linha (snake_case fiel à coluna; a conversão para camelCase
  acontece no repositório, nunca no tipo da linha).
- `config/env.ts` — variáveis de ambiente validadas com Zod: a API não sobe com configuração inválida.
- `controllers/rest/` — `server.ts` (Fastify, contrato de erro `{ erro }`, CORS, Swagger),
  `container.ts` (use cases já montados), `routes/<name>.ts` (um arquivo por recurso) e
  `schemas/<name>.ts` (Zod de request/response, que também gera o `/docs`).

### 3.4 `main.ts` — composition root

Declara as famílias de implementação como mapas `satisfies RepositoriesMockStore` /
`satisfies RepositoriesPostgresStore`, monta o `RepositoriesStore` em `buildRepositoriesStore()`
(escolhendo pelo `DATABASE_URL`), entrega-o ao `buildContainer()` e sobe o servidor. É o único
arquivo autorizado a dar `new` numa implementação de repositório.

## 4. Estrutura de pastas

Os arquivos marcados com ✓ já existem; o resto é onde cada coisa nasce.

```
src/
├── models/<name>.model.ts
├── services/<name>.service.ts + <name>.contracts.service.ts
├── application/use-cases/<verb_something>.ts (+ http_error.ts)
├── repositories/
│   ├── <name>.repository.ts            # port
│   ├── <name>.mock.repo.ts             # sempre
│   ├── <name>.postgres.repo.ts         # quando houver banco
│   └── __mock__/<name>.mock-data.ts
├── stores/
│   ├── repositories.store.ts           # contrato: chave → port (é o que use case recebe)
│   ├── repositories.mock.store.ts      # infra: chave → construtor mock (só main.ts)
│   ├── repositories.postgres.store.ts  # infra: chave → construtor Postgres (só main.ts)
│   └── services.store.ts               # chave → contrato do service + asserção
├── db/                                 # pool + tipos de linha
├── config/env.ts                       ✓
├── controllers/rest/
│   ├── server.ts                       ✓ Fastify, contrato de erro, CORS, Swagger
│   ├── container.ts                    # AppContainer: use cases com as deps injetadas
│   ├── routes/health.ts                ✓ (+ um arquivo por recurso)
│   └── schemas/health.ts               ✓ (+ um arquivo por recurso)
└── main.ts                             ✓ composition root

tests/
├── domain/<name>.service.test.ts       # regra pura
├── helpers/build_test_app.ts           # container com os mocks (nasce com o primeiro use case)
└── routes/*.test.ts                    ✓ via app.inject(), sempre com os mocks
```

## 5. Fluxo de uma requisição

`GET /v1/things/:id` (`Thing` é um placeholder — ainda não há domínio):

```
1. controllers/rest/routes/things.ts
        │  handler chama container.getThing.execute(request.params.id)
        ▼
2. application/use-cases/get_thing.ts → GetThing.execute()
        │  pede o dado ao port (this.store.thing_repository) e aplica a regra de services/;
        │  não achou → throw httpError(..., 404)
        ▼
3. repositories/thing.mock.repo.ts (ou thing.postgres.repo.ts)
        │  devolve ThingModel (models/thing.model.ts)
        ▼
4. A rota devolve o model; o schema Zod de schemas/thing.ts valida e serializa a resposta
```

```ts
// controllers/rest/routes/things.ts — caminho relativo: o /v1 vem do registro em server.ts.
app.withTypeProvider<ZodTypeProvider>().get(
  "/things/:id",
  { schema: { tags: ["things"], params: idParamsSchema, response: { 200: thingSchema, 404: errorSchema } } },
  async (request) => container.getThing.execute(request.params.id)
);
```

```ts
// application/use-cases/get_thing.ts
export class GetThing {
  constructor(private readonly store: RepositoriesStore) {}

  async execute(id: string): Promise<ThingModel> {
    const thing = await this.store.thing_repository.fetchById(id);
    if (!thing) throw httpError(`Thing ${id} não encontrado`, 404);
    return thing;
  }
}
```

## 6. Convenções

Nomes e idioma seguem a regra 6: arquivo em `snake_case`, símbolo em `PascalCase`, identificador em
inglês e prosa em português. Tipos compartilhados só em `models/`; endpoint novo = schema novo
(regra 4); todo port com mock (regra 3).

## 7. Guia rápido: a primeira funcionalidade

O esqueleto ainda não tem `stores/`, `container.ts` nem o prefixo `/v1`: eles nascem com o primeiro
recurso, no formato abaixo (o mesmo da `smart-city-legacy`). Exemplo: `GET /v1/things`.

1. **Domínio** — `models/thing.model.ts` (`ThingModel`); regra de cálculo, se houver, em `services/`
   com contrato e registro em `stores/services.store.ts`.
2. **Port + mock + stores**, no mesmo commit (regra 3):

```ts
// repositories/thing.repository.ts
export default interface ThingRepository {
  fetchAll(): Promise<ThingModel[]>;
}

// repositories/thing.mock.repo.ts — `things` vem de __mock__/thing.mock-data.ts
export class ThingMockRepository implements ThingRepository {
  async fetchAll(): Promise<ThingModel[]> {
    return things;
  }
}

// stores/repositories.store.ts — contrato: é o que o use case recebe
export default interface RepositoriesStore {
  thing_repository: import("../repositories/thing.repository.js").default;
}

// stores/repositories.mock.store.ts — infraestrutura: só main.ts importa
export default interface RepositoriesMockStore {
  thing_repository: new () => import("../repositories/thing.mock.repo.js").ThingMockRepository;
}
```

3. **Use case** — `application/use-cases/list_things.ts` (`ListThings`, recebe o `RepositoriesStore`).
4. **HTTP** — `controllers/rest/schemas/thing.ts` + `routes/things.ts`. `buildServer(container)`
   passa a receber o container e registra as rotas de negócio com `{ prefix: "/v1" }` — uma vez só,
   para todas; subir para `/v2` vira mudança de uma linha.
5. **Composition root:**

```ts
// controllers/rest/container.ts
export interface AppContainer {
  listThings: ListThings;
}

export function buildContainer(repositories: RepositoriesStore): AppContainer {
  return { listThings: new ListThings(repositories) };
}

// main.ts — único lugar que conhece classe concreta (regra 5)
const mockRepositories = {
  thing_repository: ThingMockRepository,
} satisfies RepositoriesMockStore;

function buildRepositoriesStore(): RepositoriesStore {
  return { thing_repository: new mockRepositories.thing_repository() };
}

const app = await buildServer(buildContainer(buildRepositoriesStore()));
```

6. **Testes** — `tests/helpers/build_test_app.ts` monta o mesmo container com os mocks, sem importar
   `main.ts` (que sobe o servidor no import); `tests/routes/things.test.ts` usa `app.inject()`.
7. **Checklist antes do push:**
   - [ ] Nenhum import de Fastify, `pg` ou `fetch` em `models/`, `services/` ou `application/`
   - [ ] Nenhuma lógica de negócio em `controllers/rest/routes`
   - [ ] Endpoint novo tem schema Zod de response (aparece no `/docs`)
   - [ ] Port com método novo → todas as implementações e os stores atualizados
   - [ ] Arquivo novo em `snake_case`

## 8. Evolução prevista

- [ ] Primeiro recurso do domínio, com `stores/`, `container.ts` e o prefixo `/v1` (Seção 7)
- [ ] Postgres: `pg`, `db/pool.ts`, `stores/repositories.postgres.store.ts`, `DATABASE_URL` em
      `config/env.ts` e o ramo Postgres em `buildRepositoriesStore()` — o mock continua existindo
      como fallback, não é substituído
- [ ] Docker e CI quando houver onde publicar

## 9. Glossário

| Termo | Significado |
|---|---|
| **Port** | Interface `<Name>Repository` em `repositories/<name>.repository.ts`, implementada pela infraestrutura |
| **Use case** | Classe em `application/use-cases/` (arquivo snake_case, classe PascalCase) que orquestra o domínio para resolver uma ação |
| **Composition root** | `main.ts`: único ponto que instancia implementação concreta e a injeta nos use cases |
| **Mock repository** | Implementação em memória de um port — é o que roda sem banco e nos testes |
