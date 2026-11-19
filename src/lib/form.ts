"use client";

import { useState, type FormEvent } from "react";
import type { z } from "zod";
import type { ActionResult } from "@/types";
import { fieldErrors, formDataToObject } from "./validation";

/**
 * Hook genérico: lê o <form>, valida com o schema e chama onValid.
 * Se onValid devolver um ActionResult com erro (ex.: vindo de uma Server Action),
 * os erros de campo e a mensagem geral (`formError`) aparecem no formulário.
 */
export function useFormSubmit<S extends z.ZodType>(
  schema: S,
  onValid: (data: z.infer<S>) => Promise<ActionResult | void> | ActionResult | void,
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = schema.safeParse(formDataToObject(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setFormError(null);
    setLoading(true);
    try {
      const result = await onValid(parsed.data);
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  /** Limpa o erro de um campo assim que ele é alterado. Use em <form onChange={handleChange}>. */
  function handleChange(e: FormEvent<HTMLFormElement>) {
    const name = (e.target as HTMLInputElement).name;
    if (name && errors[name]) {
      setErrors(({ [name]: _removed, ...rest }) => rest);
    }
  }

  return { errors, formError, loading, handleSubmit, handleChange };
}
