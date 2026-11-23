"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, Button, PasswordInput } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { resetPasswordAction } from "../actions";
import { resetPasswordSchema } from "../schemas";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    resetPasswordSchema,
    async (data) => {
      const result = await resetPasswordAction(data);
      if (result.ok) router.replace("/login?senha=redefinida");
      return result;
    },
  );

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      {errors.token && <Alert tone="danger">{errors.token}</Alert>}
      <input type="hidden" name="token" value={token} />
      <PasswordInput
        id="password"
        label="Nova senha"
        placeholder="Mínimo de 8 caracteres..."
        autoComplete="new-password"
        error={errors.password}
      />
      <PasswordInput
        id="confirmPassword"
        label="Confirme a nova senha"
        placeholder="Repita a nova senha..."
        autoComplete="new-password"
        error={errors.confirmPassword}
      />
      <Button type="submit" size="lg" block loading={loading} className="mt-2">
        Salvar nova senha
        <Check className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
