import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { isEixo, isTime } from "@/config/options";
import { db } from "@/db";
import * as schema from "@/db/schema";
import type { Role } from "@/types";
import { devQuickSwitchPlugin } from "./dev-auth";

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
    requireEmailVerification: false,
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
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          // Mesmas regras do formulário `/cadastro`, aplicadas também a chamadas diretas a `/api/auth/sign-up/email`.
          const name = typeof newUser.name === "string" ? newUser.name.trim() : "";
          if (name.length < 3) invalidSignUp("Informe seu nome completo (mínimo de 3 caracteres).");

          const role = (newUser.role as Role | undefined) ?? "membro";
          if (role === "membro") {
            if (!isEixo(newUser.eixo) || !isTime(newUser.time)) {
              invalidSignUp("Membros precisam selecionar eixo e time válidos.");
            }
            return { data: { ...newUser, name, role: "membro", eixo: newUser.eixo, time: newUser.time } };
          }
          if (role === "coordenador") {
            if (!isEixo(newUser.eixo)) invalidSignUp("Coordenadores precisam informar um eixo válido.");
            return { data: { ...newUser, name, role: "coordenador", eixo: newUser.eixo, time: null } };
          }
          return { data: { ...newUser, name, role: "diretoria", eixo: null, time: null } };
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
