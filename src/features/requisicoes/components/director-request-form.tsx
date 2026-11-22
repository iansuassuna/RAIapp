"use client";

import { MessageSquareText, Send, Text, Type } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Button, Card, Input, Textarea } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import type { ActionResult } from "@/types";
import { directorRequestSchema } from "../schemas";

/** Pedido de coordenador à diretoria: só título, explicação e justificativa. */
export function DirectorRequestForm({ action }: { action: (input: unknown) => Promise<ActionResult> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    directorRequestSchema,
    async (data) => {
      setNotice(null);
      const result = await action(data);
      if (result.ok) {
        formRef.current?.reset();
        setNotice("Pedido enviado para a diretoria.");
      }
      return result;
    },
  );

  return (
    <Card>
      <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
        <p className="flex items-center gap-2 font-display text-sm font-bold text-brand-900">
          <Send className="size-4 text-accent-600" aria-hidden /> Pedido à diretoria
        </p>
        <p className="-mt-2 text-xs text-ink-subtle">Requisições da coordenação são analisadas pela diretoria.</p>
        {formError && <Alert tone="danger">{formError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        <input type="hidden" name="kind" value="pedido" />
        <Input
          id="title"
          label="Título"
          icon={Type}
          placeholder="Ex.: Kits de Arduino para a capacitação"
          error={errors.title}
        />
        <Textarea
          id="explanation"
          label="Explicação: o que é preciso"
          icon={Text}
          placeholder="Descreva o pedido..."
          rows={3}
          maxLength={500}
          error={errors.explanation}
        />
        <Textarea
          id="justification"
          label="Justificativa"
          icon={MessageSquareText}
          placeholder="Por que isso é necessário?"
          maxLength={500}
          error={errors.justification}
        />
        <div className="flex justify-end">
          <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
            Enviar pedido <Send className="size-4" aria-hidden />
          </Button>
        </div>
      </form>
    </Card>
  );
}
