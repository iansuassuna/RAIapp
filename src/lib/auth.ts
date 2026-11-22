import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
          const role = (newUser.role as Role | undefined) ?? "membro";
          if (role === "membro") {
            if (!isEixo(newUser.eixo) || !isTime(newUser.time)) {
              throw new Error("Membros precisam selecionar eixo e time válidos.");
            }
            return { data: { ...newUser, role: "membro", eixo: newUser.eixo, time: newUser.time } };
          }
          if (role === "coordenador") {
            if (!isEixo(newUser.eixo)) {
              throw new Error("Coordenadores precisam informar um eixo válido.");
            }
            return { data: { ...newUser, role: "coordenador", eixo: newUser.eixo, time: null } };
          }
          return { data: { ...newUser, role: "diretoria", eixo: null, time: null } };
        },
      },
    },
  },
  plugins: [devQuickSwitchPlugin(), nextCookies()],
});
