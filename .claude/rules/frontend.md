---
paths:
  - "src/**"
---

# Padrão de frontend do RAIapp

Referência completa (tabela de tokens, variantes): `docs/DESIGN_SYSTEM.md`. Esta regra é o resumo obrigatório; se mudar algo estrutural, atualize os dois.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript, rodando com **Bun** (`bun run dev` / `bun run build` / `bun install` — nunca npm). A versão do Next tem mudanças; em dúvida, consulte `node_modules/next/dist/docs/`.
- Bibliotecas permitidas: `class-variance-authority` (variantes), `clsx` + `tailwind-merge` (via `cn()`), `lucide-react` (ícones), `zod` (validação), `@fontsource/poppins` e `@fontsource-variable/sora` (fontes), `better-auth` (autenticação), `drizzle-orm` + `postgres` (persistência no servidor). Não adicione outras libs de UI/ícones/estado sem pedir.
- **Persistência real**: os dados ficam em PostgreSQL via Drizzle ORM (`src/db/`). Só `src/lib/api/` lê/escreve nas tabelas de domínio.
- **Autenticação real**: o membro logado vem de `getCurrentMember()` / `getSessionMember()` em `src/lib/session.ts` (Better Auth + `React.cache`). Em desenvolvimento local, quando `DEV_QUICK_SWITCH=true` e `NODE_ENV !== "production"`, um seletor rápido cria sessão real do Better Auth para agilizar testes entre papéis.

## Arquitetura (`src/`)

```
app/(auth)/…        rotas públicas (login, cadastro, esqueci-senha, redefinir-senha, verificar-email) — painel da marca no desktop
app/(app)/…         rotas internas autenticadas — AppHeader + BottomNav + forbidden.tsx
  dashboard/          desempenho, trajetória, atividades recentes
  eixos/[eixo]/       layout (checa acesso + abas) → page (visão geral), projetos/, projetos/[projectId]/(editar), membros/, membros/[memberId], painel/ (Painel da Coordenação)
  inventario/         lista com filtros, novo, [id] (detalhe + uso), [id]/editar
  minha-area/         layout (abas; diretoria é redirecionada) → page (projetos afiliados + tarefas), requisicoes/
  diretoria/          layout (abas; só diretoria) → page (pedidos dos coordenadores), membros/ (gestão de papéis)
  avaliacao/          avaliação cruzada entre colegas
  perfil/             Meu perfil (nome, avatar por URL, senha, e-mail, sessões ativas)
app/api/auth/[...all]/ route handler do Better Auth
proxy.ts            Next.js 16 Proxy (redirecionamento otimista por cookie de sessão)
components/ui/      primitivos genéricos, sem regra de negócio (exportados em ui/index.ts)
components/brand/   Logo / LogoMark
components/layout/  AppHeader, BottomNav, PageHeader, DevMemberSwitcher (condicional a DEV_QUICK_SWITCH)
features/<dominio>/ components/ + schemas.ts (zod) + actions.ts ("use server"); expõe componentes em index.ts
                    domínios: auth, dashboard, diretoria, eixos, perfil, projetos, requisicoes, inventario, avaliacao
config/             options.ts (eixos, times, rótulos e tons, escala 1–5), requests.ts (tipos de requisição, ciclos de
                    andamento, salas, armários, categorias), navigation.ts
db/                 index.ts (Drizzle + postgres.js), schema/ (enums, auth, domain), seed.ts, seed-data.ts
lib/                api/ (dados por domínio, index.ts reexporta), access.ts (permissões), auth.ts, auth-client.ts,
                    session.ts (sessão Better Auth), dev-auth.ts, action-helpers.ts, validation.ts (zod compartilhado), mail.ts,
                    mail-templates.ts, auth-errors.ts,
                    form.ts (hook client), deadlines.ts (requisições → linhas de prazo), cn.ts, format.ts
types/              tipos de domínio
```

- Dependências só de cima para baixo: `app` → `features` → `components` → `lib`/`config`/`types`/`db`.
- `components/ui` nunca importa de `features`. Uma feature nunca importa de outra; o que for compartilhado sobe para `components/ui` (visual) ou `lib`/`config` (lógica/dados).
- Importe features pelo índice: `import { CrossEvaluation } from "@/features/avaliacao"`.
- Páginas (`page.tsx`) são Server Components `async` que só buscam dados em `lib/api` e compõem componentes; exportam `metadata` com `title`. Sem estilos complexos na página.
- `"use client"` só em componentes com estado/eventos (formulários, menus, fluxos). `params` e `searchParams` são `Promise` e devem ser aguardados; valide o valor (ex.: `isEixo()`) antes de usar.
- Estado que precisa ser compartilhável/URL (ex.: aba de eixo) vai em query string ou segmento de rota com `Link`, mantendo a página no servidor.

## Domínio

- Estrutura do grupo em `config/options.ts`: eixos `inovacao` (Inovação), `tecnico-sustentavel` (Técnico Sustentável), `tecnologias-saude` (Tecnologias em Saúde); times `processos` (Processos), `midias` (Mídias). Nunca escreva listas de eixos/times fora dali; exiba sempre via `eixoLabel()` / `timeLabel()`.
- Valores internos são slugs em kebab-case sem acento; rótulos ficam em mapas `*_LABEL`, e a cor de badge em mapas `*_TONE` em `config/options.ts`.

## Acesso por papel e eixo

- Papéis (`Role`) e vínculos — `Member` é uma união por papel, o TypeScript e as constraints do Postgres garantem as combinações:
  - `membro`: tem `eixo` e `time`;
  - `coordenador` (um por eixo): tem `eixo`, **não tem time** (`time: null`);
  - `diretoria`: **sem eixo e sem time** (`eixo: null`, `time: null`); vê todos os eixos (somente leitura) e gerencia papéis em `/diretoria/membros`.
  Sempre trate `eixo`/`time` como possivelmente `null`; para exibir o vínculo use `describeMember()` ("Mídias · Inovação", "Coordenação · Inovação", "Diretoria") ou `memberRoleOrTime()`.
- Avaliação Cruzada **não** é restrita por eixo (colegas de todos os eixos, inclusive coordenação e diretoria, menos o próprio membro).
- Coordenação do próprio eixo (`canManageEixo`): CRUD de projetos, tarefas e componentes alocados; Painel da Coordenação (aprovar/recusar requisições dos membros); avaliações cruzadas detalhadas de cada membro do eixo. Membro: vê projetos do eixo, muda o status só das próprias tarefas, faz requisições e só vincula projetos aos quais é afiliado.
- Requisições têm `reviewer`: membro → `"coordenacao"` (Painel da Coordenação do eixo); coordenador → `"diretoria"` (`/diretoria`; `kind: "pedido"`). A diretoria não faz requisições, mas **age no Painel da Coordenação de qualquer eixo** (`canUseCoordinationPanel`). Use `requestReviewerFor()` e `canResolveRequest()` — nunca decida o destino na tela.
- Tipos de requisição de membro (`ResourceRequest` é uma união por `kind`): `componente`, `reuniao`, `autorizacao`, `verba`, `compra`, `outros`. Ciclo de andamento em `config/requests.ts`; `effectiveProgress()` calcula transições automáticas por data (`realizada`, `expirada`).
- Inventário: todos veem tudo. Disponibilidade sempre calculada em `lib/api/inventory.ts`. Diretoria edita qualquer item; coordenação edita os do próprio eixo e sem propriedade; time Processos propõe (`InventoryProposal`).
- Toda regra de permissão mora em `lib/access.ts` (funções puras, testadas em `access.test.ts`). Não espalhe `role === …` pelas telas; crie/ajuste uma função ali.
- O filtro acontece **no servidor, na camada de dados**: funções de `lib/api` que dependem de permissão recebem o membro; leituras devolvem `null`/lista filtrada e escritas devolvem `ActionResult` com erro.
- Página que recebe um recurso sem permissão chama `forbidden()` (de `next/navigation`, habilitado por `experimental.authInterrupts`), que renderiza `app/(app)/forbidden.tsx`. Recurso inexistente → `notFound()`. Sempre `await` a função que pode chamar `forbidden()` e não a envolva em `try/catch`.
- Testes de permissão com `bun test` a cada mudança de regra.

## Idioma e nomes

- Texto de interface, mensagens de erro, `aria-label` e comentários em português.
- Código (variáveis, props, componentes) em inglês, exceto termos de domínio (`eixo`, `time`, `capacitacao`). Rotas em português (`/eixos`, `/avaliacao`, `/diretoria`).
- Arquivos `kebab-case.tsx`; componentes `PascalCase` com export nomeado (sem `export default`, exceto páginas/layouts).

## Design tokens (`src/app/globals.css` → `@theme`)

Nunca use hex solto em componente; se faltar cor, crie token.

- Cores: `brand-50…950`, `accent-*`, `iris-*`, `canvas`, `surface` / `surface-muted`, `line`, `ink` / `ink-muted` / `ink-subtle`, `success` / `warning` / `danger`.
- Fontes: `font-display` (Sora) para títulos, números e botões; `font-sans` (Poppins) para o corpo.
- Raios: `rounded-field`, `rounded-card`, `rounded-panel`, `rounded-full`.
- Sombras: `shadow-card`, `shadow-raised`, `shadow-glow`.
- Utilitários: `bg-circuit`, `text-gradient-accent`, `animate-fade-up`.

## Componentes de UI (use antes de criar algo novo)

| Componente | Uso |
|---|---|
| `Button` | `variant` primary · accent · secondary · ghost · link; `size` sm · md · lg; `block`, `loading` |
| `Input`, `PasswordInput`, `Select`, `Textarea` | campos com rótulo interno + ícone lucide obrigatório; `error`/`hint` acessíveis (`FieldShell`) |
| `Card`, `SectionTitle` | contêiner branco (`p-2` para listas) e título de seção |
| `Badge` | `tone` success · warning · danger · brand · accent (tons vêm de `*_TONE`) |
| `Progress` | `tone="dark"` sobre fundo escuro, `tone="light"` sobre card branco; sempre `label` |
| `ScorePanel` | painel escuro de destaque com pontuação/meta, % e barra |
| `StatCard` | métrica com ícone; número inteiro vira `05`, string é exibida como veio (`4,3`) |
| `Avatar` | iniciais como fallback; `decorative` quando o nome já está em texto ao lado |
| `Alert` | mensagem inline `tone` success · danger · warning · info (role correto) |
| `EmptyState` | estado vazio de listas (ícone + título + texto) |
| `CheckboxGroup` | lista de checkboxes reais |
| `ConfirmButton` | ação destrutiva em dois passos |
| `SectionTabs` | abas de seção por rota (client; ativa pela URL; `exact` na principal; `count` opcional) |
| `PageHeader` (`components/layout`) | cabeçalho padrão das telas internas (eyebrow, título, ações) |
| `DecisionForm` | aprovar/recusar com observação (obrigatória ao recusar) |
| `DeadlineRows` | linhas de prazo vindas de outras áreas (`DeadlineRow`) dentro de listas de tarefas |

Variantes com `cva`; sempre aceite `className` e combine com `cn()`.

## Layout, Mutações, Formulários e Acessibilidade

- Mobile-first (`sm:` / `lg:`); telas internas `<div className="space-y-8 pt-7">`; grids responsivos em containers usam `@container` + `@xl:grid-cols-2`.
- Cada feature com escrita tem `actions.ts` com `"use server"`, usando `src/lib/action-helpers.ts` (autenticação via `getSessionMember()`, validação Zod, chamada a `lib/api`, `revalidatePath("/", "layout")`).
- Formulários usam `useFormSubmit(schema, onValid)` de `@/lib/form`, exibem `formError` com `<Alert tone="danger">`, e `<form onSubmit={handleSubmit} onChange={handleChange} noValidate>`.
- Exclusões usam `ConfirmButton` (dois cliques, sem `confirm()`).
- Ícones decorativos com `aria-hidden`; botões só com ícone com `aria-label`; alvos de toque ≥ 40px (`h-11`).
- Após mudar telas: `bun run lint`, `bun run typecheck`, `bun test`, `bun run build` e conferência desktop + mobile (~390px).
