"use client";

import { Mail, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { resendVerificationAction } from "../actions";
import { resendVerificationSchema } from "../schemas";

const COOLDOWN_SECONDS = 60;

/**
 * Reenvio do link de confirmação. Com `email` conhecido (sessão pendente), mostra só o botão;
 * sem sessão (ex.: link expirado aberto em outro aparelho), pede o e-mail.
 */
export function ResendVerificationForm({ email }: { email?: string }) {
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    resendVerificationSchema,
    async (data) => {
      const result = await resendVerificationAction(data);
      if (result.ok) {
        setSent(true);
        setCooldown(COOLDOWN_SECONDS);
      }
      return result;
    },
  );

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      {sent && <Alert tone="success">Se houver uma conta pendente para este e-mail, enviamos um novo link.</Alert>}
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Input
          id="email"
          type="email"
          label="E-mail"
          icon={Mail}
          placeholder="Insira o e-mail da sua conta..."
          autoComplete="email"
          error={errors.email}
        />
      )}
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        block
        loading={loading}
        disabled={cooldown > 0}
        aria-live="polite"
      >
        <RefreshCw className="size-4" aria-hidden />
        {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar e-mail de confirmação"}
      </Button>
    </form>
  );
}
