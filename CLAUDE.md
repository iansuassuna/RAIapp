# RAIapp — Instruções do Repositório (Claude / Agentes de IA)

Aplicação web full-stack de gestão interna do **RAITec · UFC** construída com **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Drizzle ORM (`postgres.js`) + PostgreSQL + Better Auth + Biome**, rodando sobre **Bun**.

## Documentos Canônicos

- **Especificação funcional e modelo de domínio**: `SPEC.md`
- **Regras modulares de desenvolvimento**:
  - `.claude/rules/frontend.md` — padrões de UI, layout, formulários e Server Actions
  - `.claude/rules/backend-db.md` — Drizzle ORM, migrations, transações e camada `src/lib/api/`
  - `.claude/rules/auth-security.md` — Better Auth, `src/proxy.ts`, RBAC e `DEV_QUICK_SWITCH`
  - `.claude/rules/code-quality.md` — Biome, tipagem, testes e checklist de verificação
- **Design System completo**: `docs/DESIGN_SYSTEM.md`
- **Notas da versão do Next.js**: `AGENTS.md` e `node_modules/next/dist/docs/`

## Runtime e Comandos

Use sempre **Bun** (nunca `npm`, `yarn`, `pnpm`, `npx` ou `node`):

- `bun install` / `bun add` / `bun add -d` — gestão de dependências
- `bun run dev` — sobe o Next.js 16 em modo desenvolvimento (`http://localhost:3000`)
- `bun run build` / `bun run start` — build e execução de produção
- `bun run typecheck` (ou `bun check`) — checagem de tipos TypeScript
- `bun run lint` / `bun run lint:fix` — lint + formatação + organização de imports com **Biome**
- `bun test` — executa testes unitários e de integração contra PostgreSQL de teste (`DATABASE_URL_TEST`)
- `bun run db:up` / `bun run db:down` — sobe/derruba o PostgreSQL via Docker Compose
- `bun run db:generate` / `bun run db:migrate` / `bun run db:seed` / `bun run db:studio` — fluxo Drizzle ORM
- `docker compose up --build` — sobe PostgreSQL + container da aplicação (`app`)

> Bun carrega `.env` automaticamente — não adicione `dotenv`.

## Arquitetura (`src/`)

Dependências sempre de cima para baixo: `app` → `features` → `components` → `lib`/`config`/`types`/`db`.

```text
src/
├── app/
│   ├── (auth)/          rotas públicas (/login, /cadastro)
│   ├── (app)/           rotas autenticadas (dashboard, eixos, minha-area, diretoria, inventario, avaliacao)
│   └── api/auth/[...all]/ route handler do Better Auth
├── proxy.ts             Next.js 16 Proxy — verificação otimista de cookie de sessão
├── db/
│   ├── index.ts         instância Drizzle + postgres.js
│   ├── schema/          enums.ts, auth.ts, domain.ts, index.ts
│   └── seed.ts          seed idempotente (11 membros, projetos, inventário, requisições, avaliações)
├── features/<domínio>/  components/, schemas.ts (Zod), actions.ts ("use server"), index.ts
├── components/          ui/, brand/, layout/
├── config/              options.ts, requests.ts, navigation.ts
├── lib/
│   ├── api/             camada de dados por domínio (Drizzle + regras de access.ts)
│   ├── access.ts        fonte única de regras RBAC (funções puras)
│   ├── auth.ts          configuração Better Auth + drizzleAdapter + nextCookies()
│   ├── auth-client.ts   client Better Auth
│   ├── session.ts       getSessionMember() / getCurrentMember() via auth.api.getSession + React.cache
│   ├── dev-auth.ts      seletor rápido de dev (só DEV_QUICK_SWITCH=true + NODE_ENV !== production)
│   └── action-helpers.ts autenticação e revalidação compartilhadas das Server Actions
└── types/               tipos canônicos de domínio
```

## Regras Inegociáveis

1. **Banco e Driver**: Toda persistência usa **Drizzle ORM** com **`postgres` (`postgres.js`)** contra PostgreSQL (Docker). Não use `Bun.serve()`, `bun:sqlite`, `Bun.sql` direto ou armazenamento em memória.
2. **Segurança e RBAC**: Nunca confie em parâmetros de URL nem esconda dados só na UI. Toda permissão vive em `src/lib/access.ts` e é aplicada em `src/lib/api/` no servidor.
3. **Autenticação**: `src/proxy.ts` faz apenas redirecionamento otimista; a autenticação real acontece em `src/lib/session.ts` via Better Auth. O cadastro público (`/cadastro`) sempre cria `role = "membro"` (`role` tem `input: false` no Better Auth).
4. **Next.js 16**: Leia `node_modules/next/dist/docs/` antes de usar APIs sujeitas a mudanças (ex.: `proxy.ts` no lugar de `middleware.ts`, `params`/`searchParams` como `Promise`, `experimental.authInterrupts` para `forbidden()`).
5. **Qualidade**: Antes de concluir qualquer mudança, rode `bun run lint`, `bun run typecheck`, `bun test` e `bun run build`.
