---
name: start-issue
description: Inicia qualquer trabalho de código no FinTrack criando a GitHub Issue (com o label certo) e a branch `<tipo>/<número>-<slug>` a partir da `main` atualizada. Use SEMPRE antes de editar arquivos para uma tarefa nova — feature, bug, teste, refactor, doc, chore — mesmo que seja uma mudança de uma linha, e mesmo que o usuário só diga "implementa X", "corrige Y", "vamos fazer a issue #N", "começa a tarefa", "cria uma issue". Também use quando o usuário pedir para retomar uma issue já existente (só cria a branch).
---

# start-issue

Primeira etapa do fluxo obrigatório do `AGENTS.md` (issue → branch → commits → push → PR → merge). Existe porque pular a branch significa commitar em `main`, e **todo push em `main` vai direto para produção** (Vercel + Railway fazem auto-deploy).

## 1. Verificar o ponto de partida

```bash
git status --short
git branch --show-current
```

- Mudanças não commitadas que **não** são desta tarefa → pare e pergunte ao usuário o que fazer com elas (não use stash nem descarte por conta própria).
- Já está numa branch de outra issue → pergunte se a tarefa nova deve esperar ou virar outra branch.

Depois, atualize a `main`:

```bash
git checkout main && git pull origin main
```

## 2. Issue: reaproveitar ou criar

Se o usuário citou um número (`#47`), use essa issue: `gh issue view 47`. Leia o corpo — o critério de pronto dela é o escopo do trabalho, nada além.

Senão, procure uma duplicata antes de criar: `gh issue list --search "<palavras-chave>" --state open`.

Para criar, escreva o corpo em português com um parágrafo de contexto (o **porquê**) e um **critério de pronto** em checklist:

```bash
gh issue create --label <label> --title "<título curto, em português>" --body "$(cat <<'EOF'
<contexto: problema/motivação em 1-3 frases>

## Critério de pronto
- [ ] ...
EOF
)"
```

Labels do repo (escolha um principal):

| Label | Quando |
|---|---|
| `enhancement` | funcionalidade nova ou melhoria visível ao usuário |
| `bug` | comportamento errado em algo que já existe |
| `testing` | só cobertura de testes (unit, integração, E2E) |
| `chore` | manutenção, tooling, config, dependências |
| `documentation` | só docs (README, CLAUDE.md, AGENTS.md) |
| `marketing` | trabalho **não-código** — sem branch; a issue é só um checklist. Pare aqui. |
| `blocked` | adicional: depende de ação externa (ex.: chave de API do Lucas) |

## 3. Criar a branch

Formato: `<tipo>/<número>-<slug>` — slug curto, em português, kebab-case, sem acentos.

| Tipo | Uso típico |
|---|---|
| `feat` | `enhancement` |
| `fix` | `bug` |
| `test` | `testing` |
| `chore` | `chore` |
| `docs` | `documentation` |
| `refactor` | reestruturação sem mudar comportamento |

Exemplos reais: `feat/41-verificacao-email`, `docs/48-claude-md`, `fix/37-import-csv-delimitador`.

```bash
git checkout -b <tipo>/<número>-<slug>
```

## 4. Confirmar e seguir

Informe ao usuário o link da issue e o nome da branch, e mostre em 2-4 bullets o plano de commits incrementais (cada commit = uma unidade coerente). A partir daqui:

- Módulo novo no backend → skill `backend-module`.
- Novo teste Playwright → skill `e2e-spec`.
- Terminou → skill `ship-pr`.

## Armadilhas

- Nunca expandir o escopo além do critério de pronto da issue sem perguntar — se surgir algo novo, sugira **outra** issue.
- Dependência nova ou decisão estrutural importante → explicar em poucos bullets **antes** de implementar (regra do `AGENTS.md`).
