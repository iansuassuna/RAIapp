"use client";

import { Check, User } from "lucide-react";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { updateProfileNameAction } from "../actions";
import { profileNameSchema } from "../schemas";

export function ProfileNameForm({ name }: { name: string }) {
  const [saved, setSaved] = useState(false);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(profileNameSchema, async (data) => {
    setSaved(false);
    const result = await updateProfileNameAction(data);
    if (result.ok) setSaved(true);
    return result;
  });

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      {saved && <Alert tone="success">Nome atualizado.</Alert>}
      <Input
        id="name"
        label="Nome completo"
        icon={User}
        defaultValue={name}
        autoComplete="name"
        maxLength={80}
        error={errors.name}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={loading}>
          <Check className="size-4" aria-hidden /> Salvar nome
        </Button>
      </div>
    </form>
  );
}
