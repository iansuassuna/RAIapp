# RAITec App (RAIapp)

Plataforma interna do **RAITec · UFC** em **Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript**, com **PostgreSQL 17 (Docker Compose) + Drizzle ORM (`postgres.js`)**, autenticação via **Better Auth** e lint/formatação com **Biome**, rodando com **Bun**.

## Requisitos

- [Bun](https://bun.sh) 1.4+
- Docker e Docker Compose

## Subindo em Desenvolvimento

```bash
cp .env.example .env
bun install
bun run db:up          # sobe PostgreSQL 17 no Docker (porta padrão 5433)
bun run db:migrate     # aplica as migrations do Drizzle
bun run db:seed        # popula os dados iniciais (idempotente)
bun run dev            # http://localhost:3000
```

### Rodando tudo em Docker (PostgreSQL + App)

```bash
docker compose up --build
```

O serviço `migrate` aplica as migrations (`bun src/db/migrate.ts`) e encerra; o `app` só sobe depois dele. Para popular os dados iniciais no banco do container:

```bash
docker compose run --rm app bun src/db/seed.ts
```

> Variáveis exportadas no shell (ex.: `DATABASE_URL`) **têm precedência sobre o `.env`**. Confira `echo $DATABASE_URL` antes de rodar `db:migrate`/`db:seed` para não atingir o banco errado.

## Autenticação e Modo de Desenvolvimento Rápido

- A autenticação é gerenciada pelo **Better Auth** (`/api/auth/[...all]`, sessões persistidas no PostgreSQL, cookies HTTP-only assinados e proteção via `src/proxy.ts` + `src/lib/session.ts`).
- O cadastro público (`/cadastro`) cria contas sempre com papel **`membro`**. A **diretoria** promove/altera papéis em `/diretoria/membros`.
- Contas novas precisam **confirmar o e-mail** antes de usar o app; "Esqueceu sua senha?" envia um link de redefinição.
  - Em desenvolvimento (`MAIL_DRIVER=console`), os e-mails **não são enviados**: o link aparece no log do `bun run dev` (procure por `[mail:console]`).
  - Em produção (`MAIL_DRIVER=resend`), defina `RESEND_API_KEY` e `MAIL_FROM` com um domínio verificado no Resend (registros SPF/DKIM).
  - Após atualizar o código, rode `bun run db:migrate` (migration `0001_email_verification`).

## Atividades, Pontuação e Ciclos de Avaliação

- A coordenação do eixo (e a diretoria) registra atividades e ajusta pontos; cada membro vê os seus em `/atividades`. A pontuação é a soma de um histórico de lançamentos (`score_entries`): correções viram estorno, nada é apagado.
- Os ciclos da avaliação cruzada são por data: um ciclo novo é criado automaticamente a cada mês. A diretoria ajusta datas de ciclos futuros em `/diretoria/ciclos`.
- Ao atualizar o código, rode `bun run db:migrate`: a migration `0002` converte as avaliações existentes ("Novembro/26" → ciclo `2026-11`) e cria o saldo inicial de pontos de cada membro; a `0003` remove a antiga `eixo_metrics`.
- Contas semeadas pelo `bun run db:seed` usam a senha definida em `DEV_SEED_PASSWORD` (padrão: `raitec123`), ex.:
  - Diretoria: `lucas@raitec.ufc.br`
  - Coordenação (Inovação): `ana@raitec.ufc.br`
  - Membro (Mídias · Inovação): `bruno@raitec.ufc.br`
  - Membro (Processos · Inovação): `carla@raitec.ufc.br`
- **Troca rápida em dev (`DEV_QUICK_SWITCH`)**:
  - Com `DEV_QUICK_SWITCH=true` no `.env` (apenas fora de produção), `/login` e o menu do header exibem um seletor para trocar de usuário criando uma **sessão real do Better Auth** no banco.
  - Com `DEV_QUICK_SWITCH=false` (ou em produção), o seletor é ocultado/bloqueado e todo acesso exige login manual.

## Scripts Principais

| Script | Descrição |
|---|---|
| `bun run dev` | Servidor de desenvolvimento Next.js 16 |
| `bun run build` / `bun run start` | Build e execução de produção |
| `bun run lint` / `bun run lint:fix` | Lint, formatação e imports com Biome |
| `bun run typecheck` | Verificação de tipos (`bun check`) |
| `bun test` | Testes unitários e de integração (`DATABASE_URL_TEST`) |
| `bun run db:up` / `bun run db:down` | Sobe/para o PostgreSQL no Docker |
| `bun run db:generate` / `bun run db:migrate` | Gera e aplica migrations Drizzle |
| `bun run db:seed` / `bun run db:studio` | Popula dados iniciais / abre Drizzle Studio |

## Telas

| Rota | Descrição |
|---|---|
| `/login` | Login com e-mail e senha (+ acesso rápido opcional em `DEV_QUICK_SWITCH=true`) |
| `/cadastro` | Cadastro de novos membros (nome, e-mail, senha + confirmação, eixo e time) |
| `/dashboard` | Desempenho, trajetória e atividades recentes |
| `/eixos/[eixo]` | Gestão de Eixos — **Visão geral**, **Projetos**, **Membros** e **Painel da Coordenação** |
| `/eixos/[eixo]/projetos/[id]` | Tarefas, prazos, componentes alocados e membros afiliados |
| `/eixos/[eixo]/membros/[id]` | Avaliações cruzadas detalhadas do membro (só coordenação do eixo) |
| `/minha-area` | Projetos afiliados, prazos, tarefas atribuídas e requisições |
| `/diretoria` | Área da diretoria: **Pedidos das coordenações** (`/diretoria`) e **Membros e papéis** (`/diretoria/membros`) |
| `/inventario` | Inventário do RAITec com filtros, controle de uso e propostas do time Processos |
| `/avaliacao` | Avaliação Cruzada entre colegas com escala 1–5 |

## Documentação

- [`SPEC.md`](SPEC.md) — especificação funcional, matriz RBAC e modelo de dados
- [`CLAUDE.md`](CLAUDE.md) e [`.claude/rules/`](.claude/rules/) — guia arquitetural e regras por camada
- [`AGENTS.md`](AGENTS.md) — notas do Next.js 16 e convenções para agentes de IA
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — tokens de design, componentes e padrões visuais
