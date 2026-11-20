"use client";

import { Archive, Search, Tag } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, EmptyState, Progress } from "@/components/ui";
import { EIXOS, eixoLabel } from "@/config/options";
import { CABINETS, cabinetLabel, COMPONENT_CATEGORIES } from "@/config/requests";
import type { InventoryAvailability } from "@/types";

const selectCls =
  "h-10 rounded-field bg-surface px-3 text-sm text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-accent-500";

/** Inventário inteiro com busca e filtros por categoria, armário e eixo proprietário. */
export function InventoryBrowser({ items }: { items: InventoryAvailability[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cabinet, setCabinet] = useState("");
  const [owner, setOwner] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!q || i.name.toLowerCase().includes(q)) &&
        (!category || i.category === category) &&
        (!cabinet || i.cabinet === cabinet) &&
        (!owner || (owner === "sem" ? i.ownerEixo === null : i.ownerEixo === owner)),
    );
  }, [items, query, category, cabinet, owner]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <label className="relative">
          <span className="sr-only">Buscar componente</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar componente..." className={`${selectCls} w-full pl-9`} />
        </label>
        <select aria-label="Filtrar por categoria" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
          <option value="">Todas as categorias</option>
          {COMPONENT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por armário" value={cabinet} onChange={(e) => setCabinet(e.target.value)} className={selectCls}>
          <option value="">Todos os armários</option>
          {CABINETS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar por eixo proprietário" value={owner} onChange={(e) => setOwner(e.target.value)} className={selectCls}>
          <option value="">Todos os donos</option>
          <option value="sem">Sem propriedade</option>
          {EIXOS.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-ink-subtle" aria-live="polite">
        {filtered.length} de {items.length} itens
      </p>

      <Card className="p-2">
        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="Nenhum item com esses filtros" />
        ) : (
          <ul className="divide-y divide-line/70">
            {filtered.map((i) => (
              <li key={i.id}>
                <Link href={`/inventario/${i.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-3 py-3 transition hover:bg-surface-muted/70">
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block truncate text-sm font-semibold text-brand-950">{i.name}</span>
                    <span className="flex flex-wrap items-center gap-x-3 text-xs text-ink-subtle">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="size-3" aria-hidden /> {i.category}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Archive className="size-3" aria-hidden /> {cabinetLabel(i.cabinet)}
                      </span>
                    </span>
                  </span>
                  <Badge tone={i.ownerEixo ? "brand" : "accent"} dot={false}>
                    {i.ownerEixo ? eixoLabel(i.ownerEixo) : "Sem propriedade"}
                  </Badge>
                  <span className="w-36 space-y-1">
                    <span className="flex justify-between text-xs tabular-nums">
                      <span className="text-ink-subtle">{i.inUse} em uso</span>
                      <span className={`font-display font-bold ${i.available === 0 ? "text-danger-500" : "text-iris-600"}`}>
                        {i.available}
                        <span className="font-medium text-ink-subtle">/{i.total} livres</span>
                      </span>
                    </span>
                    <Progress value={i.available} max={Math.max(i.total, 1)} tone="light" label={`${i.name}: ${i.available} livres de ${i.total}`} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
