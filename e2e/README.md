# FinTrack E2E (Playwright)

Testes ponta a ponta que sobem o frontend (Vite, `localhost:5173`) e o backend
(Express, `localhost:3333`) reais e simulam um usuário navegando pela UI.

## Pré-requisitos

1. Postgres local rodando (`docker compose up -d` na raiz do repo, ou o
   Postgres nativo — ver `backend/.env`).
2. Backend e frontend rodando em modo dev, cada um no seu terminal:
   ```
   cd backend && npm run dev
   cd frontend && npm run dev
   ```
   (Se não estiverem rodando, o Playwright tenta subir os dois sozinho via
   `webServer` no `playwright.config.js` — mas nesse caso a primeira execução
   demora mais.)

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

## Por que só 2 workers?

O backend em modo dev (`node --watch`) é um processo único, sem clustering —
com o número padrão de workers (uma por núcleo de CPU) ele não aguenta o
volume de requisições concorrentes e os testes falham por `ECONNRESET`/timeout,
não por bug real. `workers: 2` no config é o ajuste pra rodar de forma
estável localmente; em CI, com um backend mais robusto, esse número pode subir.

## Estratégia de dados

Cada teste registra um usuário novo com e-mail único (timestamp + random, ver
`helpers/testUser.js`) — sem necessidade de resetar banco entre execuções, e
sem risco de colidir com dados reais de desenvolvimento.

`auth.spec.js` é o único arquivo que passa pelo formulário de login/registro
de verdade pela UI — os outros specs autenticam via API diretamente
(`loginAsUser`) para focar no que cada um está testando e rodar mais rápido.
