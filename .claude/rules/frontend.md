---
paths:
  - "src/**"
---

# Padrão de frontend do RAIapp

Referência completa (tabela de tokens, variantes): `docs/DESIGN_SYSTEM.md`. Esta regra é o resumo obrigatório; se mudar algo estrutural, atualize os dois.

## Stack

- Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript, rodando com **Bun** (`bun run dev` / `bun run build` / `bun install` — nunca npm). A versão do Next tem mudanças; em dúvida, consulte `node_modules/next/dist/docs/`.
- Bibliotecas permitidas: `class-variance-authority` (variantes), `clsx` + `tailwind-merge` (via `cn()`), `lucide-react` (ícones), `zod` (validação), `@fontsource/poppins` e `@fontsource-variable/sora` (fontes). Não adicione outras libs de UI/ícones/estado sem pedir.
- Ainda **sem autenticação nem banco**: os dados ficam num banco em memória (`lib/db.ts`, semeado por `lib/mock-data.ts`) que guarda as alterações enquanto o servidor roda e volta aos exemplos ao reiniciar. Só `lib/api` lê/escreve nele.
- O membro "logado" vem de `getCurrentMember()` em `lib/session.ts`, que hoje lê o cookie do **seletor de membro de teste** (`DevMemberSwitcher` no menu do header). Isso é TEMPORÁRIO: ao implementar login real, troque só `lib/session.ts` e remova o seletor e `lib/dev-session-actions.ts`.

## Arquitetura (`src/`)

```
app/(auth)/…        rotas públicas (login, cadastro) — layout com painel da marca no desktop
app/(app)/…         rotas internas — AppHeader + BottomNav + forbidden.tsx
  eixos/[eixo]/       layout (checa acesso + abas) → page (visão geral), projetos/, projetos/[projectId]/(editar), membros/, membros/[memberId], painel/ (Painel da Coordenação)
  inventario/         lista com filtros, novo, [id] (detalhe + uso), [id]/editar
  minha-area/         layout (abas; diretoria é redirecionada) → page (projetos afiliados + tarefas), requisicoes/
  diretoria/          fila de requisições dos coordenadores (só diretoria)
components/ui/      primitivos genéricos, sem regra de negócio (exportados em ui/index.ts)
components/brand/   Logo / LogoMark
components/layout/  AppHeader, BottomNav
features/<dominio>/ components/ + schemas.ts (zod) + actions.ts ("use server"); expõe componentes em index.ts
                    domínios: auth, dashboard, eixos, projetos, requisicoes, inventario, avaliacao
config/             options.ts (eixos, times, rótulos e tons, escala 1–5), requests.ts (tipos de requisição, ciclos de
                    andamento, salas, armários, categorias), navigation.ts
lib/                api/ (dados por domínio, index.ts reexporta), access.ts (permissões), session.ts (membro atual),
                    db.ts (banco em memória, versionado), mock-data.ts, validation.ts (zod compartilhado), form.ts (hook client),
                    deadlines.ts (requisições → linhas de prazo), cn.ts, format.ts
types/              tipos de domínio
```

- Dependências só de cima para baixo: `app` → `features` → `components` → `lib`/`config`/`types`.
- `components/ui` nunca importa de `features`. Uma feature nunca importa de outra; o que for compartilhado sobe para `components/ui` (visual) ou `lib`/`config` (lógica/dados).
- Importe features pelo índice: `import { CrossEvaluation } from "@/features/avaliacao"`.
- Páginas (`page.tsx`) são Server Components `async` que só buscam dados em `lib/api.ts` e compõem componentes; exportam `metadata` com `title`. Sem estilos complexos na página.
- `"use client"` só em componentes com estado/eventos (formulários, menus, fluxos). `searchParams` é `Promise` e deve ser aguardada; valide o valor (ex.: `isEixo()`) antes de usar.
- Estado que precisa ser compartilhável/URL (ex.: aba de eixo) vai em query string com `Link`, mantendo a página no servidor.

## Domínio

- Estrutura do grupo em `config/options.ts`: eixos `inovacao` (Inovação), `tecnico-sustentavel` (Técnico Sustentável), `tecnologias-saude` (Tecnologias em Saúde); times `processos` (Processos), `midias` (Mídias). Nunca escreva listas de eixos/times fora dali; exiba sempre via `eixoLabel()` / `timeLabel()`.
- Valores internos são slugs em kebab-case sem acento; rótulos ficam em mapas `*_LABEL`, e a cor de badge em mapas `*_TONE` em `config/options.ts`.
- Nova fonte de dados: tipo em `types/index.ts` → mock em `lib/mock-data.ts` → função `getX()` assíncrona em `lib/api.ts`.

## Acesso por papel e eixo

- Papéis (`Role`) e vínculos — `Member` é uma união por papel, o TypeScript garante as combinações:
  - `membro`: tem `eixo` e `time`;
  - `coordenador` (um por eixo): tem `eixo`, **não tem time** (`time: null`);
  - `diretoria`: **sem eixo e sem time** (`eixo: null`, `time: null`); vê todos os eixos (somente leitura).
  Sempre trate `eixo`/`time` como possivelmente `null`; para exibir o vínculo use `describeMember()` ("Mídias · Inovação", "Coordenação · Inovação", "Diretoria") ou `memberRoleOrTime()`.
- Avaliação Cruzada **não** é restrita por eixo (colegas de todos os eixos, inclusive coordenação e diretoria, menos o próprio membro).
- Coordenação do próprio eixo (`canManageEixo`): CRUD de projetos, tarefas e componentes alocados; aba Requisições (aprovar/recusar as dos membros); avaliações cruzadas detalhadas de cada membro do eixo. Membro: vê projetos do eixo, muda o status só das próprias tarefas, faz requisições e só vincula projetos aos quais é afiliado.
- Requisições têm `reviewer`: membro → `"coordenacao"` (Painel da Coordenação do eixo); coordenador → `"diretoria"` (`/diretoria`; só título, explicação e justificativa — `kind: "pedido"`). A diretoria não faz requisições, mas **age no Painel da Coordenação de qualquer eixo** (`canUseCoordinationPanel`). Use `requestReviewerFor()` e `canResolveRequest()` — nunca decida o destino na tela.
- Tipos de requisição de membro (`ResourceRequest` é uma união por `kind`): `componente` (do inventário), `reuniao` (data, horário, sala), `autorizacao` (início, expiração), `verba` (valor, uso, prazo de confecção), `compra` (componente não disponível: nome, quantidade, prazo, valor estimado), `outros` (explicação, data opcional). Todos têm justificativa e projeto opcional.
- Depois de aprovada, a requisição ganha `progress`, com ciclo por tipo em `config/requests.ts` (`INITIAL_PROGRESS`, `NEXT_PROGRESS`, `FINAL_PROGRESS`). Reunião passada vira "realizada" e autorização vencida vira "expirada" por `effectiveProgress()` — não grave isso, calcule. Compra → "feito" só por `completePurchase` (pede categoria, armário, dono, quantidade, valor pago; cria o item no inventário em uso e liga ao projeto ou empresta a quem pediu).
- Compras/verbas/reuniões/outros em andamento com prazo entram em "Prazos e tarefas" (de quem pediu; compras também da coordenação do eixo) e, se vinculadas, nas tarefas do projeto — via `getRequestDeadlines`/`getProjectPurchases` + `requestsToDeadlineRows` + `DeadlineRows`.
- Inventário: item tem `ownerEixo` (null = sem propriedade), `cabinet` e `category` (listas fixas em `config/requests.ts`). Todos veem tudo. Em uso = alocado em projetos + empréstimos (`loans`); nunca calcule disponibilidade fora de `lib/api/inventory.ts`. Diretoria edita qualquer item; coordenação edita os do próprio eixo e os sem propriedade (`canEditInventoryItem`); time Processos **propõe** (`InventoryProposal`), e a proposta é aprovada pela coordenação do eixo dono — sem dono, qualquer coordenação — ou pela diretoria (`canApproveInventoryProposal`). Propostas aparecem no Painel da Coordenação.
- Toda regra de permissão mora em `lib/access.ts` (funções puras, testadas em `access.test.ts`). Não espalhe `role === …` pelas telas; crie/ajuste uma função ali.
- O filtro acontece **no servidor, na camada de dados**: funções de `lib/api` que dependem de permissão recebem o membro; leituras devolvem `null`/lista filtrada e escritas devolvem `ActionResult` com erro. Nunca confie em parâmetro de URL nem esconda dados só na interface. Esconder um botão é só UX — a checagem real está em `lib/api`.
- Página que recebe um recurso sem permissão chama `forbidden()` (de `next/navigation`, habilitado por `experimental.authInterrupts`), que renderiza `app/(app)/forbidden.tsx`. Recurso inexistente → `notFound()`. Sempre `await` a função que pode chamar `forbidden()` e não a envolva em `try/catch`.
- Recursos por eixo usam segmento dinâmico (`/eixos/[eixo]`); a rota índice (`/eixos`) redireciona para o eixo do membro. Abas só aparecem quando `getAccessibleEixos()` devolve mais de um eixo.
- Navegação por papel: `getNavItems(role)` em `config/navigation.ts` (ex.: "Meu eixo" para membro/coordenação, "Eixos" para diretoria).
- Testes de permissão com `bun test` (`lib/*.test.ts`) a cada mudança de regra.

## Idioma e nomes

- Texto de interface, mensagens de erro, `aria-label` e comentários em português.
- Código (variáveis, props, componentes) em inglês, exceto termos de domínio (`eixo`, `time`, `capacitacao`). Rotas em português (`/eixos`, `/avaliacao`).
- Arquivos `kebab-case.tsx`; componentes `PascalCase` com export nomeado (sem `export default`, exceto páginas/layouts).

## Design tokens (`src/app/globals.css` → `@theme`)

Nunca use hex solto em componente; se faltar cor, crie token.

- Cores: `brand-50…950` (azul-noite; 900/950 = header, botão primário, painéis), `accent-*` (ciano; foco, progresso, destaques), `iris-*` (violeta; números/contadores), `canvas` (fundo da página), `surface` / `surface-muted` (cards / hover e trilhos), `line` (bordas), `ink` / `ink-muted` / `ink-subtle` (texto), `success` / `warning` / `danger` (`-50` fundo, `-500`/`-700` texto).
- Fontes: `font-display` (Sora) para títulos, números e botões; `font-sans` (Poppins) para o corpo.
- Raios: `rounded-field` (campos/botões), `rounded-card` (cards), `rounded-panel` (painéis de destaque), `rounded-full` (badges, avatar, barras).
- Sombras: `shadow-card` (repouso), `shadow-raised` (elevado/hover), `shadow-glow` (ação/seleção em destaque).
- Utilitários: `bg-circuit` (textura em fundos escuros), `text-gradient-accent`, `animate-fade-up` (entrada de títulos, menus, mensagens).

## Componentes de UI (use antes de criar algo novo)

| Componente | Uso |
|---|---|
| `Button` | `variant` primary · accent · secondary · ghost · link; `size` sm · md · lg; `block`, `loading` |
| `Input`, `PasswordInput`, `Select`, `Textarea` | campos com rótulo interno + ícone lucide obrigatório; `error`/`hint` acessíveis (base em `FieldShell`) |
| `Card`, `SectionTitle` | contêiner branco (`p-2` para listas) e título de seção |
| `Badge` | `tone` success · warning · danger · brand · accent (tons vêm de `*_TONE`) |
| `Progress` | `tone="dark"` sobre fundo escuro, `tone="light"` sobre card branco; sempre `label` |
| `ScorePanel` | painel escuro de destaque com pontuação/meta, % e barra (desempenho, eixo, ciclo de avaliações) |
| `StatCard` | métrica com ícone; número inteiro vira `05`, string é exibida como veio (`4,3`) |
| `Avatar` | iniciais como fallback; `decorative` quando o nome já está em texto ao lado |
| `Alert` | mensagem inline `tone` success · danger · warning · info (role correto) |
| `EmptyState` | estado vazio de listas (ícone + título + texto) |
| `CheckboxGroup` | lista de checkboxes reais (ex.: membros afiliados) |
| `ConfirmButton` | ação destrutiva em dois passos |
| `SectionTabs` | abas de seção por rota (client; ativa pela URL; `exact` na "Visão geral"; `count` opcional) |
| `PageHeader` (`components/layout`) | cabeçalho padrão das telas internas (eyebrow, título, ações) |
| `DecisionForm` | aprovar/recusar com observação (obrigatória ao recusar); valores configuráveis |
| `DeadlineRows` | linhas de prazo vindas de outras áreas (`DeadlineRow`) dentro de listas de tarefas |

Variantes com `cva`; sempre aceite `className` e combine com `cn()`.

## Layout e padrões de tela

- Mobile-first: estilo do celular primeiro, depois `sm:` / `lg:`.
- Telas internas: `<div className="space-y-8 pt-7">` com cabeçalho (`text-sm text-ink-muted` + `h1 font-display text-2xl font-bold tracking-tight text-brand-950 sm:text-3xl`, com `animate-fade-up`) e, no desktop, grade `lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start`.
- Seções: `<section aria-labelledby>` + `SectionTitle` com `id` + conteúdo, `space-y-3`.
- Listas: `Card className="p-2"` → `ul divide-y divide-line/70` → item `flex items-center gap-3 px-3 py-3` (ícone em quadrado `size-10 rounded-xl bg-brand-50` ou `Avatar`, título `text-sm font-semibold text-brand-950`, subtítulo `text-xs text-ink-subtle`, `Badge` à direita). Prever estado vazio com texto centralizado.
- Grade de métricas: `grid grid-cols-2 gap-3` de `StatCard`.
- Grades de cards que podem aparecer em página cheia ou meia coluna usam container queries (`@container` + `@xl:grid-cols-2`), não breakpoints da tela.
- Áreas com subpáginas (eixo, minha área) usam um `layout.tsx` com `PageHeader` + `SectionTabs`; as páginas filhas só renderizam o conteúdo da aba.
- Abas: `Link` com query string, contêiner `rounded-card bg-surface p-1.5 shadow-card`, ativa `bg-brand-900 text-white shadow-raised` com `aria-current="page"`.
- Navegação: novos destinos principais entram em `getNavItems()` de `config/navigation.ts` (aparecem no header desktop e na BottomNav mobile).

## Mutações (Server Actions)

- Cada feature com escrita tem `actions.ts` com `"use server"`. Toda action: valida a entrada com o schema Zod da feature (`invalidResult()` em erro), pega o membro com `getCurrentMember()`, chama a função de `lib/api` (que checa permissão), e em sucesso faz `revalidatePath("/", "layout")`. Retorna sempre `ActionResult`.
- Passe actions para componentes client já vinculadas (`action.bind(null, id)`), nunca funções comuns — props de Server → Client precisam ser serializáveis (string, número, objeto simples ou Server Action).
- Schemas e helpers usados no servidor ficam em arquivos sem `"use client"` (`lib/validation.ts`); o hook `useFormSubmit` (client) fica em `lib/form.ts`.
- Exclusões usam `ConfirmButton` (dois cliques, sem `confirm()`).

## Formulários e fluxos

- Schema Zod em `features/<x>/schemas.ts` (mensagens em português) + `useFormSubmit(schema, onValid)` de `@/lib/form`. `onValid` pode devolver o `ActionResult` da action: os erros de campo e `formError` (mostre com `<Alert tone="danger">`) aparecem sozinhos.
- `<form onSubmit={handleSubmit} onChange={handleChange} noValidate>`; cada campo recebe `error={errors.campo}`; o botão de envio usa `loading`.
- Checkboxes repetidos (`name` igual) viram array via `formDataToObject`; no schema use `stringArray`. Datas: `isoDate()`; textos opcionais: `optionalText()`; ids opcionais de `<select>`: `optionalId`.
- Escolhas visuais (ex.: escala 1–5) usam `<input type="radio">` reais com `sr-only` dentro de `<label>` estilizado com `has-checked:`, dentro de `fieldset` + `legend`.
- Fluxos de várias etapas ficam num único componente client que troca a etapa por estado, volta ao topo ao trocar e confirma com mensagem inline `role="status"` (nunca `alert`).
- Integrações ainda inexistentes ficam marcadas com `// TODO: integrar com a API de …`.

## Formatação

- `lib/format.ts`: `padCount` (contadores `05`), `formatShortDate` (`27/10/26`, datas ISO nos dados), `formatAverage` (médias `4,3`), `firstName`, `initials`.

## Acessibilidade

- Todo ícone decorativo com `aria-hidden`; botão só com ícone com `aria-label`.
- Erros com `aria-invalid` + `aria-describedby` + `role="alert"`; foco visível em ciano; alvos de toque ≥ 40px (`h-11`).
- Toggles com `aria-expanded`/`aria-pressed`; item de navegação ativo com `aria-current="page"`.

## Verificação

Após mudar telas: `bun test`, `bun run build` (inclui checagem de tipos) e conferir no navegador no desktop e em largura de celular (~390px). Para telas com permissão, conferir com membros de papéis/eixos diferentes pelo seletor de teste.
