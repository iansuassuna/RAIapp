# RAITec App (RAIapp)

Front-end em **Next.js 16 (App Router) + Tailwind CSS v4 + TypeScript**, rodando com **Bun**.

## Rodando

```bash
bun install
bun run dev        # http://localhost:3000 → redireciona para /login
```

Outros scripts: `bun run build` (inclui checagem de tipos), `bun run start`, `bun run typecheck`.

## Telas

| Rota | Descrição |
|---|---|
| `/login` | Login com validação e mostrar/ocultar senha |
| `/cadastro` | Cadastro com nome, e-mail, senha + confirmação, eixo e time |
| `/dashboard` | Desempenho, trajetória, atividades recentes |
| `/eixos/[eixo]` | Gestão de Eixos — abas **Visão geral**, **Projetos**, **Membros** e, para a coordenação, **Requisições**. Membro e coordenação veem só o próprio eixo; diretoria vê os 3 |
| `/eixos/[eixo]/projetos/[id]` | Página do projeto: tarefas, prazos, componentes do RAITec e membros afiliados (coordenação edita) |
| `/eixos/[eixo]/membros/[id]` | Avaliações cruzadas detalhadas do membro (só coordenação do eixo) |
| `/minha-area` | Projetos afiliados, prazos e tarefas atribuídos, requisições de componentes e recursos (membros → coordenação do eixo; coordenadores → diretoria) |
| `/diretoria` | Área da diretoria: analisar e resolver as requisições feitas pelos coordenadores |
| `/avaliacao` | Avaliação Cruzada: lista de colegas, formulário com escala 1–5 por critério e médias recebidas |

No celular as telas de login/cadastro mostram o logo no topo; no desktop aparece um painel da marca à esquerda.
As telas internas têm navegação inferior no mobile e navegação no header no desktop.

## Membro de teste

Ainda não há login. Para simular quem está logado, abra o menu do seu nome no header e escolha um **membro de teste** (diretoria, coordenação ou membro de cada eixo). Isso é temporário e será trocado pela autenticação real.

Testes: `bun test`.

## Dados

Ainda não há banco: tudo fica em memória (`src/lib/db.ts`), começando pelos exemplos de `src/lib/mock-data.ts`. Projetos criados, tarefas, requisições e avaliações valem enquanto o servidor estiver rodando — reiniciar volta aos dados de exemplo.

## Padrão de projeto

Veja [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — arquitetura de pastas, tokens de design, componentes e convenções.

## Próximos passos

- Ligar `src/lib/api.ts` ao backend (hoje usa dados de `mock-data.ts`).
- Autenticação real (substituir `src/lib/session.ts` e remover o seletor de membro de teste) + proteção das rotas de `(app)`.
- Trocar o banco em memória por um banco real (as funções de `src/lib/api` mantêm a assinatura).
