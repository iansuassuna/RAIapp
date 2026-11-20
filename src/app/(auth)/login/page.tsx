import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard, LoginForm } from "@/features/auth";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle="Entre com sua conta para acompanhar sua trajetória."
      footer={
        <>
          Ainda não possui conta?{" "}
          <Link href="/cadastro" className="font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline">
            Cadastre-se no RAIapp
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
