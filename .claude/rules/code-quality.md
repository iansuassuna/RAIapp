---
paths:
  - "**/*"
---

# Regras de Qualidade de Código e Verificação

## Lint e Formatação (Biome)
- **Biome** (`biome.json`) é o único linter e formatador do projeto (não instale ESLint nem Prettier).
- Estilo padrão: 2 espaços, largura máxima de 120 colunas, aspas duplas, imports organizados automaticamente.
- Nunca silencie regras com `biome-ignore` sem justificativa técnica explícita em comentário.

## Tipagem e Testes
- TypeScript em modo `strict: true` checado via `bun run typecheck` (`bun check`). Evite `any` e casts inseguros (`as never` só em testes quando estritamente necessário).
- Toda alteração em `src/lib/access.ts` exige testes correspondentes em `src/lib/access.test.ts`.
- Toda alteração em `src/lib/api/` exige cobertura em `src/lib/api/api.test.ts` rodando contra o PostgreSQL de teste (`DATABASE_URL_TEST`).
- Mantenha textos de UI, mensagens de erro e comentários em português; identificadores de código em inglês (exceto termos de domínio `eixo`, `time`, `capacitacao`).

## Checklist Antes de Concluir
1. `bun run lint` (Biome: 0 erros)
2. `bun run typecheck` (TypeScript: 0 erros)
3. `bun test` (todos os testes passando)
4. `bun run build` (build Next.js 16 sem erros)
