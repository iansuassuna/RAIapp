import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { isEixo, isTime } from "@/config/options";
import { db } from "@/db";
import * as schema from "@/db/schema";
import type { Role } from "@/types";
import { devQuickSwitchPlugin } from "./dev-auth";
import { sendMailSafely } from "./mail";
import { resetPasswordEmail, verificationEmail } from "./mail-templates";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "raiapp-dev-secret-fallback-min-32-chars!!",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Global desligado de propósito: contas antigas não verificaram e-mail. A exigência vale só para contas
    // com `verificationRequired = true` (cadastros novos) e é aplicada em `src/lib/session.ts`.
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMailSafely(resetPasswordEmail(user, url));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMailSafely(verificationEmail(user, url));
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "membro",
        input: false,
      },
      eixo: {
        type: "string",
        required: false,
        input: true,
      },
      time: {
        type: "string",
        required: false,
        input: true,
      },
      score: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      verificationRequired: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          // Mesmas regras do formulário `/cadastro`, aplicadas também a chamadas diretas a `/api/auth/sign-up/email`.
          // Toda conta criada por aqui (cadastro novo) precisa verificar o e-mail antes de usar o app.
          const name = typeof newUser.name === "string" ? newUser.name.trim() : "";
          if (name.length < 3) invalidSignUp("Informe seu nome completo (mínimo de 3 caracteres).");

          const role = (newUser.role as Role | undefined) ?? "membro";
          if (role === "membro") {
            if (!isEixo(newUser.eixo) || !isTime(newUser.time)) {
              invalidSignUp("Membros precisam selecionar eixo e time válidos.");
            }
            return {
              data: {
                ...newUser,
                name,
                verificationRequired: true,
                role: "membro",
                eixo: newUser.eixo,
                time: newUser.time,
              },
            };
          }
          if (role === "coordenador") {
            if (!isEixo(newUser.eixo)) invalidSignUp("Coordenadores precisam informar um eixo válido.");
            return {
              data: {
                ...newUser,
                name,
                verificationRequired: true,
                role: "coordenador",
                eixo: newUser.eixo,
                time: null,
              },
            };
          }
          return { data: { ...newUser, name, verificationRequired: true, role: "diretoria", eixo: null, time: null } };
        },
      },
    },
  },
  plugins: [devQuickSwitchPlugin(), nextCookies()],
});

/** Erro 400 legível para o cliente (em vez de `FAILED_TO_CREATE_USER` genérico + stack trace no log). */
function invalidSignUp(message: string): never {
  throw new APIError("BAD_REQUEST", { message, code: "INVALID_SIGN_UP" });
}
