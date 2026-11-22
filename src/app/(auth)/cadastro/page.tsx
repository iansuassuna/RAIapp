import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, RegisterForm } from "@/features/auth";

export const metadata: Metadata = { title: "Cadastro" };

export default function CadastroPage() {
  return (
    <AuthCard
      title="Crie sua conta"
      subtitle="Preencha seus dados e escolha seu eixo e time."
      footer={
        <>
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
