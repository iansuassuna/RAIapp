"use client";

import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { requestPasswordResetAction } from "../actions";
import { forgotPasswordSchema } from "../schemas";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    forgotPasswordSchema,
    async (data) => {
      const result = await requestPasswordResetAction(data);
      if (result.ok) setSentTo(data.email);
      return result;
    },
  );

  if (sentTo) {
    return (
      <Alert tone="success">
        Se houver uma conta para <strong>{sentTo}</strong>, enviamos um link para criar uma nova senha. Confira também a
        caixa de spam. O link expira em 1 hora.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Input
        id="email"
        type="email"
        label="E-mail"
        icon={Mail}
        placeholder="Insira o e-mail da sua conta..."
        autoComplete="email"
        error={errors.email}
      />
      <Button type="submit" size="lg" block loading={loading} className="mt-2">
        Enviar link de redefinição
        <Send className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
