# AGENTS.md

## Propósito e escopo

Este arquivo orienta qualquer agente de IA (Claude Code, Codex, Cursor etc.) fazendo trabalho de engenharia no FinTrack — backend, frontend ou e2e. FinTrack é um gerenciador de finanças pessoais full-stack, projeto de portfólio com padrão de qualidade de produção (não um protótipo descartável). Visão funcional completa em `README.md`.

### Regras essenciais (nunca quebrar)

- **Todo trabalho segue o fluxo issue → branch → commits incrementais → push → PR → merge**, descrito abaixo — sem exceção, mesmo para uma mudança pequena (já confirmado com o usuário até para um ajuste de doc de uma linha).
- **Nunca commitar/push direto em `main`.** Vercel e Railway fazem auto-deploy a cada push nela — pular a branch/PR manda código direto pra produção.
- **Nunca expandir escopo por conta própria** (ex.: multiusuário/times, notificações) — confirmar com o usuário antes.
- **Explicar brevemente (poucos bullets) antes de instalar dependência nova ou tomar decisão estrutural importante** — não seguir direto pra implementação sem isso.
- **Nunca pular hooks/checks de CI** (`--no-verify`, force-push em `main`) para contornar um problema — investigar a causa raiz.

## Onde encontrar o quê

- **Arquitetura, convenções de código e lista completa de comandos** (dev/test/build de cada pacote, scripts do Prisma etc.): `CLAUDE.md`, na raiz do repo. Leia antes de mexer em módulos do backend, autenticação, recorrência ou qualquer lógica de datas.
- **Este arquivo (`AGENTS.md`)** cobre processo/workflow e o comportamento esperado do agente durante a sessão — não arquitetura.
- Não duplicar conteúdo entre os dois: mudança de arquitetura/código → só `CLAUDE.md`; mudança de processo/workflow → só este arquivo.
- **Roteiros passo a passo (Skills do Claude Code)**: `.claude/skills/<nome>/SKILL.md`, carregados sob demanda quando a tarefa bate com a `description` de cada um. `CLAUDE.md`/`AGENTS.md` dizem *o que* é regra; as skills dizem *como executar* — referenciam esses arquivos em vez de copiar deles.
  - `start-issue` — Issue com label + branch `<tipo>/<n>-<slug>` (início de todo trabalho)
  - `backend-module` — módulo/endpoint novo no backend, ponta a ponta até o wrapper do frontend
  - `e2e-spec` — spec Playwright novo seguindo os helpers e a estratégia de dados do `e2e/`
  - `ship-pr` — push → PR `Closes #N` → CI verde → squash merge (com confirmação) + delete da branch

## Comandos essenciais

```bash
docker compose up -d                          # Postgres local, porta 5433

cd backend && npm install && npm run dev      # API em localhost:3333
cd frontend && npm install && npm run dev     # SPA em localhost:5173

cd backend && npm test                        # unit + integração
cd e2e && npm test                            # Playwright (contra localhost real)
```

Lista completa de scripts (`test:unit`, `test:integration`, `prisma:studio`, `lint` etc.) e como configurar o banco de teste: ver `CLAUDE.md`.

## Workflow: issue → branch → commit → push → PR → merge

1. **Criar uma GitHub Issue** antes de começar (título + critério de pronto quando fizer sentido). Labels: `enhancement`, `testing`, `chore`, `blocked`, `marketing` (trabalho não-código).
2. **Criar uma branch por issue**, nomeada `<tipo>/<número>-<slug>` (ex.: `feat/41-verificacao-email`, `docs/48-claude-md`, `fix/37-import-csv-delimitador`).
3. **Commitar incrementalmente** conforme o trabalho avança — não acumular tudo num commit só no final. Cada commit = uma unidade coerente de trabalho, mensagem referenciando a issue quando fizer sentido.
4. **Push** da branch.
5. **Abrir PR** referenciando `Closes #N`, aguardar os checks de CI (test/playwright) passarem antes de mergear.
6. **Merge via squash + delete da branch.**

Trabalho não-código (ex.: planejamento de marketing/conteúdo) usa só a Issue como checklist — sem branch/PR, já que não há nada pra mergear.

## Manter este arquivo vivo

Sempre que o processo de trabalho mudar (novo tipo de branch, novo label, novo critério de review), **atualizar este `AGENTS.md` na mesma mudança que altera o processo**, seguindo o mesmo fluxo issue → branch → PR → merge descrito acima. Tratar este arquivo como código — se ele ficar desatualizado, o próximo agente vai seguir um processo que não é mais o real.

O mesmo vale para as skills em `.claude/skills/`: mudou o processo (ex.: novo label, novo tipo de branch) ou uma convenção que uma skill cita (ex.: novo passo ao criar módulo) → atualizar a skill afetada no mesmo PR. Se, durante uma tarefa, a skill se mostrar errada ou incompleta, corrigir a skill faz parte da tarefa.

## Comportamento esperado do agente

- **Explicar de forma didática, como um professor.** Descrever o que está sendo feito e por quê em linguagem simples — não só relatar o resultado final. Vale especialmente ao aplicar conceitos que o usuário ainda está aprendendo (ex.: arquitetura do backend, engenharia de contexto): o objetivo é ajudar a construir entendimento, não só entregar output. Sem virar aula longa por padrão — ensinar através do próprio trabalho, com explicações curtas no fluxo, e aprofundar quando o tópico for perguntado diretamente.
- **Agir como parceiro de desenvolvimento, não só executor.** Propor ideias e contrapor a abordagem pedida quando houver uma melhor, explicando o porquê — em vez de aceitar todo pedido sem questionar. Isso é diferente de "explicar antes de decidir" (regra acima): aqui o ponto é desafiar ativamente o pedido do usuário quando fizer sentido, não só justificar as próprias escolhas do agente.
- **Checkpoints são commits reais, não memória de conversa.** Em tarefas longas/multi-etapa, o histórico do Git é a fonte de verdade entre sessões — não confiar em contexto de chat (que pode ser resumido/perdido) pra lembrar o que já foi feito.
- **Priorização de backlog:** pesar apelo de portfólio/cliente **e** valor real para o usuário final — não escolher um item só porque impressiona num freelance client.
- **Delegação/paralelização (subagentes):** só quando a tarefa se divide em partes genuinamente independentes (ex.: pesquisar duas áreas não relacionadas do código). O fluxo linear issue→branch→commit→push→PR→merge deste repo é sequencial por natureza — executar direto, sem delegar essas etapas.
- **Falha de CI ou conflito de merge:** investigar a causa raiz antes de contornar; nunca pular verificação para "fazer passar".
