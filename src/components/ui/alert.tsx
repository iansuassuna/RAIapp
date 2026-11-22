import { AlertTriangle, CheckCircle2, Info, type LucideIcon, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones: Record<"success" | "danger" | "warning" | "info", { box: string; icon: LucideIcon }> = {
  success: { box: "bg-success-50 text-success-700", icon: CheckCircle2 },
  danger: { box: "bg-danger-50 text-danger-700", icon: XCircle },
  warning: { box: "bg-warning-50 text-warning-700", icon: AlertTriangle },
  info: { box: "bg-brand-50 text-brand-700", icon: Info },
};

type Props = { tone?: keyof typeof tones; children: ReactNode; className?: string };

/** Mensagem inline. `danger` usa role="alert"; os demais, role="status". */
export function Alert({ tone = "info", children, className }: Props) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "animate-fade-up flex items-start gap-2 rounded-field px-4 py-3 text-sm font-medium",
        box,
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
