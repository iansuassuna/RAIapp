---
paths:
  - "src/db/**"
  - "src/lib/api/**"
---

# Regras de Banco de Dados e Camada de API (`src/db/`, `src/lib/api/`)

## Stack de Persistência
- **PostgreSQL 17** via Docker Compose (`docker-compose.yml`), com bancos `raiapp` (dev/prod) e `raiapp_test` (testes).
- **Drizzle ORM** (`drizzle-orm/postgres-js`) com driver **`postgres` (`postgres.js`)**.
- Schema organizado em `src/db/schema/` (`enums.ts`, `auth.ts`, `domain.ts`, `index.ts`).
- Nunca volte a usar armazenamento em memória (`globalThis`) ou importar `mock-data.ts` em código de produção.

## Convenções de Schema e Migrations
- Toda mudança estrutural em `src/db/schema/` exige gerar migration com `bun run db:generate` e validar com `bun run db:migrate`.
- Mantenha invariantes de domínio também no banco via `CHECK`, `UNIQUE` e `FOREIGN KEY`:
  - `user`: `role = 'membro'` exige `eixo IS NOT NULL AND time IS NOT NULL`; `role = 'coordenador'` exige `eixo IS NOT NULL AND time IS NULL`; `role = 'diretoria'` exige `eixo IS NULL AND time IS NULL`.
  - `evaluations`: `UNIQUE (cycle, evaluator_id, evaluatee_id)` e `CHECK (evaluator_id <> evaluatee_id)`.
  - Quantidades (`inventory_items.total >= 0`, `project_components.quantity > 0`, `loans.quantity > 0`).
- Use `src/db/seed.ts` de forma **idempotente** (rodar duas vezes seguidas não deve falhar nem duplicar registros).

## Camada de Dados (`src/lib/api/`)
- Toda função que acessa o banco é `async`.
- Funções que dependem de permissão recebem `viewer: Member` e chamam funções puras de `src/lib/access.ts`. Leituras sem acesso retornam `null` ou lista filtrada; escritas retornam `ActionResult` com erro (`denied()` / `notFound()`).
- **Transações obrigatórias**: toda mutação que toca mais de uma tabela ou valida estado concorrente (`resolveRequest`, `completePurchase`, `resolveProposal`, `updateProject`, `deleteProject`, `updateMemberRole`, `allocateComponent`) deve rodar dentro de `db.transaction(async (tx) => ...)`.
- **Evite N+1**: agregações (como estoque em uso em `getInventory`) devem usar `SUM`/`GROUP BY` em SQL ou carregar coleções em lote (`inArray`), nunca queries dentro de `.map()` / `for`.
- Nunca use `sql.raw` com entrada do usuário; use sempre queries parametrizadas do Drizzle.
- Regras temporais derivadas (ex.: reunião passada → `realizada`, autorização vencida → `expirada`) continuam sendo calculadas por `effectiveProgress()`, não gravadas em cron.
