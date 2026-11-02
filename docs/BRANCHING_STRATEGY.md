# Branching Strategy & Commit Standards — store-notes-api

GitHub Flow simplificado, o mesmo dos repositórios Smart City.

## 1. Branches

```
feature/* → develop → main
```

| Branch | Para quê | Regras |
|---|---|---|
| `main` | Código estável, pronto para publicar | Nunca desenvolver nela; recebe só PR vindo da `develop` |
| `develop` | Integração do trabalho | Criada a partir da `main`; recebe as `feature/*` via PR |
| `feature/<short-description>` | Uma funcionalidade, melhoria ou ajuste | Sempre a partir da `develop`, nome curto em inglês; apagada depois do merge |

Exemplos de nome: `feature/project-scaffold`, `feature/seed-repositories`, `feature/health-check`.

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<short-description>
```

Uma feature por branch; não reutilize branch de feature. `develop` e `main` nunca são apagadas.

## 2. Commits

```
<type>(<scope>): <short description>
```

- Inglês, verbo no presente (add, fix, extract, move), sem ponto final, título com no máximo
  **72 caracteres**.
- Corpo opcional e curto (até ~5 linhas): o *porquê*, não o *quê* — o diff já mostra o quê.
- **Um commit = uma mudança lógica.** Commite durante o trabalho, a cada mudança concluída, nunca
  um commit gigante no final. Se o diff mistura contextos (dado mock + regra + rota), divida com
  `git add <arquivo>` ou `git add -p`. Corpo pedindo mais de ~5 linhas é sinal de 2+ commits.
- A sequência segue as camadas (base primeiro, HTTP por último), e cada commit compila sozinho
  (`npm run lint` verde).

| type | quando usar |
|---|---|
| feat | nova funcionalidade |
| fix | correção de bug |
| refactor | refatoração sem mudar comportamento |
| style | formatação/lint, sem lógica |
| docs | documentação |
| test | testes |
| chore | configs, dependências, scripts |

**Scopes:** a camada (`models`, `services`, `use-cases`, `repositories`, `stores`, `rest`, `db`,
`config`) ou o recurso (`health`…).

Uma feature em commits atômicos, na ordem das camadas:

```
feat(models): add thing model
feat(repositories): add thing repository with mock version
feat(use-cases): list things
feat(things): expose GET /v1/things
```

Não recomendados: `update`, `fix bug`, `ajustes`, `coisas novas`, `final version`.

## 3. Pull Requests

- Título `<type>: <short description>` (ex.: `feat: list things`).
- PR pequeno, uma feature por PR, branch atualizada com a `develop`.
- `feature/* → develop`: **Squash and Merge**, e a branch é apagada em seguida.
- `develop → main`: fechamento de ciclo ou release, com **Merge Commit**.
- Antes de abrir: `npm run lint` e `npm test` verdes e o checklist de `docs/ARQUITETURA.md` §7.
