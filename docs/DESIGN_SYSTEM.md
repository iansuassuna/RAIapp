# RAIapp — Padrão de Projeto & Design System

## 1. Arquitetura de pastas (feature-based)

```
src/
├── app/                      # Rotas (Next.js App Router) — só composição, sem lógica pesada
│   ├── (auth)/               # Grupo de rotas públicas → layout com painel da marca
│   │   ├── login/page.tsx
│   │   └── cadastro/page.tsx
│   ├── (app)/                # Grupo de rotas autenticadas → header + bottom nav
│   │   ├── dashboard/page.tsx
│   │   ├── eixos/page.tsx    # redireciona para o eixo do membro
│   │   ├── eixos/[eixo]/     # layout (acesso + abas): visão geral, projetos/[projectId](/editar), projetos/novo,
│   │   │                     #   membros/[memberId] (avaliações — coordenação), painel (Painel da Coordenação)
│   │   ├── inventario/       # inventário (todos veem), novo, [id], [id]/editar
│   │   ├── minha-area/       # projetos afiliados, tarefas e prazos, requisicoes (diretoria é redirecionada)
│   │   ├── diretoria/        # layout (abas): pedidos das coordenações + membros/ (gestão de papéis)
│   │   ├── forbidden.tsx     # tela "Sem acesso"
│   │   └── avaliacao/page.tsx # Avaliação Cruzada
│   ├── api/auth/[...all]/    # Route handler do Better Auth
│   ├── globals.css           # Design tokens (@theme do Tailwind v4)
│   └── layout.tsx            # Fontes, metadata, <html lang="pt-BR">
├── proxy.ts                  # Next.js 16 Proxy (redirecionamento otimista por cookie de sessão)
├── components/
│   ├── ui/                   # Primitivos genéricos (Button, Input, Card, Badge…). Sem regra de negócio.
│   ├── brand/                # Logo e elementos de identidade
│   └── layout/               # Header, BottomNav, PageHeader, DevMemberSwitcher (condicional em dev)
├── db/                       # Drizzle ORM + postgres.js (index.ts, schema/, seed.ts, seed-data.ts)
├── features/                 # Um módulo por domínio
│   ├── auth/                 # schemas (zod), actions, LoginForm, RegisterForm, DevQuickLogin
│   ├── dashboard/            # PerformanceCard, TrajectoryGrid, RecentActivities
│   ├── diretoria/            # MemberRoleList, schemas, actions (gestão de papéis)
│   ├── eixos/                # EixoTabs, EixoIndicators, EixoMembers, EixoGoals, GoalManager
│   ├── projetos/             # ProjectList/Card/Form/Summary, TaskList/Form, ProjectComponents, AssignedTasks + actions
│   ├── requisicoes/          # RequestForm (por tipo), DirectorRequestForm, MyRequests, RequestPanel, PurchaseCompleteForm + actions
│   ├── inventario/           # InventoryBrowser, InventoryForm, ProposalList, ItemUsage + actions
│   └── avaliacao/            # CrossEvaluation, EvaluationForm, RatingScale, ReceivedScores, MemberEvaluations + actions
├── config/                   # options.ts (eixos, times, rótulos/tons de status, escala 1–5), requests.ts, navigation.ts
├── lib/                      # api/ (dados via Drizzle), access.ts (permissões), auth.ts, auth-client.ts, session.ts,
│                             #   dev-auth.ts, auth-actions.ts, action-helpers.ts, validation.ts, form.ts, cn(), formatadores
└── types/                    # Tipos de domínio compartilhados
```

**Regras de dependência** (de cima pra baixo, nunca ao contrário):

`app` → `features` → `components` → `lib` / `types` / `config` / `db`

- `components/ui` nunca importa de `features`.
- Uma feature não importa de outra feature; se precisar compartilhar, sobe para `components` ou `lib`.
- Cada feature expõe só o necessário via `index.ts` (`import { LoginForm } from "@/features/auth"`).
- Páginas são **Server Components** por padrão; `"use client"` só onde há estado/eventos (formulários, menus).
- Toda busca e escrita de dados passa por `lib/api/` (PostgreSQL via Drizzle ORM).

### Acesso por papel e eixo

- Vínculos: `membro` tem eixo e time; `coordenador` tem eixo e **não tem time**; `diretoria` **não tem eixo nem time**. `Member` é uma união por papel — trate `eixo`/`time` como possivelmente `null` e exiba com `describeMember()`.
- `diretoria` vê todos os eixos (leitura) e gerencia papéis de membros em `/diretoria/membros`; `coordenador` (um por eixo) e `membro` só o próprio. A Avaliação Cruzada inclui colegas de todos os eixos.
- Requisições: membros pedem à coordenação do eixo, escolhendo o tipo (componente do inventário, reunião, autorização de uso, verba, componente não disponível, outros); coordenadores pedem à diretoria (`/diretoria`) só com título, explicação e justificativa. A diretoria não faz requisições, mas age no Painel da Coordenação de qualquer eixo.
- Depois de aprovada, cada requisição segue o ciclo do seu tipo (`config/requests.ts`). Compra feita cria o item no inventário em uso e o liga ao projeto. Prazos de requisições aparecem em "Prazos e tarefas" e nas tarefas do projeto.
- Inventário: todos veem tudo; itens têm eixo proprietário (ou nenhum), armário e categoria. Diretoria edita tudo; coordenação, os do próprio eixo e os sem dono; o time Processos propõe alterações, aprovadas pela coordenação do eixo dono (sem dono: qualquer coordenação) ou pela diretoria.
- Coordenação do eixo: CRUD de projetos (tarefas, prazos, componentes, membros afiliados), resolve requisições e vê avaliações detalhadas. Membro: muda o status das próprias tarefas e faz requisições.
- Regras em `lib/access.ts` (puras e testadas); filtragem e checagem de escrita em `lib/api/` (o membro é parâmetro); páginas chamam `forbidden()` quando a API devolve `null`.
- Escritas: Server Actions em `features/<x>/actions.ts` → `lib/action-helpers.ts` → `lib/api/` → PostgreSQL via Drizzle ORM (`src/db/`).
- Sessão atual: `lib/session.ts` via **Better Auth** (`auth.api.getSession` + `React.cache`). Em desenvolvimento local, `DEV_QUICK_SWITCH=true` habilita troca rápida criando sessões reais no banco.

## 2. Design tokens

Definidos uma única vez em `src/app/globals.css` dentro de `@theme`. O Tailwind gera as classes automaticamente.

| Token | Uso | Exemplo de classe |
|---|---|---|
| `brand-50…950` | Azul-noite do logo. 900/950 = fundos escuros, botão primário | `bg-brand-900`, `text-brand-950` |
| `accent-50…700` | Ciano dos circuitos. Foco, progresso, destaques | `ring-accent-500`, `text-accent-600` |
| `iris-*` | Violeta para números/contadores | `text-iris-600` |
| `canvas` / `surface` / `surface-muted` | Fundo da página / cards / hover | `bg-canvas`, `bg-surface` |
| `line` | Bordas e divisores | `ring-line`, `divide-line` |
| `ink` / `ink-muted` / `ink-subtle` | Texto principal / secundário / terciário | `text-ink-muted` |
| `success` / `warning` / `danger` | Status | `bg-success-50 text-success-700` |

**Tipografia**
- `font-display` (Sora) — títulos, números, botões.
- `font-sans` (Poppins, padrão) — corpo de texto, mantendo a identidade do protótipo.

**Raios:** `rounded-field` (campos/botões, 14px) · `rounded-card` (cards, 20px) · `rounded-panel` (destaques, 28px)

**Sombras:** `shadow-card` (repouso) · `shadow-raised` (elevado/hover) · `shadow-glow` (ciano, ação em foco)

**Utilitários de projeto:** `bg-circuit` (textura de pontos) · `text-gradient-accent` · `animate-fade-up`

> Regra: **nunca use cor hexadecimal solta em componente**. Se precisar de uma cor nova, crie o token no `@theme`.

## 3. Componentes de UI

| Componente | Variantes / props principais |
|---|---|
| `Button` | `variant`: primary · accent · secondary · ghost · link — `size`: sm · md · lg — `block`, `loading` |
| `Input` | `label`, `icon` (lucide), `error`, `hint` — rótulo dentro do campo, como no protótipo |
| `Textarea` | igual ao Input, para texto longo (ícone no topo) |
| `PasswordInput` | igual ao Input + botão mostrar/ocultar acessível |
| `Select` | `options`, `placeholder`, `icon`, `error` |
| `Card`, `SectionTitle` | contêineres e títulos de seção |
| `Badge` | `tone`: success · warning · danger · brand · accent |
| `Progress` | `value`, `max`, `label`, `tone` (dark sobre painel escuro · light sobre card branco) — com `role="progressbar"` |
| `ScorePanel` | painel de destaque escuro: `title`, `score`, `goal`, `caption` — % e barra calculados |
| `StatCard` | `value` (número → "05"; string → como veio, ex. "4,3"), `label`, `icon`, `tone` |
| `Avatar` | `name`, `src` — iniciais como fallback; `decorative` quando o nome já aparece ao lado |
| `Alert` | mensagem inline (`tone` success · danger · warning · info) |
| `EmptyState` | estado vazio de listas |
| `CheckboxGroup` | lista de checkboxes reais (valores repetidos viram array) |
| `ConfirmButton` | ação destrutiva em dois cliques |
| `SectionTabs` | abas de seção por rota, com contador opcional |
| `DecisionForm` | aprovar/recusar com observação |
| `DeadlineRows` | prazos de requisições dentro de listas de tarefas |

Variantes são feitas com **class-variance-authority (cva)** e combinadas com `cn()` (clsx + tailwind-merge), então qualquer `className` passado sobrescreve sem conflito.

## 4. Convenções

- Arquivos em `kebab-case.tsx`; componentes em `PascalCase`.
- Textos de interface em português; código (nomes de variáveis) em inglês, exceto termos de domínio (`eixo`, `time`, `capacitacao`).
- Formulários: schema Zod em `features/<x>/schemas.ts` + hook `useFormSubmit` de `lib/form.ts` (`onSubmit={handleSubmit} onChange={handleChange} noValidate`). Mensagens de erro sempre em português.
- Eixos e times só existem em `config/options.ts` (slugs + rótulos). Exiba com `eixoLabel()` / `timeLabel()`.
- Destinos principais da navegação ficam em `getNavItems(role)` de `config/navigation.ts` (header no desktop, barra inferior no mobile).
- Acessibilidade: `label` ligado ao campo, `aria-invalid` + `aria-describedby` nos erros, foco visível em ciano, alvos de toque ≥ 40px.
- Mobile-first: escreva o estilo do celular primeiro e adicione `sm:` / `lg:` para telas maiores.

## 5. Como adicionar uma nova tela

1. Crie a rota em `src/app/(app)/<nome>/page.tsx` (já herda header e navegação) e, se for destino principal, adicione-a em `src/config/navigation.ts`.
2. Crie `src/features/<nome>/components/...` e exporte em `src/features/<nome>/index.ts`.
3. Adicione a função de dados em `src/lib/api.ts` e o tipo em `src/types`.
4. Monte a página só compondo componentes — sem estilos soltos complexos na page.
