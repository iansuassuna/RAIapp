import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, ForgotPasswordForm } from "@/features/auth";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Esqueceu sua senha?"
      subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
      footer={
        <>
          Lembrou?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline"
          >
            Voltar para o login
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
