# Arquitetura do frontend

React 19 + Vite, Tailwind v4 (utilitárias direto no JSX, sem CSS por componente), `react-router`, Axios, Recharts. Sem biblioteca de estado nem de formulário: `useState` local por página e dois contexts globais.

## Estrutura de `src/`

- `src/api/*.js` — um arquivo por módulo do backend, wrappers finos (`<verbo><Recurso>Request`, ex.: `listBudgetGoalsRequest`) em torno de um `apiClient` compartilhado (`src/api/client.js`, uma instância do Axios). Cada wrapper devolve só o `data` da resposta (exceção: `exportTransactionsRequest` baixa o CSV direto via blob, porque um `<a href>` não levaria o header de autenticação). Um interceptor de requisição anexa `Authorization: Bearer <token>` a partir de `localStorage["fintrack_token"]` automaticamente — páginas e componentes nunca importam o Axios nem montam o header de autenticação.
- `src/pages/*Page.jsx` — uma por rota; donas do estado da tela e das chamadas à API.
- `src/components/*.jsx` — peças reaproveitáveis sem chamada à API (formulários, gráficos, `Header`, `ProtectedRoute`); recebem dados e callbacks por props.
- `src/context/AuthContext.jsx` — guarda `user`/`isLoading` e todas as ações de autenticação (login, registro + fluxo de verificação de e-mail, troca de senha, exclusão de conta, login como demo). Ao montar, se um token sobreviveu a um refresh, ele é validado via `meRequest()` antes de renderizar conteúdo protegido.
- `src/context/ThemeContext.jsx` — modo escuro, preferência persistida + detecção do sistema.
- `src/utils/` — funções puras compartilhadas: `getErrorMessage` (`apiError.js`), `formatCurrency` (`currency.js`, BRL em pt-BR), `formatDate`/`toDateInputValue`/`todayInputValue` (`date.js`, ver "Datas"), `isDemoUser` (`demo.js`), cores fixas de gráfico (`transactionColors.js`, `budgetStatus.js`).

## Rotas

O roteamento (`src/App.jsx`) é uma árvore `<Routes>` plana do `react-router`; não há roteamento de layout aninhado. Página autenticada nova precisa de três coisas: a rota envolvida em `<ProtectedRoute>` no `App.jsx`, a entrada em `NAV_ITEMS` do `Header.jsx` (que já cuida do menu desktop e do mobile) e o `<Header />` no topo da página. Rota desconhecida cai no `*` → `/dashboard`.

**Conta demo**: `isDemoUser(user)` controla comportamentos que não devem se aplicar à conta pública compartilhada "Entrar como visitante" (ex.: `/account` redireciona para `/dashboard` em vez de mostrar a UI de perfil/exclusão de conta — ver `AccountRoute` em `App.jsx`, issue #13; o `Header` esconde o link). Toda tela nova precisa responder: faz sentido para um visitante anônimo que compartilha a conta com outros? Se não, esconder no `Header` e redirecionar na rota.

## Padrão de página com dados (CRUD)

Referência: `BudgetsPage.jsx` (a mais enxuta); `RecurringPage` e `TransactionsPage` seguem o mesmo padrão.

- **Estados da tela** — dado começa em `null` (= carregando), e a página renderiza os quatro casos, nesta ordem: erro de carga, "Carregando...", vazio (texto que explica o que fazer, ex.: "Nenhuma meta cadastrada ainda..."; com filtro aplicado, dizer que nada bateu com o filtro, como na `TransactionsPage`), lista.
- **Dois erros separados** — `loadError` (falha ao listar; mensagem fixa em PT) e `actionError` (falha ao salvar/excluir). O de salvar usa `getErrorMessage(err, "<fallback em PT>")`, que prioriza a mensagem por campo da validação (`errors[0].message`) sobre o genérico "Dados inválidos". Nunca mostrar `err.message` do Axios (vem em inglês).
- **Depois de criar/editar/excluir**, recarregar a lista do servidor (`await load<Recurso>()`), sem atualizar o estado à mão — o backend recalcula campos derivados (progresso da meta, ocorrências de recorrência).
- **Excluir pede confirmação inline** (`confirmingDeleteId` troca "Editar/Excluir" por "Confirmar/Cancelar" na própria linha). Nada de `window.confirm`/`alert`, que também travam o Playwright.

## Formulários

Referência: `BudgetGoalForm.jsx`. O componente de formulário é controlado (`useState` por campo), não chama a API e recebe `initialValues` (`null` = criar), `onSubmit(values)`, `onCancel`, `isSubmitting` e `error` da página.

- Converte os tipos antes do `onSubmit` (`Number(amount)`) — o input sempre devolve string.
- Validação nativa do HTML (`required`, `min`, `maxLength`, `step="0.01"`) espelhando o schema Zod do backend, para o erro óbvio aparecer sem ida ao servidor. O backend continua sendo a fonte da verdade.
- Todo input tem `<label htmlFor>` + `id` únicos (prefixados pelo recurso: `budget-category`). Os testes E2E encontram campos por `getByLabel`/`getByRole`; campo sem label não é testável (e não é acessível). Única exceção: `<input type="file" className="hidden">` acionado por um botão visível com texto (o "Importar CSV" da `TransactionsPage`).
- Botão de envio desabilitado com `isSubmitting` e texto "Salvando...".

## Visual

- **Tema escuro em tudo**: toda classe de cor tem o par `dark:` (`bg-white dark:bg-gray-800`, `text-gray-900 dark:text-gray-100`). O `dark:` reage à classe `.dark` no `<html>`, não à preferência do SO direto (`@custom-variant` em `index.css`), por causa do botão de tema. Cor que não é classe Tailwind (gráficos Recharts, `style=`) não é coberta pelo `dark:`: escolha pelo `theme` de `useTheme()` e use as constantes `*_DARK` de `src/utils/`.
- **Moldura das páginas**: autenticadas usam `<main className="min-h-screen bg-gray-50 p-4 sm:p-8 dark:bg-gray-900">` + `mx-auto max-w-4xl`, com cards `rounded-lg bg-white p-5 shadow dark:bg-gray-800`; páginas públicas de formulário (login, cadastro, redefinição) centralizam um único card `p-8` com `flex items-center justify-center`. A `LandingPage` tem layout próprio de marketing. Ação principal: `bg-indigo-600 ... hover:bg-indigo-700`.
- **Mobile primeiro**: layout base para celular e `sm:`/`md:` para ampliar (grids de formulário `grid-cols-1 sm:grid-cols-2`, navegação do `Header` vira menu abaixo de `md`).
- **Dinheiro sempre via `formatCurrency`**; cores de receita/despesa e status de meta vêm das constantes em `src/utils/`, não de hex solto no componente.
- **Eixos de gráfico (Recharts)**: o `interval` padrão do `XAxis` descarta rótulos que acha que vão se sobrepor, **em silêncio**, e sobra barra sem nome (#100). Eixo de categorias discretas (meses) usa `interval={0}` com um rótulo curto que caiba no celular (390px), como o `shortMonthLabel` do `MonthlyBarChart`; o formato longo fica no tooltip. Confira com screenshot no desktop e no celular, porque o E2E só conta rótulos, não vê sobreposição.

## Datas

O backend guarda datas de transação como meia-noite UTC de uma data de calendário (ver `backend/CLAUDE.md`).
Use sempre os helpers de `src/utils/date.js`, que aplicam o relógio certo em cada caso:
- **Exibir** uma data vinda da API: `formatDate(iso)` — lê em UTC; sem isso, o navegador em UTC-3 mostra o dia anterior.
- **Preencher `<input type="date">`**: `toDateInputValue(iso)` — data da API, ou "hoje" quando vazio.
- **"Hoje"** (valor padrão, nome de arquivo): `todayInputValue()` — data **local** do usuário. Nunca `new Date().toISOString()`: é UTC, e depois das 21h em Brasília já é amanhã (#82). Teste E2E que depende de "hoje" fixa o relógio e o fuso (`page.clock.setFixedTime` + `test.use({ timezoneId: "America/Sao_Paulo" })`), como em `transactions.spec.js`.

## Autenticação

**O registro não loga o usuário automaticamente.** `register()` não retorna mais um token — a conta precisa verificar o e-mail primeiro (`verifyEmail(token)` é quem armazena o token e define `user`). Da mesma forma, `confirmEmailChange` reemite e substitui o token armazenado, já que a identidade do e-mail acabou de mudar.

Comandos e convenções gerais do repositório: ver o `CLAUDE.md` raiz e o `AGENTS.md`.
