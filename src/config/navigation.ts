import { Boxes, ClipboardCheck, House, Landmark, Layers, UserRound, type LucideIcon } from "lucide-react";
import type { Role } from "@/types";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Destinos principais do app, conforme o papel. Usado pelo header (desktop) e pela navegação inferior (mobile). */
export function getNavItems(role: Role): NavItem[] {
  // Diretoria não tem eixo/projetos próprios: no lugar de "Minha área" entra a área da diretoria.
  if (role === "diretoria") {
    return [
      { href: "/dashboard", label: "Início", icon: House },
      { href: "/diretoria", label: "Diretoria", icon: Landmark },
      { href: "/eixos", label: "Eixos", icon: Layers },
      { href: "/inventario", label: "Inventário", icon: Boxes },
      { href: "/avaliacao", label: "Avaliação", icon: ClipboardCheck },
    ];
  }
  return [
    { href: "/dashboard", label: "Início", icon: House },
    { href: "/minha-area", label: "Minha área", icon: UserRound },
    { href: "/eixos", label: "Meu eixo", icon: Layers },
    { href: "/inventario", label: "Inventário", icon: Boxes },
    { href: "/avaliacao", label: "Avaliação", icon: ClipboardCheck },
  ];
}

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
