import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

/** `decorative`: use quando o nome já aparece em texto ao lado, para o leitor de tela não repetir. */
type Props = { name: string; src?: string; className?: string; decorative?: boolean };

export function Avatar({ name, src, className, decorative }: Props) {
  return (
    <span
      aria-hidden={decorative || undefined}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent-300 to-accent-600 font-display text-sm font-bold text-brand-950 ring-2 ring-white/20",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      {!decorative && <span className="sr-only">{name}</span>}
    </span>
  );
}
