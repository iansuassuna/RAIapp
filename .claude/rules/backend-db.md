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

## Pontuação, Atividades e Ciclos (Fase 2)
- **Ledger**: toda mudança de pontos passa por `addScoreEntry(tx, …)` em `src/lib/api/scores.ts`, que grava em `score_entries` e atualiza `user.score` na mesma transação. Nunca faça `update user set score = …` em outro lugar; o invariante `user.score = SUM(score_entries.delta)` é testado em `scoring.test.ts`.
- Lançamentos nunca são apagados: correções e exclusões de atividade geram estorno. `syncActivityCredit` lança só a diferença entre o que a atividade deve render (pontos se concluída, senão 0) e o que já creditou — é idempotente.
- **Ciclos de avaliação** são por data: use `getCurrentCycle(today)` / `getPreviousCycle(today)` de `lib/api/cycles.ts` (com `today` injetável nos testes). A criação automática roda em transação com `pg_advisory_xact_lock`. Não grave status de ciclo nem use cron.
- Funções que dependem da data aceitam `today: string = todayIso()` (AAAA-MM-DD, fuso de Fortaleza) para testes determinísticos.
- O seed é idempotente também para o ledger: só lança pontos de atividades inseridas na própria execução e ajusta `user.score` de usuários que já existiam.
