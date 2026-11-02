# Branching Strategy & Commit Standards — store-notes-api

Projeto individual: ninguém mais revisa, então não há branch de feature nem Pull Request. Todo
commit vai direto na `main`.

## 1. Branch

- `main` é a única branch: é nela que se commita e é dela que se publica.
- Antes de cada push: `npm run lint` e `npm test` verdes e o checklist de `docs/ARQUITETURA.md` §7.
- Se o projeto ganhar mais gente ou um ambiente de homologação, volta o fluxo dos repositórios
  Smart City (`feature/* → develop → main`, com PR).

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
