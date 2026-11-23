# Verificação E2E (22/11/2026) e Plano do Escopo Futuro

Base verificada: branch `feat-DataBase-and-Lint` (commit `491ac29`), Postgres 17 do Docker Compose, banco isolado `raiapp_e2e` (migrate + seed), dev server Next 16.

---

## Parte 1 — Resultado da verificação

### 1.1 Checklist de qualidade (SPEC §6)

| Comando | Resultado |
|---|---|
| `bun run lint` (Biome) | ✅ 159 arquivos, 0 erros |
| `bun run typecheck` | ✅ 0 erros em 153 arquivos |
| `bun test` | ✅ 45/45 testes (168 expects) contra `raiapp_test` |
| `bun run build` | ✅ 24 rotas, Proxy ativo |
| `db:migrate` + `db:seed` 2× | ✅ seed idempotente |
| `docker compose up --build` (app) | ⚠️ não executado; ver bug B3 |

### 1.2 Matriz rota × papel (login real no Better Auth)

Todos os 26 caminhos testados com anônimo, membro Mídias, membro Processos, coordenadora Inovação, coordenador Técnico Sustentável e diretoria. **Tudo bate com a matriz RBAC do SPEC §3:**
- anônimo → `/login` em todas as rotas de `(app)`; logado em `/login` ou `/cadastro` → `/dashboard`;
- eixo alheio → 403; eixo inexistente ou item inexistente → 404;
- `projetos/novo`, `editar` e `membros/[id]` só para a coordenação do eixo; o painel também para a diretoria;
- `inventario/novo`: 403 para membro Mídias, 200 para Processos (proposta), coordenação e diretoria;
- diretoria em `/minha-area` → `/diretoria`; `/diretoria/*` → 403 para os demais papéis;
- senha errada → 401.

### 1.3 Fluxos funcionais testados no navegador

- Login por formulário, acesso rápido dev (login e header) e logout (sessão revogada, volta para `/login`). ✅
- Requisição de componente (membro) → aparece "Pendente" → Painel da Coordenação → recusar sem observação exibe erro → aprovar cria `loan` em transação e o estoque cai de 3 para 1 livre. ✅
- Contador do painel = requisições + propostas (5 → 4). ✅
- `/diretoria/membros`: promover membro a coordenador de eixo que já tem coordenador → "Já existe coordenador neste eixo." ✅
- Cadastro: `role` injetado no body é rejeitado (422); cadastro válido cria `membro`. ✅
- Mobile (375px): dashboard, inventário, eixo, projeto, edição, avaliação e membro sem scroll horizontal. ✅

### 1.4 Bugs e divergências encontrados

| # | Severidade | Problema | Onde | Correção sugerida |
|---|---|---|---|---|
| B1 | **Alta** | **Loop de redirect** com cookie de sessão inválido, expirado ou revogado: `/login` → `/dashboard` (o Proxy vê o cookie) → `/login` (a sessão não existe no banco) → … O navegador mostra `ERR_TOO_MANY_REDIRECTS`. Acontece após `docker compose down -v` + seed, troca de `BETTER_AUTH_SECRET` ou sessão revogada em outro dispositivo. | `src/proxy.ts`, `src/lib/session.ts` | Em `getCurrentMember()`, ao não achar sessão, redirecionar para uma rota que limpa o cookie (ex.: `/api/auth/sign-out` ou um route handler `/sair`), ou deixar o Proxy não redirecionar `/login`/`/cadastro` quando houver cookie (só as rotas protegidas). Adicionar teste. |
| B2 | Média | Regras do cadastro só valem no formulário: `POST /api/auth/sign-up/email` direto aceita `name: "A"` (SPEC: ≥ 3). Eixo/time inválidos são barrados pelo hook, mas com o erro genérico `FAILED_TO_CREATE_USER` e stack trace no log a cada tentativa. | `src/lib/auth.ts` (`databaseHooks.user.create.before`) | Validar `name` (trim, ≥ 3) no hook com o mesmo schema Zod do formulário e lançar `APIError("BAD_REQUEST", …)` em vez de `Error` (resposta 400 legível, sem stack no log). |
| B3 | Média | O container `app` não aplica migrations: num volume novo, `docker compose up --build` sobe um app que responde 500 (`relation "user" does not exist`). | `Dockerfile` / `docker-compose.yml` | Adicionar serviço one-shot `migrate` (`bun run db:migrate`) com `depends_on: condition: service_completed_successfully`, ou um entrypoint que rode as migrations antes do `next start`. |
| B4 | Baixa | Aviso do React: "Select elements must be either controlled or uncontrolled". O `Select` sempre passa `defaultValue=""`, mesmo quando recebe `value` (usado em `member-role-list.tsx`). | `src/components/ui/select.tsx:19` | Só aplicar `defaultValue` quando `props.value === undefined`. |
| B5 | Baixa | Links mortos: "Ver todas" e cada atividade recente usam `href="#"`. | `features/dashboard/components/recent-activities.tsx:21,38` | Resolvido pela Fase 2 (tela de atividades); até lá, renderizar sem link. |
| B6 | Baixa | "Meu perfil" e "Configurações" no menu apontam para `/dashboard`; o sino de notificações não faz nada e mostra ponto de "não lido" fixo. | `components/layout/app-header.tsx` | Resolvido pelas Fases 3 e 4; até lá, esconder ou marcar "em breve". |
| B7 | Baixa | Mobile: as abas do eixo rolam na horizontal e "Painel da Coordenação" (com o contador) fica fora da tela, sem indicação de que há mais abas. | `components/ui/section-tabs.tsx` | Fade/gradiente na borda, ou `scrollIntoView` da aba ativa/contador, ou rótulo curto "Painel" no mobile. |
| B8 | Baixa | Ações sem feedback de sucesso: enviar requisição limpa o formulário sem mensagem. Os 13 botões "Alterar papel" têm o mesmo nome acessível. | `request-form.tsx`, `member-role-list.tsx` | `<Alert tone="success">` temporário; `aria-label="Alterar papel de {nome}"`. |
| B9 | Nit | `role === "diretoria"` direto em páginas, contra a regra do `frontend.md` (decisão de acesso só em `access.ts`). | `app/(app)/minha-area/layout.tsx:8`, `minha-area/page.tsx:35` | Criar `isDirector()`/`hasPersonalArea()` em `access.ts` + teste. |
| B10 | Nit | Dois hex soltos: `themeColor` em `app/layout.tsx` (aceitável em metadata) e `#ffffff` em `logo.tsx`. | — | Usar `var(--color-surface)` no logo. |

**Conformidade do front com o design system:** boa. Não há cores Tailwind cruas, imports entre features, `components/ui` importando de `features`, `confirm()` nativo nem `export default` fora de páginas. Também não há resquícios de `mock-data`. Visualmente, as telas seguem os tokens (Sora/Poppins, `ScorePanel`, `Badge`, `PageHeader`).

> Observação operacional: o shell local exporta `DATABASE_URL`/`BETTER_AUTH_URL`, e isso **tem precedência sobre o `.env`**. Comandos `db:*` rodados "contra outro banco" via `.env` caem no banco do shell. Vale registrar no README.

---

## Parte 2 — Plano para o Escopo Futuro (SPEC §7)

Ordem recomendada: **Fase 0 → 1 → 3 → 2 → 4**. Perfil e senha (Fase 3) dependem do envio de e-mail (Resend) da Fase 1. Notificações (Fase 4) ficam por último porque consomem eventos de todas as outras.

Cada fase segue o checklist do `code-quality.md` (lint, typecheck, test, build) + conferência desktop/mobile e termina com a atualização do `SPEC.md` (mover o item de §7 para §4).

### Fase 0 — Correções da verificação ✅ concluída em 22/11/2026

> B1–B10 corrigidos. B5/B6: placeholders removidos (voltam nas Fases 2–4). Testes novos em `src/proxy.test.ts`, `access.test.ts` e `api.test.ts`; `docker compose` validado com imagem de produção em banco novo.

1. B1 (loop de sessão) com teste de regressão.
2. B3 (migrations no compose) e validação de `docker compose down -v && docker compose up --build` do zero.
3. B2, B4, B7, B8, B9, B10.
4. B5/B6: esconder os placeholders até as fases correspondentes.

### Fase 1 — Verificação de e-mail e "Esqueceu sua senha?"

> ✅ **Concluída em 22/11/2026.** Rotas `/verificar-email`, `/esqueci-senha` e `/redefinir-senha`; mailer `src/lib/mail.ts` (resend/console/memory) + `mail-templates.ts`; migration `0001_email_verification`; bloqueio de contas pendentes em `src/lib/session.ts` (`getSessionState`) com regra pura `isPendingEmailVerification` em `access.ts`. Testes: `src/lib/auth-flows.test.ts` (10) e `src/lib/mail.test.ts` (6). Pendente fora do código: verificar o domínio no Resend e configurar `RESEND_API_KEY`/`MAIL_FROM` em produção.

> Pré-requisito externo: conta no Resend com o domínio de envio verificado (registros DNS SPF/DKIM) e a `RESEND_API_KEY` de produção configurada no ambiente de deploy.

**Infra (decisão: Resend)**
- Envio pela **API HTTP do Resend** (`POST https://api.resend.com/emails`) com `fetch`, sem o SDK `resend` e sem lib nova.
- `.env.example`: `RESEND_API_KEY`, `MAIL_FROM` (domínio verificado no Resend), `MAIL_DRIVER=resend|console`.
- Dev e testes: `MAIL_DRIVER=console` registra o e-mail (com o link) no log do servidor, sem precisar de chave nem de Mailpit. Opcionalmente, a chave de teste do Resend pode ser usada com o endereço `delivered@resend.dev`.
- Produção: `MAIL_DRIVER=resend` obrigatório. Na inicialização, falhar se `RESEND_API_KEY` estiver ausente com `NODE_ENV=production`.

**Código**
- `src/lib/mail.ts` (`server-only`): `sendMail({ to, subject, html, text })` com os drivers `resend` e `console`. Trata 4xx/5xx do Resend, loga sem vazar a chave e não derruba o fluxo de cadastro se o envio falhar (o usuário pode pedir reenvio).
- Templates em português com a marca, em `src/lib/mail-templates.ts`.
- `src/lib/auth.ts`:
  - `emailVerification: { sendVerificationEmail, sendOnSignUp: true, autoSignInAfterVerification: true }`;
  - `emailAndPassword: { sendResetPassword, resetPasswordTokenExpiresIn: 3600 }`;
  - `revokeSessionsOnPasswordReset: true`.
- **Verificação só para novos cadastros (decisão 2):** não ligar `requireEmailVerification` globalmente, porque isso bloquearia as contas antigas.
  - Migration: coluna `user.verification_required boolean not null default false`. O hook `databaseHooks.user.create.before` grava `true` em todo cadastro novo.
  - `getCurrentMember()` e o `loginAction` bloqueiam quem tem `verification_required && !emailVerified`, mandando para `/verificar-email`.
  - Contas antigas seguem com `false` e entram normalmente até serem apagadas. Quando não existirem mais, dá para trocar pela flag global `requireEmailVerification: true` e remover a coluna.
- Rotas públicas novas em `app/(auth)/`: `esqueci-senha`, `redefinir-senha` (lê `?token`), `verificar-email` (estado "enviamos um link" + reenviar).
- `src/proxy.ts`: incluir as novas rotas em `PUBLIC_AUTH_ROUTES`, sem redirecionar quem já está logado em `verificar-email`.
- `features/auth`: `forgot-password-form.tsx`, `reset-password-form.tsx`, schemas Zod e actions (`requestPasswordReset`, `resetPassword`, `sendVerificationEmail`).
- Login: link "Esqueceu sua senha?". Conta nova não verificada vai para `/verificar-email`, com botão "Reenviar e-mail" e cooldown de 60 s.
- Resposta de "esqueci a senha" sempre neutra ("se o e-mail existir, enviaremos…"), sem revelar contas.
- Seed: usuários do seed com `emailVerified = true`.

**Testes**
- Unidade: actions com mailer mockado (token gerado, e-mail montado).
- Integração (`api.test.ts`/`auth.test.ts`): reset com token válido, expirado e reutilizado; conta nova não verificada é bloqueada; conta antiga (`verification_required = false`) continua entrando.
- E2E manual: o fluxo completo com `MAIL_DRIVER=console`, copiando o link do log, e um envio real em staging com o domínio verificado no Resend.

### Fase 2 — CRUD de atividades, metas de eixo, pontuações e ciclos

Hoje `activities`, `eixo_goals` e `eixo_metrics` só são alimentadas pelo seed. Os ciclos estão fixos em `config/options.ts` (`EVALUATION_CYCLES`) e `user.score` não tem fluxo de alteração.

**Modelo (migration nova)**
- `evaluation_cycles` (`id`, `label`, `starts_on date`, `ends_on date`) com constraint de exclusão impedindo períodos sobrepostos. `evaluations.cycle` passa a ser FK para `evaluation_cycles.id` (migration de dados convertendo "Novembro/26"/"Outubro/26").
- **Ciclo por data (decisão 5):** nenhum status gravado e nenhum cron. Na linha do `effectiveProgress()`, `getCurrentCycle(today)` = ciclo com `starts_on <= today <= ends_on`, e `getPreviousCycle(today)` = o último com `ends_on < today`.
  - `submitEvaluation` rejeita quando não há ciclo vigente ou quando `today > ends_on` (validado na transação).
  - Geração automática: se não houver ciclo para o mês atual, o sistema cria o ciclo mensal ("Dezembro/26", do dia 1º ao último dia do mês) de forma idempotente (`INSERT … ON CONFLICT DO NOTHING`) na primeira leitura. A diretoria só ajusta datas de ciclos futuros.
- `activities`: `created_by`, `created_at`, `points integer not null default 0`; `date` como `date` em vez de `text`.
- **Pontuação em duas fontes (decisão 4):** ledger `score_entries` (`member_id`, `delta`, `source: atividade|ajuste`, `activity_id?`, `reason`, `created_by`, `created_at`), com `CHECK` que exige `activity_id` quando `source = 'atividade'` e `reason` não vazio quando `source = 'ajuste'`.
  - Registrar ou concluir uma atividade com pontos gera a entrada `atividade` na mesma transação. Editar ou excluir a atividade gera uma entrada de estorno, sem apagar histórico.
  - Ajuste manual = entrada `ajuste` com motivo obrigatório.
  - `user.score` é atualizado na mesma transação (`score = score + delta`), e um teste garante `user.score = SUM(score_entries.delta)`.
- `eixo_metrics` vira view/consulta derivada (score do eixo = soma ou média dos membros por time) em vez de tabela mantida à mão.
- `eixo_goals`: `created_by`, `updated_at`; `deadline` como `date`.

**Permissões (`access.ts` + testes)**
- `canManageActivities(viewer, member)`: coordenação do eixo do membro e diretoria.
- `canManageEixoGoals(viewer, eixo)`: coordenação do eixo.
- `canEditFutureCycle(viewer)`: diretoria, apenas para ciclos que ainda não começaram.
- `canAdjustScore(viewer, member)`: coordenação do eixo e diretoria, sempre com motivo.

**Telas**
- `/minha-area/atividades` (ou `/atividades`): lista paginada; resolve o "Ver todas" (B5). Coordenação registra atividade para um membro (gera `score_entries`).
- `/eixos/[eixo]/painel` ganha as abas "Metas" (CRUD de `eixo_goals`) e "Pontuação" (ajustes com motivo, histórico).
- `/diretoria/ciclos`: lista de ciclos (vigente, passados e futuros) e edição de datas só dos futuros. `getEvaluationCycle` lê do banco, e `/avaliacao` mostra "encerra em X dias".

**Testes:** com a data injetada (`today` como parâmetro, sem depender do relógio): virada de ciclo, envio rejeitado depois de `ends_on`, criação automática idempotente, sobreposição de períodos rejeitada; ledger (atividade, estorno, ajuste com motivo) mantendo `user.score = SUM(delta)`; permissões por papel.

### Fase 3 — "Meu perfil"

- Rota `/perfil` (corrige B6), com seções:
  - **Dados:** nome (Zod ≥ 3) via `auth.api.updateUser`.
  - **Avatar (decisão 3: só URL):** campo de URL gravado em `user.image`, sem upload.
    - Zod: `https:` obrigatório, até 2048 caracteres; vazio remove o avatar.
    - Pré-visualização no formulário; se a imagem não carregar, o `Avatar` cai no fallback por iniciais (já existente).
    - Renderizar com `<img referrerPolicy="no-referrer">`, sem `next/image` (evita configurar `remotePatterns` para qualquer domínio).
  - **Senha:** `auth.api.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`.
  - **Sessões ativas:** `listSessions` + "Encerrar outras sessões" (sai de graça com o Better Auth e mitiga B1).
  - **E-mail:** troca com reverificação (`changeEmail`), depende da Fase 1.
- "Configurações" no menu: remover ou fundir em `/perfil` (preferências de notificação da Fase 4 entram aqui).
- Eixo, time e papel ficam **somente leitura** no perfil (mudança só pela diretoria).

### Fase 4 — Central de notificações em tempo real

**Modelo**
- `notifications` (`id`, `recipient_id`, `type`, `title`, `body`, `href`, `read_at`, `created_at`) com índice `(recipient_id, read_at, created_at desc)`.
- `notification_preferences` (opcional): por tipo, ligado/desligado/e-mail.

**Produção de eventos (dentro das transações existentes em `lib/api`)**
- Requisição criada → coordenação do eixo (ou diretoria, se for `pedido`).
- Requisição aprovada/recusada/avançada → solicitante.
- Proposta de inventário resolvida → proponente.
- Tarefa atribuída ou status alterado → responsável/coordenação.
- Papel/eixo alterado pela diretoria → membro afetado.
- Ciclo de avaliação aberto (Fase 2) → todos.
- Helper `notify(tx, recipients, payload)` em `src/lib/api/notifications.ts`, chamado na **mesma transação** da mutação.

**Entrega em tempo real**
- Postgres `LISTEN/NOTIFY` (`pg_notify('notifications', recipient_id)` após o insert) + route handler `GET /api/notifications/stream` com **SSE** (`ReadableStream`), autenticado por `getSessionMember()`, usando `sqlClient.listen()` do postgres.js. Sem libs novas, e funciona em múltiplas instâncias.
- Fallback: polling a cada 30 s quando o SSE cair.
- Cliente: `NotificationBell` (client) no `AppHeader` com contador real, dropdown das últimas 10 e "marcar todas como lidas"; página `/notificacoes` com histórico paginado.
- Server actions: `markAsRead(id)`, `markAllAsRead()`.

**Testes:** cada mutação gera a notificação certa para o destinatário certo (sem vazar para outro eixo); `markAsRead` só no que é do próprio viewer; o stream rejeita anônimo.

### Decisões do dono do produto (22/11/2026)
1. **E-mail:** Resend, via API HTTP com `fetch` (sem lib nova).
2. **Verificação de e-mail:** exigida só para **novos cadastros**. As contas antigas de produção serão apagadas manualmente depois, e a regra não depende disso.
3. **Avatar:** somente **URL** externa.
4. **Pontuação:** **as duas** fontes: pontos de atividades + ajustes manuais com motivo, num ledger único.
5. **Ciclo de avaliação:** aberto e fechado **pelo sistema, por data**.
