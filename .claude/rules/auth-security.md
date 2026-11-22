---
paths:
  - "src/lib/auth*"
  - "src/lib/session.ts"
  - "src/lib/dev-auth.ts"
  - "src/lib/access.ts"
  - "src/lib/action-helpers.ts"
  - "src/proxy.ts"
  - "src/app/api/auth/**"
  - "src/features/**/actions.ts"
---

# Regras de Autenticação, Sessão e Segurança

## Autenticação com Better Auth
- Configuração central em `src/lib/auth.ts` usando `drizzleAdapter(db, { provider: "pg", schema })`, `emailAndPassword: { enabled: true, minPasswordLength: 8 }` e plugin `nextCookies()`.
- Endpoint HTTP exposto exclusivamente em `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler(auth)`.
- `role` é campo protegido (`input: false` em `additionalFields`). Cadastro público (`/cadastro`) **sempre** cria `role = "membro"` com `eixo` e `time` validados contra `EIXOS` e `TIMES`.
- Alteração de papéis (`membro`, `coordenador`, `diretoria`) só pode ocorrer pela Diretoria em `updateMemberRole` (`/diretoria/membros`), garantindo:
  - Máximo de 1 coordenador por eixo.
  - Impossibilidade de remover o último membro com papel `diretoria`.
  - Invariantes de vínculo (`eixo`/`time`) válidas e limpeza de vínculos de projetos/tarefas ao mudar de eixo.

## Defesa em Profundidade (Next.js 16)
1. **Camada 1 — `src/proxy.ts`** (substitui `middleware.ts` no Next.js 16):
   - Verificação otimista de presença de cookie via `getSessionCookie(request)` (`better-auth/cookies`).
   - Redireciona rotas privadas sem cookie para `/login`.
   - **Não** redireciona `/login`/`/cadastro` por presença de cookie: um cookie órfão (sessão expirada/revogada, banco recriado, segredo trocado) causaria loop `/login` ↔ `/dashboard`. Quem já está logado é redirecionado pelo layout `app/(auth)/layout.tsx`, que valida a sessão no banco.
   - Nunca confie apenas no Proxy para segurança de dados.
2. **Camada 2 — `src/lib/session.ts`**:
   - `getSessionMember()` valida a sessão no banco via `auth.api.getSession({ headers: await headers() })`, deduplicada por request com `React.cache()`.
   - `getCurrentMember()` exige sessão válida em páginas de `(app)` e executa `redirect("/login")` se ausente.
3. **Camada 3 — Server Actions (`src/lib/action-helpers.ts`) e `src/lib/api/`**:
   - Toda Server Action autenticada usa `withAuthAction` / `getSessionMember()`, retornando `{ ok: false, error: "Sessão expirada. Faça login novamente." }` se não autenticado.
   - Valida o payload com Zod antes de chamar `src/lib/api/`.
   - Páginas autenticadas sem permissão chamam `forbidden()` (habilitado por `experimental.authInterrupts: true`), renderizando `src/app/(app)/forbidden.tsx` (HTTP 403).

## Seletor Rápido de Desenvolvimento (`DEV_QUICK_SWITCH`)
- Só é habilitado quando **`process.env.NODE_ENV !== "production"` E `process.env.DEV_QUICK_SWITCH === "true"`**.
- Nunca usa cookie paralelo nem bypassa `getSession()`: cria uma **sessão real do Better Auth** no PostgreSQL para o usuário escolhido e grava o cookie assinado do Better Auth.
- Quando desabilitado (ou em produção), o seletor não é renderizado, a lista de usuários não é exposta e a action retorna `denied()`.
