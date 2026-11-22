import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";

/**
 * Habilita troca rápida de usuário SOMENTE em desenvolvimento quando `DEV_QUICK_SWITCH=true`.
 * Nunca pode ser ativado em `NODE_ENV=production`.
 */
export function isDevQuickSwitchEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_QUICK_SWITCH === "true";
}

/**
 * Plugin do Better Auth para troca rápida em dev.
 * Cria uma sessão REAL no PostgreSQL e grava o cookie oficial assinado do Better Auth
 * (via `setSessionCookie` + `nextCookies`), mantendo todo o fluxo de autenticação real intacto.
 */
export function devQuickSwitchPlugin(): BetterAuthPlugin {
  return {
    id: "dev-quick-switch",
    endpoints: {
      devQuickSwitch: createAuthEndpoint(
        "/dev/quick-switch",
        {
          method: "POST",
          body: z.object({ userId: z.string().min(1) }),
        },
        async (ctx) => {
          if (!isDevQuickSwitchEnabled()) {
            throw new APIError("FORBIDDEN", { message: "Troca rápida de usuário está desabilitada." });
          }

          const found = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
          if (!found) {
            throw new APIError("NOT_FOUND", { message: "Usuário não encontrado." });
          }

          const newSession = await ctx.context.internalAdapter.createSession(found.id);
          await setSessionCookie(ctx, { session: newSession, user: found });
          return ctx.json({ ok: true, userId: found.id });
        },
      ),
    },
  };
}
