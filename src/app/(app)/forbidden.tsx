import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui";

/** Exibida quando uma página chama forbidden() — ex.: membro tentando abrir outro eixo. */
export default function Forbidden() {
  return (
    <div className="animate-fade-up mx-auto flex max-w-md flex-col items-center pt-16 text-center">
      <span className="grid size-16 place-items-center rounded-panel bg-danger-50 text-danger-500">
        <ShieldAlert className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-brand-950">Sem acesso</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Esta página pertence a outro eixo ou é restrita à coordenação. Você só pode acompanhar o eixo do qual faz parte.
      </p>
      <Link href="/eixos" className={buttonVariants({ className: "mt-8" })}>
        Ir para o meu eixo
      </Link>
    </div>
  );
}
