"use client";

import { Check, ImageIcon, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Avatar, Button, Input } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { isHttpsUrl } from "@/lib/validation";
import { updateProfileAvatarAction } from "../actions";
import { profileAvatarSchema } from "../schemas";

export function ProfileAvatarForm({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState(avatarUrl ?? "");
  const [saved, setSaved] = useState<string | null>(null);
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(
    profileAvatarSchema,
    async (data) => {
      setSaved(null);
      const result = await updateProfileAvatarAction(data);
      if (result.ok) setSaved(data.avatarUrl ? "Avatar atualizado." : "Avatar removido.");
      return result;
    },
  );

  const previewSrc = isHttpsUrl(preview.trim()) ? preview.trim() : undefined;

  return (
    <form ref={formRef} onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      {saved && <Alert tone="success">{saved}</Alert>}
      <div className="flex items-center gap-4">
        <Avatar name={name} src={previewSrc} className="size-16 text-lg" decorative />
        <p className="text-xs text-ink-subtle">
          Cole o endereço (https://) de uma imagem pública. Se ela não carregar, mostramos suas iniciais.
        </p>
      </div>
      <Input
        id="avatarUrl"
        type="url"
        inputMode="url"
        label="Endereço da imagem"
        icon={ImageIcon}
        placeholder="https://..."
        defaultValue={avatarUrl ?? ""}
        onChange={(e) => setPreview(e.currentTarget.value)}
        error={errors.avatarUrl}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => {
              const input = formRef.current?.elements.namedItem("avatarUrl");
              if (input instanceof HTMLInputElement) input.value = "";
              setPreview("");
              formRef.current?.requestSubmit();
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Remover
          </Button>
        )}
        <Button type="submit" size="sm" loading={loading}>
          <Check className="size-4" aria-hidden /> Salvar avatar
        </Button>
      </div>
    </form>
  );
}
