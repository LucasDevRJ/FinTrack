---
name: review-fintrack
description: 'Revisa as mudanças da branch atual contra os padrões específicos do FinTrack — arquitetura (ownership 404, camadas, datas UTC, ordem de rotas), convenções do CLAUDE.md (idioma por camada, comentários, nomes), testes e doc viva — e aponta achados por severidade com arquivo:linha. Use antes de abrir um PR (a skill ship-pr chama esta), ou quando o usuário pedir "revisa", "faz um review", "confere se está no padrão", "tem algo fora do padrão?", "review do PR #N". Complementa a code-review embutida (bugs genéricos), não a substitui.'
---

# review-fintrack

Revisão em duas metades, pelo mesmo critério do resto do repo: **o que uma máquina consegue checar vai para o script; o que exige julgamento fica com você.** Prettier/oxlint já rodam no CI e não entram aqui.

As regras moram em `CLAUDE.md` (seção "Convenções de código"), `backend/CLAUDE.md`, `frontend/CLAUDE.md` e `AGENTS.md`. Esta skill não repete o conteúdo delas: diz **o que conferir** e **onde** está a regra.

## 1. Escopo da revisão

```bash
git branch --show-current
git log main..HEAD --oneline
git diff --merge-base main --stat
```

Descubra a issue pelo nome da branch (`<tipo>/<n>-...`) e leia o critério de pronto com `gh issue view <n>`. Revisão de um PR alheio: `gh pr checkout <N>` antes.

## 2. Metade mecânica (script)

```bash
node .claude/skills/review-fintrack/check.mjs          # base padrão: main
```

Olha só as **linhas adicionadas** desde a base, incluindo arquivos não commitados, e sai com código 1 se houver `erro`. Cada achado é uma **pista, não um veredito**: abra a linha e confirme. Se for falso positivo recorrente, corrija o script no mesmo PR (e rode de novo os dois testes descritos no fim desta skill).

## 3. Metade de julgamento (checklist)

Leia o diff inteiro (`git diff --merge-base main`), não só os arquivos que o script apontou.

**Escopo**
- [ ] Tudo no diff é necessário para o critério de pronto da issue? Refactor "de passagem", dependência nova não explicada ou feature extra = achado. Sugira outra issue.

**Arquitetura** (`backend/CLAUDE.md`)
- [ ] Acesso por id de outro usuário devolve **404**, não 403 nem 200. O script só pega a falta de `userId`, não um `where` errado.
- [ ] Caminho de leitura que toca transações chama `generateDueRecurringTransactions(userId)` antes.
- [ ] `Decimal` convertido para `Number` na resposta (`serialize<Recurso>`).
- [ ] Controller fino; regra de negócio no service.
- [ ] Header novo na resposta que o frontend lê está no `exposedHeaders` do CORS.
- [ ] Frontend: chamada de API passa por `src/api/*` (nunca Axios/fetch direto, nunca header `Authorization` montado na mão); comportamento que não se aplica à conta demo respeita `isDemoUser`.

**Convenções** (`CLAUDE.md` → "Convenções de código")
- [ ] Comentário novo explica um **porquê** que não é óbvio no código? Comentário que narra a linha seguinte = achado.
- [ ] Nomes seguem os padrões (`findOwned*`, `serialize*`, `*Request`, `<modulo>.<camada>.js`).
- [ ] Toda mensagem nova vista pelo usuário está em português, inclusive validação.

**Testes**
- [ ] Endpoint novo ou alterado tem teste de integração, **incluindo o de ownership** (recurso de outro usuário → 404) e o de sem token → 401.
- [ ] Cálculo novo isolado em função pura, com teste unitário.
- [ ] Mudança de UI/fluxo relevante tem E2E (skill `e2e-spec`).
- [ ] Nenhum `.skip`/`.only` esquecido, nenhum teste enfraquecido para passar.

**Doc viva** (`AGENTS.md` → "Manter este arquivo vivo")
- [ ] Mudou arquitetura → `CLAUDE.md` correspondente atualizado no mesmo PR.
- [ ] Mudou processo → `AGENTS.md` e as skills afetadas atualizados.
- [ ] Decisão de produto/arquitetura não óbvia → `MEMORY.md` do repo.

## 4. Relatório

Um único relatório, com os achados das duas metades juntos, do mais grave para o menos grave:

```
### Bloqueia o merge
- `arquivo:linha`: o problema. Por que importa. Sugestão.

### Deveria corrigir
- ...

### Sugestões (opcional)
- ...

### Conferido e ok
Uma linha por área do checklist sem achados (ex.: "Ownership: 3 queries novas, todas escopadas").
```

- **Bloqueia:** vazamento entre usuários, erro do script confirmado, teste de ownership ausente, mensagem em inglês para o usuário, fora do escopo da issue.
- A seção "Conferido e ok" é obrigatória. Mostra o que foi revisado, não só o que falhou. Revisão sem achado nenhum também é um resultado, e precisa dizer o que foi coberto.
- Não corrija nada durante a revisão. Primeiro apresente o relatório, depois corrija o que o usuário aprovar, com commits novos.

## Manutenção do script

Ao mudar `check.mjs`, rode de novo os dois testes que o validaram:
1. **Controle negativo:** crie um módulo falso com violações plantadas, confirme que cada regra dispara e que o exit é 1, e apague o módulo.
2. **Falso positivo:** `node .claude/skills/review-fintrack/check.mjs $(git rev-list --max-parents=0 HEAD)` trata o código atual inteiro como novo. O resultado deve ser 0 erros. Os avisos restantes são dívidas conhecidas (ex.: #71).
