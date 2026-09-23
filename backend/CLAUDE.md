# Arquitetura do backend

Cada funcionalidade é um módulo autocontido em `backend/src/modules/<nome>/`, sempre dividido da mesma forma em quatro partes:

- `*.routes.js` — router do Express; conecta middlewares (`protect`, `validate(schema[, source])`) aos métodos do controller
- `*.controller.js` — fino: pega `req.userId`/`req.body`/`req.params`/`req.query`, chama o service, define a resposta HTTP. Sem lógica de negócio.
- `*.service.js` — lógica de negócio e todas as chamadas ao Prisma
- `*.schema.js` — schemas Zod usados pelo `validate()` para validação de requisição

Módulos atuais: `auth`, `transactions`, `budgets`, `recurring`.

Peças transversais vivem fora de `modules/`:
- `src/middleware/auth.js` — `protect` lê `Authorization: Bearer <token>`, verifica, define `req.userId`
- `src/middleware/validate.js` — parseia `req.body`/`req.query`/`req.params` via Zod e substitui pelo valor validado/tipado; falhas de validação viram `ZodError`s encaminhados pro `next()`
- `src/middleware/errorHandler.js` — tratador de erro central: `ZodError` → 400 com mensagem por campo, `AppError` → seu próprio status code, qualquer outro → logado + 500
- `src/utils/zodErrorMap.js` — traduz as mensagens padrão do Zod (campo obrigatório, tipo errado, `min`/`max`, data inválida) para português; registrado globalmente com `z.setErrorMap()` no `app.js`
- `src/utils/AppError.js` — `new AppError(message, statusCode)` para erros esperados/tratados (ex.: 404 "não encontrado", 401 "token inválido")
- `src/lib/prisma.js`, `src/lib/resend.js` — singletons de cliente compartilhados

**Padrão de ownership**: toda busca de recurso é escopada por `userId` na cláusula `where` do Prisma (ex.: `findFirst({ where: { id, userId } })`), e um miss é sempre 404, nunca 403 — isso evita vazar se um recurso existe para outro usuário. Ver `findOwnedTransaction` / `findOwnedRecurringTransaction` nos respectivos services.

**Serialização de respostas**: `serialize<Recurso>` converte o objeto do Prisma para a resposta (ex.: `Decimal` → `Number`). Para o `User`, `serializeUser` (`auth.service.js`) é uma **lista de inclusão** de campos: o model guarda senha, hashes de token e troca de e-mail pendente, e com lista de exclusão (`const { password, ...rest } = user`) todo campo interno novo vazaria em todas as respostas de auth (#90). Model com dado sensível novo segue o mesmo modelo.

**Mensagens de validação**: schema sem mensagem própria já responde em português pelo error map global, então só escreva mensagem quando ela precisar ser mais específica que a genérica (ex.: "E-mail inválido", "Senha deve ter pelo menos 8 caracteres"). Nunca passe `errorMap` na chamada (`schema.parse(data, { errorMap })`): no Zod 3 o map por chamada tem prioridade sobre `required_error`/`invalid_type_error`/`errorMap` do próprio schema e apagaria essas mensagens; o global fica abaixo delas. Ver `tests/unit/zodErrorMap.test.js`.

**Ordem das rotas**: sub-rotas estáticas (`/summary`, `/export`, `/import`) precisam ser registradas antes de `/:id` no router, senão o Express as trata como o parâmetro `:id` e o schema de UUID as rejeita.

**Dinheiro e ponto flutuante**: o JSON traz valores como `number` do JS, e aritmética de ponto flutuante não é exata (`77.9 * 100 === 7790.000000000001`, `19.99 * 100 === 1998.9999999999998`). Nunca decida nada com base em `x * 100` ser inteiro nem compare somas com `===`. Para "tem no máximo 2 casas?", compare com o valor arredondado (`Number(x.toFixed(2)) === x`, como no `moneyAmountSchema`); para somar e exibir, arredonde para centavos no fim. A checagem antiga rejeitava 9% dos valores válidos em produção desde julho (#97), e nenhum teste com valor "redondo" (125,50; 1.400) pegou isso. Teste de valor monetário varre faixas (ver `tests/unit/validators.money.test.js`).

**Tratamento de datas**: datas de transação são armazenadas como meia-noite UTC de uma data de calendário. Lê-las com métodos de timezone local (`toLocaleDateString`, `getMonth()`) pode deslocar a data em um dia dependendo do timezone do servidor (ex.: UTC-3 faz meia-noite UTC ser lida como o dia anterior). Sempre agrupar/formatar datas usando os getters UTC (`getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`) — ver `transactions.service.js` e `recurring.service.js` para o padrão já estabelecido.

**Transações recorrentes não têm scheduler/cron** (o backend na Railway não tem serviço de worker). Em vez disso, `recurring.service.js` gera as ocorrências vencidas de forma preguiçosa (lazy): todo caminho de leitura que toca dados de transação (lista de transações, resumo do dashboard, exportação CSV, progresso de orçamento, e a própria lista de recorrências) primeiro chama `generateDueRecurringTransactions(userId)`, que percorre cada template ativo mês a mês desde `lastGeneratedDate` (ou `startDate`) até hoje, materializa qualquer ocorrência vencida como uma linha real de `Transaction`, e grava `lastGeneratedDate`. Isso faz chamadas repetidas serem um no-op barato assim que está em dia. `dayOfMonth` é limitado ao último dia real de meses mais curtos (ex.: 31 → 28/29 de fevereiro).

**Recorrência de valor variável (#32)** (`variableAmount: true`, `amount` nulo; água, luz): **nunca** gera transação sozinha, e o `generateDueRecurringTransactions` a ignora. Cada mês vencido é uma **pendência calculada** (vencimentos desde `startDate` menos os já resolvidos), não uma linha no banco. Só `RecurringOccurrence` guarda o que foi resolvido: `CONFIRMED` (com a `Transaction` criada no mesmo `create` aninhado) ou `SKIPPED`. A chave é `dueDate`, não a data da transação, para confirmar com outra data de pagamento (ou editá-la depois) não fazer a pendência voltar. Assim dashboard, metas e CSV continuam enxergando só transações reais, sem saber que conta variável existe. `variableAmount` não muda depois de criado: virar fixo faria a geração automática preencher de novo meses já confirmados à mão.

**Importação/exportação de CSV**: o limite do `express.json()` é elevado para 2mb (padrão é 100kb) especificamente porque o conteúdo da importação de CSV vem com escape JSON dentro do corpo da requisição e pode conter até `MAX_IMPORT_ROWS` linhas. As respostas de exportação definem `Content-Disposition`, o que exige a allow-list `exposedHeaders` do CORS em `app.js` para o frontend conseguir lê-lo.

**O backend roda atrás do proxy reverso da Railway** — `app.set("trust proxy", 1)` em `app.js` é necessário para que o `express-rate-limit` (e qualquer outra coisa que leia `req.ip`) veja o IP real do cliente em vez do IP do proxy.

Comandos, configuração do banco de teste de integração, e convenções gerais do repositório: ver o `CLAUDE.md` raiz e o `AGENTS.md`.
