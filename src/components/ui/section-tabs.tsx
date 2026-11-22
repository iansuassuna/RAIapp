"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type SectionTab = {
  href: string;
  label: string;
  /** Contador opcional (ex.: requisições pendentes). */
  count?: number;
  /** Ativa só no caminho exato (use na aba "Visão geral"). */
  exact?: boolean;
};

/** Abas de seção com rolagem horizontal no mobile. A ativa é calculada pela URL. */
export function SectionTabs({ tabs, label }: { tabs: SectionTab[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center gap-2 px-3 text-sm font-semibold transition",
                  active ? "text-brand-950" : "text-ink-subtle hover:text-brand-800",
                )}
              >
                {tab.label}
                {!!tab.count && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-brand-950">
                    {tab.count}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent-500" aria-hidden />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
