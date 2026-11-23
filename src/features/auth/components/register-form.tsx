"use client";

import { Layers, Mail, User, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, Button, Input, PasswordInput, Select } from "@/components/ui";
import { EIXOS, TIMES } from "@/config/options";
import { useFormSubmit } from "@/lib/form";
import { registerAction } from "../actions";
import { registerSchema } from "../schemas";

export function RegisterForm() {
  const router = useRouter();
  const { errors, formError, loading, handleSubmit, handleChange } = useFormSubmit(registerSchema, async (data) => {
    const result = await registerAction(data);
    if (result.ok) {
      router.push("/verificar-email");
      router.refresh();
    }
    return result;
  });

  return (
    <form onSubmit={handleSubmit} onChange={handleChange} noValidate className="space-y-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Input
        id="name"
        label="Nome"
        icon={User}
        placeholder="Insira seu nome..."
        autoComplete="name"
        error={errors.name}
      />
      <Input
        id="email"
        type="email"
        label="E-mail"
        icon={Mail}
        placeholder="Insira seu e-mail..."
        autoComplete="email"
        error={errors.email}
      />

      <div className="space-y-4">
        <PasswordInput
          id="password"
          label="Senha"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          error={errors.password}
        />
        <PasswordInput
          id="confirmPassword"
          label="Confirmar senha"
          placeholder="Repita a senha"
          autoComplete="new-password"
          error={errors.confirmPassword}
        />
      </div>

      <div className="space-y-4">
        <Select
          id="eixo"
          label="Eixo"
          icon={Layers}
          placeholder="Selecione seu eixo..."
          options={EIXOS}
          required
          error={errors.eixo}
        />
        <Select
          id="time"
          label="Time"
          icon={Users}
          placeholder="Selecione seu time..."
          options={TIMES}
          required
          error={errors.time}
        />
      </div>

      <Button type="submit" size="lg" block loading={loading} className="mt-6">
        Criar conta
      </Button>
    </form>
  );
}
