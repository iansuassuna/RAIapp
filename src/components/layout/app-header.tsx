"use client";

import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { LogoMark } from "@/components/brand/logo";
import { getNavItems, isActivePath } from "@/config/navigation";
import { describeMember } from "@/config/options";
import { cn } from "@/lib/cn";
import type { Member } from "@/types";
import { DevMemberSwitcher } from "./dev-member-switcher";

export function AppHeader({ member, devMembers }: { member: Member; devMembers: Member[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <header className="relative z-20 bg-brand-900 text-white">
      <div className="bg-circuit absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto flex h-20 max-w-5xl items-center gap-3 px-5">
        <Link href="/dashboard" className="hidden items-center gap-2 sm:flex" aria-label="Início">
          <LogoMark tone="light" className="w-7" />
          <span className="font-display text-sm font-bold tracking-tight">RAITec</span>
        </Link>

        {/* Navegação principal — desktop (no mobile fica na BottomNav) */}
        <nav aria-label="Navegação principal" className="ml-6 mr-auto hidden items-center gap-1 sm:flex">
          {getNavItems(member.role).map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition",
                  active ? "bg-white/10 text-white ring-1 ring-white/15" : "text-brand-200 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className={cn("size-4", active && "text-accent-300")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label="Notificações"
          className="relative order-last grid size-10 place-items-center rounded-full text-brand-100 transition hover:bg-white/10 sm:order-none"
        >
          <Bell className="size-5" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-accent-400 ring-2 ring-brand-900" />
        </button>

        <div ref={menuRef} className="relative mr-auto sm:mr-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className="flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-3 transition hover:bg-white/10"
          >
            <Avatar decorative name={member.name} src={member.avatarUrl} />
            <span className="text-left leading-tight">
              <span className="block font-display text-sm font-semibold">{member.name}</span>
              <span className="block text-xs text-brand-200">
                {describeMember(member)}
              </span>
            </span>
            <ChevronDown className={`size-4 text-brand-200 transition ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div
              role="menu"
              className="animate-fade-up absolute left-0 mt-2 w-72 overflow-hidden rounded-card bg-surface p-1.5 text-ink shadow-raised ring-1 ring-line sm:left-auto sm:right-0"
            >
              {[
                { icon: User, label: "Meu perfil", href: "#" },
                { icon: Settings, label: "Configurações", href: "#" },
              ].map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  role="menuitem"
                  href={href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-muted"
                >
                  <Icon className="size-4 text-ink-muted" /> {label}
                </Link>
              ))}
              <div className="my-1 h-px bg-line" />
              <DevMemberSwitcher current={member} members={devMembers} />
              <div className="my-1 h-px bg-line" />
              <Link
                role="menuitem"
                href="/login"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-danger-500 hover:bg-danger-50"
              >
                <LogOut className="size-4" /> Sair
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
