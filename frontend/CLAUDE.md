# Arquitetura do frontend

- `src/api/*.js` — um arquivo por módulo do backend, wrappers finos em torno de um `apiClient` compartilhado (`src/api/client.js`, uma instância do Axios). Um interceptor de requisição anexa `Authorization: Bearer <token>` a partir de `localStorage["fintrack_token"]` automaticamente — os pontos de chamada da API nunca lidam com o header de autenticação diretamente.
- `src/context/AuthContext.jsx` — guarda `user`/`isLoading` e todas as ações de autenticação (login, registro + fluxo de verificação de e-mail, troca de senha, exclusão de conta, login como demo). Ao montar, se um token sobreviveu a um refresh, ele é validado via `meRequest()` antes de renderizar conteúdo protegido.
- `src/context/ThemeContext.jsx` — modo escuro, preferência persistida + detecção do sistema.
- `src/components/ProtectedRoute.jsx` — guarda de rota usada em `App.jsx` em toda página autenticada.
- O roteamento (`src/App.jsx`) é uma árvore `<Routes>` plana do `react-router`; não há roteamento de layout aninhado.
- `src/utils/demo.js` — `isDemoUser(user)` controla comportamentos que não devem se aplicar à conta pública compartilhada "Entrar como visitante" (ex.: `/account` redireciona para `/dashboard` em vez de mostrar a UI de perfil/exclusão de conta — ver `AccountRoute` em `App.jsx`, issue #13).

**O registro não loga o usuário automaticamente.** `register()` não retorna mais um token — a conta precisa verificar o e-mail primeiro (`verifyEmail(token)` é quem armazena o token e define `user`). Da mesma forma, `confirmEmailChange` reemite e substitui o token armazenado, já que a identidade do e-mail acabou de mudar.

Comandos e convenções gerais do repositório: ver o `CLAUDE.md` raiz e o `AGENTS.md`.
