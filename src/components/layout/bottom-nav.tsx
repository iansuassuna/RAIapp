"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItems, isActivePath } from "@/config/navigation";
import { cn } from "@/lib/cn";
import type { Role } from "@/types";

/** Navegação inferior — aparece só no mobile (o app é mobile-first). */
export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = getNavItems(role);
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                  active ? "text-brand-900" : "text-ink-subtle hover:text-brand-700",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition", active && "bg-accent-100")}>
                  <Icon className="size-5" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
