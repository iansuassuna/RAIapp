import { z } from "zod";
import { EIXOS, TIMES } from "@/config/options";

const eixoValues = EIXOS.map((e) => e.value) as [string, ...string[]];
const timeValues = TIMES.map((t) => t.value) as [string, ...string[]];

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(3, "Informe seu nome completo."),
    email: z.email("Informe um e-mail válido."),
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
    confirmPassword: z.string({ error: "Confirme sua senha." }),
    eixo: z.enum(eixoValues, { error: "Selecione seu eixo." }),
    time: z.enum(timeValues, { error: "Selecione seu time." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Informe um e-mail válido."),
});

export const resendVerificationSchema = forgotPasswordSchema;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Link inválido. Peça um novo e-mail de redefinição."),
    password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
    confirmPassword: z.string({ error: "Confirme sua senha." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
