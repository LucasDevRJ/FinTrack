---
name: fix-bug
description: 'Ciclo completo de correção de erro no FinTrack: coletar o erro, reproduzir, achar a causa raiz, comparar formas de corrigir, escrever um teste de regressão que FALHA antes da correção, corrigir, provar que passa, e seguir para issue/branch/PR (start-issue → review-fintrack → ship-pr), com merge só após confirmação. Use sempre que o usuário trouxer um erro ou comportamento errado — stack trace colado, "deu erro", "tá quebrando", "retornou 500", "não funciona", "bug", "a tela X mostra Y errado", teste falhando sem motivo claro, ou uma issue com label bug (ex.: "corrige a #71").'
---

# fix-bug

Correção de bug tem uma armadilha própria: é fácil "corrigir" o sintoma que você **imagina** em vez do erro que de fato acontece. Por isso esta skill tem uma regra central:

> **Nenhuma correção sem antes um teste que reproduz o erro e falha.** Ver o teste falhar antes e passar depois é o que prova que a correção resolveu *este* bug. Um teste escrito depois da correção pode passar por acaso, sem nunca ter reproduzido nada.

## 1. Coletar o erro (sem mexer em nada)

Junte antes de levantar hipóteses:
- **Mensagem e stack trace completos** (peça ao usuário se ele só descreveu o problema).
- **Onde acontece:** local, CI ou produção. **Passos** para chegar lá e **resultado esperado × obtido**.
- **Desde quando:** `git log --oneline -15`. Se "funcionava antes", é regressão e o passo 3 pode usar `git bisect`.

Erro em produção? Primeiro separe infraestrutura de aplicação:

| Sintoma | Significa |
|---|---|
| `{"status":"error","code":404,"message":"Application not found"}` (JSON da Railway) | serviço fora do ar ou billing, não é bug de código |
| `{"message":"Route GET /api/... not found"}` (nosso `notFoundHandler`) | a rota não existe no build que está no ar: deploy travado ou rota ausente |
| `/api/health` 200 mas rotas com banco dão 500 | problema de banco ou credencial. O `/api/health` não toca o banco; teste com `POST /api/auth/demo-login` |
| `{"message":"Erro interno do servidor"}` | exceção não tratada: o stack trace está nos logs da Railway |

Se não for bug de código, pare aqui e explique ao usuário, sem abrir branch.

## 2. Reproduzir

Reproduza do jeito mais direto possível (`curl` contra local ou produção, passos na UI, `npm test`) e **mostre ao usuário o erro reproduzido**.

Não conseguiu reproduzir? **Não corrija no escuro.** Diga o que tentou e peça o dado que falta (payload exato, usuário, horário, navegador).

## 3. Achar a causa raiz

- Siga o stack trace até **a primeira linha do nosso código**, não a da biblioteca.
- Formule uma hipótese e teste só essa, antes de passar para a próxima. Registre no relatório as que você descartou.
- Regressão: `git log -S "<trecho>" -- <arquivo>`, `git blame` (o `.git-blame-ignore-revs` já pula a formatação) ou `git bisect` com o comando que reproduz.
- Confira as armadilhas conhecidas do `backend/CLAUDE.md`: datas UTC (UTC-3 desloca um dia), ownership 404, rota estática depois de `/:id`, recorrência lazy (`generateDueRecurringTransactions`), `trust proxy`/IP, limite do `express.json`, CORS `exposedHeaders`.
- **Procure bugs irmãos:** o mesmo padrão errado costuma aparecer em outros lugares. Faça um `grep` pelo padrão e liste as ocorrências. Elas entram na mesma correção **se** estiverem no escopo do bug; caso contrário, viram outra issue.

## 4. Escolher a correção

Considere pelo menos duas formas e escolha pela causa raiz, não pelo sintoma:
- **Correção central × local:** ex.: um error map do Zod em português para todo o app × uma mensagem por campo. A central resolve os bugs irmãos e o próximo campo que alguém criar.
- **Menor mudança que resolve a causa:** refactor oportunista fica fora do PR.

Se as opções tiverem trade-off real (comportamento visível, dependência nova, migration), **apresente-as em poucos bullets e recomende uma antes de implementar** (regra do `AGENTS.md`). Se a escolha for óbvia, siga e explique no PR.

## 5. Issue e branch

Siga a skill `start-issue` (label `bug`, branch `fix/<n>-<slug>`; se a issue já existe, reaproveite). O corpo da issue leva **sintoma, reprodução, causa raiz** e o critério de pronto com o teste de regressão.

## 6. Teste de regressão que falha (commit próprio)

| Onde está o bug | Onde fica o teste |
|---|---|
| API, regra de negócio, validação | `backend/tests/integration/<modulo>.routes.test.js` (via HTTP, como o usuário vê) |
| Cálculo puro (datas, progresso, CSV) | `backend/tests/unit/` |
| UI/fluxo no navegador | `e2e/tests/` (skill `e2e-spec`). O frontend não tem teste unitário; não crie a infraestrutura dentro de um bugfix, sugira outra issue |

Teste de integração ou E2E depende do Postgres de teste. Antes de rodar, na raiz:

```bash
docker compose ps                              # parado ou sem Docker → docker compose up -d
cd backend && npm run test:db:setup            # aplica migrations pendentes; sem pendência, não faz nada
```

O nome do teste descreve o comportamento correto, não o bug. Rode o teste e **confirme que ele falha pelo motivo certo**: a mensagem de falha tem que ser o sintoma do bug, não um erro de setup. Exemplo real (#71): com o Docker desligado, os 3 testes de regressão falharam no `resetDb` por não conectar ao banco. Parecia a prova do bug, mas era setup; só com o banco no ar o diff mostrou o sintoma (`- "Campo obrigatório"` / `+ "Required"`). Faça o commit:

```
test: reproduz <sintoma> (#<n>)
```

Assim o histórico mostra o teste vermelho antes da correção.

## 7. Corrigir e provar

- Implemente a correção escolhida. Commit: `fix: <o que passa a acontecer> (#<n>)`.
- O teste de regressão agora passa. Mostre **antes (falhando) × depois (passando)** ao usuário.
- Rode a suíte inteira do pacote tocado (`cd backend && npm test`; `cd e2e && npm test` se for de UI) para garantir que nada mais quebrou.
- Repita a reprodução original do passo 2 (o `curl` ou os passos na UI), não só o teste.

## 8. Defesa contra recorrência

Pergunte: "o que teria impedido este bug de entrar?"
- O teste de regressão já cobre o caso específico.
- É um padrão que pode se repetir? Adicione uma regra ao `.claude/skills/review-fintrack/check.mjs` (seguindo a seção de manutenção daquela skill) ou uma armadilha no `backend/CLAUDE.md`/`frontend/CLAUDE.md`, no mesmo PR.
- A causa foi uma decisão não óbvia? Registre no `MEMORY.md` do repo.

## 9. Revisão, PR e merge

1. Skill `review-fintrack`: resolva os achados que bloqueiam o merge.
2. Skill `ship-pr`: o PR leva **Sintoma → Causa raiz → Correção → Prova** (o teste falhando no commit `test:` e passando no `fix:`, mais a reprodução original).
3. **Merge só depois de perguntar ao usuário.** Um bugfix muda comportamento em produção, e é justamente aí que uma confirmação a mais importa.

## 10. Depois do merge (bug de produção)

Quando o deploy subir, **rode a reprodução original contra produção** e mostre o resultado. Lembre que a Railway pode levar alguns minutos: se a resposta ainda for a antiga, confirme que o deploy terminou antes de concluir que a correção falhou. Só então o bug está resolvido.
