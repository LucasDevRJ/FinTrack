# MEMORY.md

## Propósito

Registro vivo de decisões de produto/arquitetura, contexto histórico e conhecimento operacional do FinTrack que **não é óbvio a partir do código, dos commits ou dos outros arquivos de orientação**. É o "porquê" por trás de escolhas não triviais — para qualquer pessoa (ou agente de IA) que retome o projeto depois de um tempo.

Não repete aqui o que já está em:
- `README.md` — funcionalidades, stack, como rodar localmente
- `CLAUDE.md` — arquitetura de código, comandos de dev/test
- `AGENTS.md` — workflow de processo, regras essenciais
- **GitHub Issues** — critério de aceite detalhado de cada item de backlog (linkado por número abaixo; a issue é a fonte primária, isto aqui é só o resumo das decisões já fechadas)

Como manter: mesma regra do `AGENTS.md` — se uma decisão de produto/arquitetura relevante for tomada ou mudar, atualizar este arquivo na mesma mudança, pelo fluxo issue → branch → PR → merge.

## Objetivo do projeto

FinTrack é um projeto de portfólio para atrair clientes freelance (Workana), construído com padrão de qualidade de produção — não um protótipo descartável. **Estratégia de monetização foi discutida e decidida explicitamente**: portfólio é o caminho escolhido, não venda como SaaS pago nem como boilerplate/template pra outros devs (ambos avaliados e descartados). Não propor esse pivô a menos que seja levantado de novo.

**Priorização de backlog usa duas lentes, sempre juntas**: apelo de portfólio/cliente **e** valor real para um usuário brasileiro de verdade — nunca escolher um item só porque impressiona num freelance client (feedback explícito recebido depois de uma rodada de propostas puramente resume-driven).

## Linha do tempo / marcos

- **2026-08-02** — primeiro deploy em produção (Vercel + Railway).
- **2026-08-10** — adoção do fluxo GitHub Issues + branch-per-issue (ver `AGENTS.md`).
- **2026-08-09/10** — domínio próprio `myfintrack.com.br` (Registro.br) e e-mail transacional com domínio verificado no Resend.
- **2026-09-03** — pirâmide de testes completa: E2E (Playwright) + unit/integração (Vitest/Supertest) no backend, ambos rodando em CI.
- **2026-09-07** — landing page pública, SEO básico e verificação no Google Search Console.
- **2026-09-10** — nova identidade visual (logo, paleta roxo/azul).
- **2026-09-17/18** — verificação de e-mail no cadastro e edição de perfil (nome/e-mail/senha) em "Minha conta".

## Decisões de infraestrutura

- **Hosting**: Vercel (frontend, free/zero-config, sem cold start por ser estático) + Railway (backend + Postgres, plano pago Hobby). Railway foi escolhido sobre Render especificamente para evitar o cold-start do free tier do Render — má primeira impressão se um cliente Workana clicar no link do portfólio e a API demorar pra responder.
- **Domínio próprio** usado tanto para o site (Vercel) quanto para o remetente de e-mail transacional (Resend) — decisão de manter a API do backend no domínio próprio da Railway, não criar um subdomínio tipo `api.myfintrack.com.br`, por simplicidade.
- **`CORS_ORIGIN` é uma origem única** (string), não uma lista — qualquer domínio antigo/alternativo do frontend perde acesso à API assim que a origem oficial muda.
- **Sem infraestrutura de cron/scheduler.** Qualquer geração "agendada" segue o padrão lazy-on-read já usado pelas transações recorrentes (ver `CLAUDE.md`) — vale como precedente para qualquer feature futura que pareça precisar de um job em background (ex.: simuladores com taxas do Banco Central).
- **CI roda independente do deploy** — Railway deliberadamente sem "Wait for CI", para manter o deploy rápido; a rede de segurança é o PR ficar vermelho antes do merge, não o deploy esperar.

## Gotcha operacional: deploy "travado" no Railway

Entre agosto e setembro/2026, aconteceu repetidas vezes: um push pra `main` não refletia em produção por vários minutos — uma rota nova de um commit recente devolvia 404 enquanto `/api/health` continuava 200 normalmente. Causa raiz encontrada depois de várias ocorrências: a conexão do GitHub App do Railway com o repositório tinha caído (Settings → Source mostrava **"GitHub Repo not found"** em vez de `main`) — resolvido re-adicionando o repo no allowlist do Railway GitHub App (github.com/settings/installations). **Se o sintoma voltar, checar esse painel primeiro**, antes de tentar redeploy manual às cegas.

Dois sintomas parecidos, mas com causas diferentes:
- Se **todas** as rotas (inclusive `/api/health`) passam a devolver o JSON de erro do próprio proxy do Railway (`{"status":"error","code":404,"message":"Application not found"}` — não o `notFoundHandler` da nossa app), é trial/plano expirado ou suspenso, não o bug acima. Checar billing primeiro.
- `/api/health` é um JSON estático (não toca o Prisma nem o banco). Depois de qualquer rotação de credencial do Postgres, validar contra uma rota que realmente bate no banco (ex.: `/api/auth/demo-login`), não só `/api/health`.

## Padrão para rodar scripts pontuais contra produção

O Postgres do Railway só tem rede privada por padrão. Para rodar um script local (`backend/scripts/*.js`) contra o banco de produção: habilitar temporariamente **Public Networking** (Settings → Networking → TCP Proxy) → montar a `DATABASE_URL` com o host/porta públicos gerados → rodar o script → desabilitar o Public Networking de novo → **rotacionar a senha do Postgres** (a credencial necessariamente passou pelo terminal/chat pra chegar até ali). Scripts existentes (`delete-user.js`, `create-user.js`) seguem o mesmo formato: dry-run por padrão, flag `--confirm` para executar de verdade.

## Decisões de design já fechadas (itens de backlog ainda não iniciados)

Resumo das decisões de produto já discutidas e acordadas para itens que ainda não têm código — evita reabrir a mesma discussão. Detalhe completo/critério de aceite está na issue de cada um.

- **[#29](https://github.com/LucasDevRJ/FinTrack/issues/29)** — vigência de metas de orçamento: um único campo `startMonth`/`endMonth` (sem `endMonth` = recorrente para sempre, `startMonth == endMonth` = um único mês, janela entre os dois = período sazonal). Janelas sobrepostas para a mesma categoria são **rejeitadas** — sem resolução automática tipo "a mais específica vence".
- **[#30](https://github.com/LucasDevRJ/FinTrack/issues/30)** — "economia real": baseline é a média do gasto na categoria nos meses anteriores à criação da meta; sem histórico prévio não mostra nada (nunca um número enganoso); economia negativa é **mostrada**, não escondida/zerada; a métrica exibida é acumulada desde a criação da meta, não um valor mensal.
- **[#31](https://github.com/LucasDevRJ/FinTrack/issues/31)** — tooltips explicativos: prioridade **explicitamente baixa** (é preventivo, sem confusão real de usuário reportada) — não adiantar na fila do backlog sem pedido explícito.
- **[#32](https://github.com/LucasDevRJ/FinTrack/issues/32)** — recorrência de valor variável (água/luz/gás): nunca auto-gera com um valor "chutado". Vira um item **pendente** que exige confirmação manual do valor real antes de virar uma `Transaction` de verdade (e antes de contar em dashboard/metas/CSV); o valor de referência mostrado (média das ocorrências já confirmadas) é só uma dica visual, nunca preenche automaticamente.
- **[#33](https://github.com/LucasDevRJ/FinTrack/issues/33)** — simulador de investimentos: dois modos — (1) calculadora genérica de juros compostos (sem produto/taxa real) e (2) modo alimentado pelos dados reais do usuário (reusa a métrica do #30, com um fallback de receita-menos-despesa caso #33 seja construído antes do #30). Produtos reais com taxa de mercado (CDB, Tesouro Selic, Poupança) ficam fora dessa primeira versão.
- **[#8](https://github.com/LucasDevRJ/FinTrack/issues/8)/[#9](https://github.com/LucasDevRJ/FinTrack/issues/9)** (IA via Claude API, bloqueados por falta de chave da Anthropic) — modelo recomendado é `claude-haiku-4-5` (custo baixo, tarefa simples); o chat precisa recusar recomendação de investimento específico (regulação CVM) e ter limite de mensagens/dia (a conta demo pública é um vetor óbvio de abuso de custo). Custo estimado em volume inicial: ~US$1–10/mês.
- **[#45](https://github.com/LucasDevRJ/FinTrack/issues/45)** — parcelamento de cartão de crédito: **não** modelar cartão como entidade própria (sem limite/fatura) — é só um modo de entrada alternativo sobre Recorrências (valor total ÷ nº de parcelas, resto de arredondamento absorvido na última parcela).
- **[#46](https://github.com/LucasDevRJ/FinTrack/issues/46)** — simulador de custo de cartão: sem seletor de banco — só existe taxa média de mercado publicada pelo Banco Central (série SGS), não taxa por instituição. Mesmo raciocínio de "não modelar banco/cartão como entidade" do #45.
- **[#47](https://github.com/LucasDevRJ/FinTrack/issues/47)** — autocomplete de Categoria/Descrição em 3 fases: (1) histórico do próprio usuário, sem IA nem dependência externa; (2) dicionário estático de palavras-chave, só para Categoria; (3) sugestão por IA isolada por usuário — **nunca** usa dado de outro usuário, decisão tomada porque o projeto ainda não tem política de privacidade/tratamento LGPD para justificar um recurso cross-user.

## Direções explicitamente descartadas

- Monetização como SaaS pago ou venda de boilerplate — descartada a favor do caminho de portfólio (ver "Objetivo do projeto" acima).
- Auto-resolução de metas de orçamento sobrepostas ("a mais específica vence") — rejeitada; o usuário precisa ajustar/encerrar a meta existente manualmente.
- Modal explicativo ao entrar em cada feature (ideia original do #31) — trocado por um ícone de tooltip pontual, mais barato de manter e menos intrusivo.
- Conta demo pública em modo somente-leitura — avaliado e descartado; o comportamento atual (dados compartilhados, resetados a cada login de visitante) foi aceito como está.
- Sugestões de categoria via agregação entre usuários (ideia original de Fase 3 do #47) — descartada em favor de IA isolada por usuário, por falta de política de privacidade/LGPD no projeto hoje.

## Loose ends conhecidos

- Não existe endpoint de "purge" de contas de teste em produção — os scripts pontuais (`delete-user.js`) descritos acima são o único caminho hoje.

## Lição aprendida: fechamento de issues

A issue [#41](https://github.com/LucasDevRJ/FinTrack/issues/41) (verificação de e-mail no cadastro) ficou com o código mergeado em `main` mas a issue **aberta** no GitHub por um bom tempo — o PR aparentemente não referenciou `Closes #41` no corpo, então o merge não fechou ela automaticamente. Fechada manualmente em 2026-09-19. **Vale conferir, ao abrir um PR, que a issue certa está referenciada** (`Closes #N`) para o fechamento automático funcionar — não custa nada checar rapidamente depois do merge se a issue realmente fechou.
