"use client";

import { KeyRound } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Button, PasswordInput } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { changePasswordAction } from "../actions";
import { changePasswordSchema } from "../schemas";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [saved, setSaved] = useState(false);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    changePasswordSchema,
    async (data) => {
      setSaved(false);
      const result = await changePasswordAction(data);
      if (result.ok) {
        formRef.current?.reset();
        setSaved(true);
      }
      return result;
    },
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && !errors.currentPassword && <Alert tone="danger">{formError}</Alert>}
      {saved && <Alert tone="success">Senha alterada. As sessões abertas em outros aparelhos foram encerradas.</Alert>}
      <PasswordInput
        id="currentPassword"
        label="Senha atual"
        placeholder="Sua senha atual..."
        autoComplete="current-password"
        error={errors.currentPassword}
      />
      <PasswordInput
        id="newPassword"
        label="Nova senha"
        placeholder="Mínimo de 8 caracteres..."
        autoComplete="new-password"
        error={errors.newPassword}
      />
      <PasswordInput
        id="confirmPassword"
        label="Confirme a nova senha"
        placeholder="Repita a nova senha..."
        autoComplete="new-password"
        error={errors.confirmPassword}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={loading}>
          <KeyRound className="size-4" aria-hidden /> Trocar senha
        </Button>
      </div>
    </form>
  );
}
