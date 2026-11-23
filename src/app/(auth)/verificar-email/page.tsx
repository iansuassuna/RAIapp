import { LogOut, MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui";
import { AuthCard, ResendVerificationForm } from "@/features/auth";
import { logoutAction } from "@/lib/auth-actions";
import { getSessionState } from "@/lib/session";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

type Props = { searchParams: Promise<{ error?: string | string[] }> };

/**
 * Destino do cadastro e do link de confirmação (`callbackURL`). Contas ativas nem chegam aqui:
 * o layout `(auth)` as leva ao dashboard. Aqui ficam: conta pendente de verificação e link inválido/expirado.
 */
export default async function VerifyEmailPage({ searchParams }: Props) {
  const [{ error }, session] = await Promise.all([searchParams, getSessionState()]);
  const pendingEmail = session.status === "unverified" ? session.email : undefined;

  return (
    <AuthCard
      title="Confirme seu e-mail"
      subtitle="Para proteger sua conta, precisamos confirmar que o e-mail é seu."
      footer={
        pendingEmail ? (
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center gap-2 font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline"
            >
              <LogOut className="size-4" aria-hidden /> Sair e usar outra conta
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="font-semibold text-brand-700 underline-offset-4 hover:text-accent-600 hover:underline"
          >
            Voltar para o login
          </Link>
        )
      }
    >
      <div className="space-y-5">
        {error ? (
          <Alert tone="danger">Este link de confirmação é inválido ou expirou. Peça um novo abaixo.</Alert>
        ) : pendingEmail ? (
          <div className="flex items-start gap-3 rounded-card bg-surface p-4 ring-1 ring-line">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <MailCheck className="size-5" aria-hidden />
            </span>
            <p className="text-sm text-ink-muted">
              Enviamos um link de confirmação para <strong className="text-brand-950">{pendingEmail}</strong>. Abra o
              e-mail e clique em <strong>Confirmar e-mail</strong>. O link expira em 1 hora.
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Abra o link de confirmação que enviamos para o seu e-mail. Se ele expirou, peça um novo abaixo.
          </p>
        )}
        <ResendVerificationForm email={pendingEmail} />
      </div>
    </AuthCard>
  );
}
