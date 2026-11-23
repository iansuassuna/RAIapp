"use client";

import { Mail, Send } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Badge, Button, Input } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { changeEmailAction } from "../actions";
import { changeEmailSchema } from "../schemas";

type Props = { email: string; emailVerified: boolean };

export function ChangeEmailForm({ email, emailVerified }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [requested, setRequested] = useState<string | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(changeEmailSchema, async (data) => {
    setRequested(null);
    const result = await changeEmailAction(data);
    if (result.ok) {
      formRef.current?.reset();
      setRequested(data.newEmail);
    }
    return result;
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-muted">E-mail atual:</span>
        <strong className="break-all text-brand-950">{email}</strong>
        <Badge tone={emailVerified ? "success" : "warning"}>{emailVerified ? "Verificado" : "Não verificado"}</Badge>
      </div>
      {formError && !errors.newEmail && <Alert tone="danger">{formError}</Alert>}
      {requested && (
        <Alert tone="info">
          {emailVerified ? (
            <>
              Enviamos um link para <strong>{email}</strong> para aprovar a troca. Depois disso, confirme pelo link que
              chegará em <strong>{requested}</strong>.
            </>
          ) : (
            <>
              Enviamos um link de confirmação para <strong>{requested}</strong>. A troca é concluída ao confirmar.
            </>
          )}
        </Alert>
      )}
      <Input
        id="newEmail"
        type="email"
        label="Novo e-mail"
        icon={Mail}
        placeholder="nome@exemplo.com"
        autoComplete="email"
        error={errors.newEmail}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={loading}>
          <Send className="size-4" aria-hidden /> Trocar e-mail
        </Button>
      </div>
    </form>
  );
}
