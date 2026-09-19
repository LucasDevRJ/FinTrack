# Frontend architecture

- `src/api/*.js` — one file per backend module, thin wrappers around a shared `apiClient` (`src/api/client.js`, an Axios instance). A request interceptor attaches `Authorization: Bearer <token>` from `localStorage["fintrack_token"]` automatically — API call sites never handle auth headers themselves.
- `src/context/AuthContext.jsx` — holds `user`/`isLoading` and all auth actions (login, register + e-mail verification flow, password change, account deletion, demo login). On mount, if a token survived a refresh, it's validated via `meRequest()` before rendering protected content.
- `src/context/ThemeContext.jsx` — dark mode, persisted preference + system detection.
- `src/components/ProtectedRoute.jsx` — route guard used in `App.jsx` for every authenticated page.
- Routing (`src/App.jsx`) is a flat `react-router` `<Routes>` tree; there's no nested layout routing.
- `src/utils/demo.js` — `isDemoUser(user)` gates behavior that shouldn't apply to the shared public "Entrar como visitante" account (e.g. `/account` redirects to `/dashboard` instead of showing profile/delete-account UI — see `AccountRoute` in `App.jsx`, issue #13).

**Registration doesn't log the user in.** `register()` no longer returns a token — the account must verify its e-mail first (`verifyEmail(token)` is what stores the token and sets `user`). Similarly, `confirmEmailChange` re-issues and replaces the stored token, since the e-mail identity just changed.

Commands and general repo conventions: see the root `CLAUDE.md` and `AGENTS.md`.
