"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

/** `decorative`: use quando o nome já aparece em texto ao lado, para o leitor de tela não repetir. */
type Props = { name: string; src?: string | null; className?: string; decorative?: boolean };

/**
 * Foto do membro (URL externa `https`) com fallback para as iniciais quando não há URL
 * ou quando a imagem não carrega (link quebrado, bloqueio de hotlink etc.).
 */
export function Avatar({ name, src, className, decorative }: Props) {
  const [failed, setFailed] = useState(false);
  // Nova URL (ex.: pré-visualização no perfil) merece nova tentativa.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reseta o erro sempre que a URL muda.
  useEffect(() => setFailed(false), [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <span
      aria-hidden={decorative || undefined}
      className={cn(
        "relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent-300 to-accent-600 font-display text-sm font-bold text-brand-950 ring-2 ring-white/20",
        className,
      )}
    >
      {showImage ? (
        // biome-ignore lint/performance/noImgElement: Avatar aceita URLs externas arbitrárias fora dos domínios fixos do next.config
        <img
          src={src ?? undefined}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
      {!decorative && <span className="sr-only">{name}</span>}
    </span>
  );
}
