<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Projeto RAIapp — Guia Geral para Agentes de IA

> **Importante**: Nunca remova nem edite o bloco `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` acima.

### Fontes Canônicas
- **Especificação funcional e técnica**: `SPEC.md`
- **Instruções detalhadas e regras por camada**: `CLAUDE.md` e `.claude/rules/` (`frontend.md`, `backend-db.md`, `auth-security.md`, `code-quality.md`)
- **Design System**: `docs/DESIGN_SYSTEM.md`

### Stack Oficial
- **Runtime**: Bun (`bun run`, `bun install`, `bun test`, `bun check`) — não use `npm`/`yarn`/`pnpm`/`node`.
- **Framework**: Next.js 16 (App Router, `src/proxy.ts`, `experimental.authInterrupts: true`) + React 19 + TypeScript 7 + Tailwind CSS v4.
- **Banco de Dados**: PostgreSQL 17 (via Docker Compose) + **Drizzle ORM** (`drizzle-orm/postgres-js` + `postgres`).
- **Autenticação**: **Better Auth** (`drizzleAdapter` + `nextCookies()`) em `src/lib/auth.ts` e `/api/auth/[...all]`.
- **Lint & Formatação**: **Biome** (`biome.json`).

### Arquitetura e Fronteiras
- Fluxo unidirecional: `app` → `features` → `components` → `lib`/`config`/`types`/`db`.
- `components/ui` nunca importa de `features`; uma feature nunca importa de outra.
- Regras de autorização vivem exclusivamente em `src/lib/access.ts` (funções puras) e são enforçadas no servidor em `src/lib/api/`.
- Operações compostas de escrita em banco devem usar `db.transaction(...)`.
- Toda Server Action valida entrada com Zod, valida sessão via `src/lib/action-helpers.ts` e delega permissão + escrita a `src/lib/api/`.

### Comandos de Verificação Obrigatórios
```bash
bun run lint         # Biome (lint + format + imports)
bun run typecheck    # TypeScript (bun check)
bun test             # Testes unitários e de integração (requer Postgres do Docker ativo)
bun run build        # Build de produção Next.js 16
```
