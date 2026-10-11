# FinTrack E2E (Playwright)

Testes ponta a ponta que sobem o frontend (Vite, `localhost:5173`) e o backend
(Express, `localhost:3333`) reais e simulam um usuário navegando pela UI.

## Pré-requisitos

1. Postgres local rodando (`docker compose up -d` na raiz do repo, ou o
   Postgres nativo — ver `backend/.env`).
2. **Nenhum servidor no ar** nas portas 3333 e 5173. O jeito recomendado é
   deixar o próprio Playwright subir backend e frontend (`webServer` no
   `playwright.config.js`): ele já sobe o backend com `NODE_ENV=test` e
   derruba os dois no fim.

Se preferir subir na mão (para ver os logs), o backend **precisa** de
`NODE_ENV=test`:

```
cd backend && NODE_ENV=test npm run dev                  # Git Bash
cd backend; $env:NODE_ENV="test"; npm run dev            # PowerShell (vale até fechar o terminal)
cd frontend && npm run dev
```

Por quê: com `NODE_ENV=test` o backend **não envia e-mail** pelo Resend
(`backend/src/utils/mailer.js`) e **desliga o limitador de tentativas de
login** (`backend/src/middleware/rateLimit.js`). Sem isso, todo cadastro de
usuário de teste falha com 500 ("You can only send testing emails to your own
email address"). E o limitador conta as tentativas que **falham** por IP: a
suíte erra logins de propósito ("senha errada", "antes de confirmar o
e-mail"), então algumas rodadas seguidas estouram o limite.
O banco **não muda**: o `server.js` só carrega o `backend/.env` (o
`.env.test` é só do Vitest). O CI usa a mesma variável (`.github/workflows/e2e.yml`).

Atenção: com `reuseExistingServer`, se já houver um backend no ar **sem**
`NODE_ENV=test`, o Playwright usa esse e os testes falham no cadastro.

## Rodando os testes

```
cd e2e
npm install
npx playwright install chromium   # só na primeira vez
npm test
```

- `npm run test:ui` — abre o Playwright UI mode (interativo, ótimo pra debugar)
- `npm run test:headed` — roda com o navegador visível
- `npm run report` — abre o último relatório HTML gerado

## Por que 1 worker localmente (e 2 no CI)?

O backend em modo dev (`node --watch`) é um processo único, sem clustering —
com o número padrão de workers (uma por núcleo de CPU) ele não aguenta o
volume de requisições concorrentes e os testes falham por `ECONNRESET`/timeout,
não por bug real. No Windows, mesmo **2 workers** fazem `page.goto` travar 30s
no servidor dev do Vite, no meio da execução e não só na primeira leva (#88);
com **1 worker** a suíte passou 25/25 duas vezes seguidas e não ficou mais
lenta (~1,3 min). No CI (Linux) isso nunca apareceu, e lá ficam 2
(`workers: process.env.CI ? 2 : 1`).

## Armadilhas do ambiente local

- **Servidor órfão segurando a porta.** Encerrar um `npm run dev` em segundo
  plano mata só o `npm`. Pior: com `node --watch`, matar o processo da porta
  não basta — o pai (`node --watch src/server.js`) continua vivo e **sobe o
  servidor de novo** na próxima mudança de arquivo (ex.: trocar de branch).
  Um Vite novo, achando a 5173 ocupada, sobe na 5174 sem avisar, e o
  Playwright (baseURL 5173) fala com o processo antigo. Antes de rodar,
  confira e encerre a **árvore** inteira:
  ```
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'server\.js|vite' } | Select-Object ProcessId, ParentProcessId, CommandLine
  taskkill /PID <pid do node --watch ou do cmd pai> /T /F
  ```
- **Teste falhando em "Carregando..." ou `page.goto` estourando o tempo logo
  depois de editar código:** o Vite está recompilando. Rode de novo antes de
  concluir que é bug.
- **`Can't reach database server at localhost:5433` (Prisma P1001)** na
  primeira requisição, com o container saudável: visto duas vezes, logo depois
  de o backend subir, e não reproduzido de propósito (`127.0.0.1` e `::1`
  respondem). Se virar frequente, testar `DATABASE_URL` com `127.0.0.1` no
  lugar de `localhost` no `backend/.env`.
- **Falha antes de chegar ao que o teste verifica** (cadastro 500, timeout de
  ambiente) é falha pelo motivo errado: não serve como prova de bug nem de
  correção. Ver a skill `fix-bug`.

## Estratégia de dados

Cada teste registra um usuário novo com e-mail único (timestamp + random, ver
`helpers/testUser.js`) — sem necessidade de resetar banco entre execuções, e
sem risco de colidir com dados reais de desenvolvimento.

`auth.spec.js` é o único arquivo que passa pelo formulário de login/registro
de verdade pela UI — os outros specs autenticam via API diretamente
(`loginAsUser`) para focar no que cada um está testando e rodar mais rápido.
