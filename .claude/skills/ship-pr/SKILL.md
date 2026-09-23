---
name: ship-pr
description: 'Fecha o ciclo de uma issue do FinTrack — valida localmente, faz push da branch, abre o PR com "Closes #N", acompanha os checks de CI (backend tests + E2E) e, com confirmação do usuário, faz squash merge, apaga a branch e volta para a main. Use quando o trabalho da branch estiver pronto ou o usuário disser "pode subir", "abre o PR", "finaliza a issue", "manda pra produção", "faz o merge", "ship it". Para o corpo do PR, combina com a skill pr-creator quando ela estiver disponível.'
---

# ship-pr

Últimas etapas do fluxo do `AGENTS.md`: push → PR → CI verde → squash merge + delete da branch.

**Por que o cuidado:** o merge em `main` dispara o deploy automático em produção (Vercel + Railway). Este é o único ponto do fluxo com efeito externo irreversível, por isso o merge sempre pede confirmação explícita.

## 1. Pré-voo local

```bash
git branch --show-current          # nunca main
git status --short                 # nada pendente que pertença a esta issue
git log main..HEAD --oneline       # os commits incrementais estão aqui
```

Sempre, na raiz: `npm run format:check` (se falhar, `npm run format` e commit `style: ...`) e `npm run lint`.

Se a mudança toca código (não só docs), rode a skill `review-fintrack` e resolva os achados que bloqueiam o merge antes de abrir o PR. Mencione no plano de testes do PR que a revisão foi feita.

Rode os testes do que foi tocado:

- `backend/` mudou → `cd backend && npm test`
- `frontend/` mudou → `cd frontend && npm run build`
- UI ou fluxo ponta a ponta mudou → `cd e2e && npm test` (precisa de backend + frontend rodando; ver `e2e/README.md`)
- Só docs/config → nada a rodar, mas diga isso explicitamente no plano de testes

Teste falhando → corrija a causa. Nunca `--no-verify`, nunca `.skip` para "fazer passar".

Se a mudança alterou arquitetura ou processo, confirme que `CLAUDE.md` (arquitetura) ou `AGENTS.md` (processo) foi atualizado **neste mesmo PR**.

## 2. Push e PR

```bash
git push -u origin <branch>
```

- **Título:** `<tipo>: <descrição em português, minúscula, imperativo> (#<issue>)` — ex.: `feat: adiciona verificação de e-mail no cadastro (#41)`. O squash acrescenta `(#<PR>)` no fim, formando o padrão do `git log`.
- **Corpo:** se a skill `pr-creator` estiver disponível, siga o formato dela (Resumo, Fluxograma Mermaid, Mudanças, Plano de testes). Senão, use pelo menos essas quatro seções, em português. **A primeira linha do corpo deve ser `Closes #<issue>`**, para a issue fechar no merge.
- Aplique a convenção de atribuição da sessão (rodapé "Generated with Claude Code"), se houver.

```bash
gh pr create --base main --title "..." --body-file <arquivo-no-scratchpad>
```

Mostre o link do PR ao usuário.

## 3. CI

```bash
gh pr checks <número> --watch
```

Workflows: `Code quality` (jobs `format` e `lint`), `Backend unit & integration tests` e `E2E` (`.github/workflows/`). Se um falhar:

```bash
gh run list --branch <branch> --limit 3
gh run view <run-id> --log-failed
```

Investigue a causa raiz, corrija com um **commit novo** na mesma branch e faça push (sem force-push, sem amend no que já subiu). Flaky no E2E? Olhe o artefato `playwright-report` antes de rodar de novo — reexecutar sem entender é contornar.

## 4. Merge (pede confirmação)

Com todos os checks verdes, **pergunte ao usuário** antes do merge, lembrando que isso faz deploy em produção. Com o "sim":

```bash
gh pr merge <número> --squash --delete-branch
git checkout main && git pull origin main
```

Confirme que a issue fechou (`gh issue view <n> --json state`).

## 5. Depois do merge

- Mudou backend → sugira conferir se o deploy da Railway subiu (houve casos de auto-deploy travado). Mudou frontend → Vercel.
- Mudou `schema.prisma` → a migration roda no start da Railway (`prisma migrate deploy`); vale checar os logs do deploy.
- Resuma em 1-2 linhas o que foi para produção.
