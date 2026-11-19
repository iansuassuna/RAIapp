"use client";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, PasswordInput } from "@/components/ui";
import { loginSchema } from "../schemas";
import { useFormSubmit } from "@/lib/form";

export function LoginForm() {
  const router = useRouter();
  const { errors, loading, handleSubmit, handleChange } = useFormSubmit(loginSchema, async () => {
    // TODO: integrar com a API de autenticação
    await new Promise((r) => setTimeout(r, 700));
    router.push("/dashboard");
  });

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
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

      <div className="flex justify-end">
        <Link href="#" className="text-sm font-medium text-brand-600 hover:text-accent-600">
          Esqueceu sua senha?
        </Link>
      </div>

      <Button type="submit" size="lg" block loading={loading} className="group">
        Entrar
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
      </Button>
    </form>
  );
}
