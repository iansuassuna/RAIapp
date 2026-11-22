import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { AuthCard, DevQuickLogin, LoginForm } from "@/features/auth";
import { getDevQuickSwitchMembers } from "@/lib/session";

export const metadata: Metadata = { title: "Entrar" };

type Props = { searchParams: Promise<{ senha?: string | string[] }> };

export default async function LoginPage({ searchParams }: Props) {
  const [{ senha }, devMembers] = await Promise.all([searchParams, getDevQuickSwitchMembers()]);

  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle="Entre com sua conta para acompanhar sua trajetória."
      footer={
        <>
          Ainda não possui conta?{" "}
          <Link
            href="/cadastro"
            className="font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline"
          >
            Cadastre-se no RAIapp
          </Link>
        </>
      }
    >
      {senha === "redefinida" && (
        <Alert tone="success" className="mb-4">
          Senha redefinida. Entre com a nova senha.
        </Alert>
      )}
      <LoginForm />
      <p className="mt-4 text-right text-sm">
        <Link
          href="/esqueci-senha"
          className="font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline"
        >
          Esqueceu sua senha?
        </Link>
      </p>
      <DevQuickLogin members={devMembers} />
    </AuthCard>
  );
}
