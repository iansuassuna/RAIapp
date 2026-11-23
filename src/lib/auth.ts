import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { isEixo, isTime } from "@/config/options";
import { db } from "@/db";
import * as schema from "@/db/schema";
import type { Role } from "@/types";
import { devQuickSwitchPlugin } from "./dev-auth";
import { sendMailSafely } from "./mail";
import {
  changeEmailConfirmationEmail,
  newEmailVerificationEmail,
  resetPasswordEmail,
  verificationEmail,
} from "./mail-templates";
import { avatarUrl, personName } from "./validation";

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
      // Na troca de e-mail, o Better Auth chama este callback com `user.email` = endereço NOVO.
      const [stored] = await db
        .select({ email: schema.user.email })
        .from(schema.user)
        .where(eq(schema.user.id, user.id));
      const isEmailChange = stored !== undefined && stored.email !== user.email;
      await sendMailSafely(isEmailChange ? newEmailVerificationEmail(user, url) : verificationEmail(user, url));
    },
  },
  user: {
    // Troca de e-mail em duas etapas para contas verificadas: aprova pelo endereço atual, depois confirma o novo.
    // Contas sem e-mail verificado recebem direto o link no endereço novo. A troca só ocorre ao confirmar o novo.
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendMailSafely(changeEmailConfirmationEmail(user, newEmail, url));
      },
    },
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
      update: {
        before: async (data) => {
          // `eixo`/`time` precisam de `input: true` para o cadastro, mas isso também os liberaria em
          // `/api/auth/update-user`. Papel, eixo e time só mudam pela diretoria (`updateMemberRole`, direto no banco).
          // O Better Auth pode enviar chaves com `undefined` (campo não alterado): só valores definidos contam.
          for (const field of PROTECTED_USER_FIELDS) {
            if (data[field] !== undefined) invalidUpdate("Papel, eixo e time só podem ser alterados pela diretoria.");
          }

          const patch: Record<string, unknown> = { ...data };
          if (data.name !== undefined) {
            const parsed = personName.safeParse(data.name);
            if (!parsed.success) invalidUpdate(parsed.error.issues[0]?.message ?? "Nome inválido.");
            patch.name = parsed.data;
          }
          if (data.image !== null && data.image !== undefined) {
            const parsed = avatarUrl.safeParse(data.image);
            if (!parsed.success) invalidUpdate(parsed.error.issues[0]?.message ?? "Endereço de imagem inválido.");
            patch.image = parsed.data === "" ? null : parsed.data;
          }
          return { data: patch };
        },
      },
    },
  },
  plugins: [devQuickSwitchPlugin(), nextCookies()],
});

/** Campos que nenhum endpoint do Better Auth pode alterar (somente `updateMemberRole`/seed, direto no banco). */
const PROTECTED_USER_FIELDS = ["role", "eixo", "time", "score", "verificationRequired"] as const;

function invalidUpdate(message: string): never {
  throw new APIError("BAD_REQUEST", { message, code: "INVALID_USER_UPDATE" });
}

/** Erro 400 legível para o cliente (em vez de `FAILED_TO_CREATE_USER` genérico + stack trace no log). */
function invalidSignUp(message: string): never {
  throw new APIError("BAD_REQUEST", { message, code: "INVALID_SIGN_UP" });
}
