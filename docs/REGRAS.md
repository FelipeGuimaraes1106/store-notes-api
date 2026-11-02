# Regras do projeto — store-notes-api

Regras permanentes de código deste repositório. Código e documentos citam "regra N" por esta
numeração. São as regras da `smart-city-legacy`, sem o que era específico do Mad Builder. Camadas,
pastas e fluxos: `docs/ARQUITETURA.md`. Branches e commits: `docs/BRANCHING_STRATEGY.md`.

## Regras

1. **Regra de Dependência:** `models/` e `services/` não importam nada de outras partes do projeto; `application/use-cases/` importa só de `models/`, `services/`, de `stores/repositories.store.ts` e das interfaces de `repositories/*.repository.ts` (os ports); as implementações (`repositories/*.mock.repo.ts`, `repositories/*.postgres.repo.ts`, `controllers/rest/`, `db/`) implementam esses ports e são o único lugar que toca Fastify, `pg` ou `fetch`. **`stores/` tem três naturezas:** `repositories.store.ts` é contrato (só referencia port, e é o que use case recebe); `repositories.mock.store.ts` e `repositories.postgres.store.ts` referenciam classe concreta, são infraestrutura e **só `main.ts` importa** — use case importar um deles quebra a Regra de Dependência; `services.store.ts` aponta para os contratos de `services/*.contracts.service.ts` e carrega a asserção que os valida (ninguém o importa).
2. **Sem lógica de negócio em rotas ou repositórios.** Cálculo e regra vão para `services/`, como funções puras testáveis (`tests/domain/`); orquestração vai para `application/use-cases/`. Rota Fastify só chama `container.<useCase>.execute(...)`.
3. **Todo port precisa de implementação mock.** Ao criar ou estender um port (`repositories/<name>.repository.ts`), atualize no mesmo commit a implementação `repositories/<name>.mock.repo.ts` **e a chave nos stores** (`repositories.store.ts`, `repositories.mock.store.ts` e, quando houver banco, `repositories.postgres.store.ts`) — o TypeScript estrito quebra o build se faltar um. É o mock que faz o projeto rodar sem banco.
4. **Endpoint novo = schema Zod novo.** Toda rota tem schema de request/response em `controllers/rest/schemas/<name>.ts` — é o que valida a entrada, serializa a saída e gera o `/docs`.
5. **Só `main.ts` decide implementação concreta** (mock vs. Postgres), num lugar único: `buildRepositoriesStore()`, que devolve o `RepositoriesStore` injetado em todos os use cases. As famílias de classe ficam declaradas em `main.ts` como mapas validados por `satisfies RepositoriesMockStore` / `satisfies RepositoriesPostgresStore` — é o que garante, na declaração, que nenhum port ficou sem implementação e que a assinatura de construção continua certa. Use cases e rotas recebem tudo pronto via `container` (`controllers/rest/container.ts`) — nunca instanciam repositório.
6. **Todo identificador em inglês** — tipo, classe, função, método, variável e parâmetro (`erro` → `error`, `coluna` → `column`). **Comentário, JSDoc, mensagem de console e texto de erro ficam em português**: a regra é sobre código, não sobre prosa. Nome de **arquivo em `snake_case`**, símbolo exportado em `PascalCase`:
   - `<name>.model.ts` → interface `<Name>Model` (+ `<Name>FormData` quando houver payload de escrita, no mesmo arquivo);
   - `<name>.repository.ts` → `export default interface <Name>Repository`, **sem prefixo `I`** (tipo auxiliar do mesmo arquivo vai com export nomeado);
   - `<name>.mock.repo.ts` → classe `<Name>MockRepository`; `<name>.postgres.repo.ts` → classe `<Name>PostgresRepository`;
   - `<name>.service.ts` → funções puras exportadas, com o contrato em `<name>.contracts.service.ts` (`export default interface <Name>Service`, membros declarados como **propriedade de função** — `name: (a) => b`, não `name(a): b` —, porque só essa forma é checada contravariantemente pelo `strictFunctionTypes`; tipo auxiliar do service mora no contrato);
   - use case em `<verb_something>.ts` → classe `<VerbSomething>` com método `execute()`;
   - chaves dos stores em `snake_case`, espelhando o nome do arquivo: `<name>.repository.ts` → `<name>_repository`, `<name>.service.ts` → `<name>_service`.

   Tipos compartilhados vivem em `models/`, nunca duplicados em rotas ou schemas. **Exceção — contrato com o front:** as respostas de erro usam `erro` e `detalhes`, em português, o mesmo contrato da `smart-city-legacy` que o `http_client` dos fronts lê; quando a variável interna precisar do nome em inglês, mapeie no ponto de uso. `docs/ARQUITETURA.md` e `docs/REGRAS.md` ficam com nome em português de propósito: são prosa portuguesa do começo ao fim.
7. **Commits atômicos, por camada.** Um commit = uma mudança lógica; numa feature que atravessa camadas, a sequência segue domínio (`models`/`services`) → aplicação (`use-cases`, ports em `repositories/*.repository.ts`) → infraestrutura (`*.mock.repo.ts`/`*.postgres.repo.ts`, `controllers/rest`), cada commit compilando sozinho (`npm run lint` verde). Mensagem `<type>(<scope>): descrição` em inglês, presente do indicativo, ≤ 72 caracteres. Nunca commitar direto em `main`/`develop`: crie `feature/<nome>` a partir de `develop` **antes** do primeiro commit e apague a branch depois do merge.
8. **Não suponha: pergunte.** Antes de implementar algo não trivial ou sem spec clara, alinhe o escopo — uma pergunta por vez, com a resposta recomendada e a justificativa, esperando a confirmação. Vale em dobro para regra de negócio e para nome/tipo de dado que ainda não estão documentados.
9. Em caso de dúvida sobre onde um arquivo fica ou como um fluxo atravessa as camadas, consulte `docs/ARQUITETURA.md` (Seções 3, 4 e 7) ou a tabela abaixo.

## Onde cada coisa fica

| O que você vai criar | Onde |
|---|---|
| Entidade/tipo de domínio | `src/models/<name>.model.ts` (interface `<Name>Model` + `<Name>FormData`) |
| Regra pura (cálculo, status, validação de negócio) | `src/services/<name>.service.ts` + contrato em `src/services/<name>.contracts.service.ts` |
| Registrar o service novo | `src/stores/services.store.ts`: a chave `<name>_service` **e** a entrada em `ServicesContractCheck` (só o service novo sem registro não quebra o build — o resto quebra) |
| Caso de uso (um por arquivo) | `src/application/use-cases/<verb_something>.ts` (classe `<VerbSomething>` com método `execute()`) |
| Erro de negócio com status HTTP | `httpError(message, status)`, em `src/application/use-cases/http_error.ts` |
| Contrato de repositório (port) | `src/repositories/<name>.repository.ts` (`export default interface <Name>Repository`) |
| Registrar o port novo no registry de contrato | `src/stores/repositories.store.ts` (interface `RepositoriesStore`, chave `<name>_repository`) |
| Registrar as implementações do port | `src/stores/repositories.mock.store.ts` (+ `repositories.postgres.store.ts` quando houver banco): mesma chave, tipo de **construtor**; só `main.ts` importa |
| Implementação mock (sempre obrigatória) | `src/repositories/<name>.mock.repo.ts`; seed extenso em `src/repositories/__mock__/<name>.mock-data.ts` |
| Implementação Postgres | `src/repositories/<name>.postgres.repo.ts` (classe `<Name>PostgresRepository`) |
| Schema Zod de request/response | `src/controllers/rest/schemas/<name>.ts` |
| Rota Fastify | `src/controllers/rest/routes/<name>.ts`, registrada em `server.ts` sob `/v1` |
| Wiring da composition root | `src/controllers/rest/container.ts` (tipo `AppContainer`) + `src/main.ts` (`buildRepositoriesStore()`) |
