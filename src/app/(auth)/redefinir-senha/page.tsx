import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { AuthCard, ResetPasswordForm } from "@/features/auth";

export const metadata: Metadata = { title: "Redefinir senha" };

type Props = { searchParams: Promise<{ token?: string | string[]; error?: string | string[] }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  const validToken = typeof token === "string" && token.length > 0 && !error ? token : null;

  return (
    <AuthCard
      title="Crie uma nova senha"
      subtitle="Ao salvar, você será desconectado de todos os aparelhos e poderá entrar com a nova senha."
      footer={
        <Link
          href="/login"
          className="font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline"
        >
          Voltar para o login
        </Link>
      }
    >
      {validToken ? (
        <ResetPasswordForm token={validToken} />
      ) : (
        <div className="space-y-4">
          <Alert tone="danger">Este link de redefinição é inválido ou expirou.</Alert>
          <Link
            href="/esqueci-senha"
            className="inline-flex text-sm font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline"
          >
            Pedir um novo link
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
