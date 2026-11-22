"use client";

import { ArrowRight, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, PasswordInput } from "@/components/ui";
import { useFormSubmit } from "@/lib/form";
import { loginAction } from "../actions";
import { loginSchema } from "../schemas";

export function LoginForm() {
  const router = useRouter();
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(loginSchema, async (data) => {
    const result = await loginAction(data);
    if (result.ok) {
      router.push("/dashboard");
      router.refresh();
    }
    return result;
  });

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Input
        id="email"
        type="email"
        label="E-mail"
        icon={Mail}
        placeholder="Insira seu e-mail..."
        autoComplete="email"
        error={errors.email}
      />
      <PasswordInput
        id="password"
        label="Senha"
        placeholder="Insira sua senha..."
        autoComplete="current-password"
        error={errors.password}
      />

      <Button type="submit" size="lg" block loading={loading} className="group mt-2">
        Entrar
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
      </Button>
    </form>
  );
}
