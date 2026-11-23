import { z } from "zod";
import { avatarUrl, newPassword, personName } from "@/lib/validation";

export const profileNameSchema = z.object({ name: personName });

export const profileAvatarSchema = z.object({ avatarUrl });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual."),
    newPassword,
    confirmPassword: z.string({ error: "Confirme a nova senha." }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "A nova senha precisa ser diferente da atual.",
  });

export const changeEmailSchema = z.object({
  newEmail: z.email("Informe um e-mail válido."),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
