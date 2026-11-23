"use client";

import { CalendarDays, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  addDaysIso,
  brToIso,
  isoToBr,
  longDateLabel,
  maskBrDate,
  monthGrid,
  monthTitle,
  shiftMonth,
  WEEKDAYS,
} from "@/lib/date-br";
import { todayIso } from "@/lib/format";
import { FieldShell, fieldControlClass } from "./field";

type Props = {
  id: string;
  /** Nome enviado no formulário (padrão: `id`). O valor enviado é ISO (AAAA-MM-DD). */
  name?: string;
  label: string;
  icon?: LucideIcon;
  /** Valor inicial em ISO (AAAA-MM-DD). */
  defaultValue?: string | null;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

function parts(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return { year: y ?? 2026, month: m ?? 1 };
}

/**
 * Campo de data em dd/mm/aaaa, independente do idioma do navegador (o `<input type="date">` nativo segue o
 * idioma do sistema e não deixa escolher o formato). Digitação com máscara + calendário próprio em português.
 * Envia ISO num campo oculto com o `name`, então schemas (`isoDate`) e Server Actions não mudam.
 */
export function DateInput({
  id,
  name,
  label,
  icon = CalendarDays,
  defaultValue,
  error,
  hint,
  disabled,
  className,
}: Props) {
  const [text, setText] = useState(() => isoToBr(defaultValue));
  const [touched, setTouched] = useState(false);
  const [hideExternalError, setHideExternalError] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parts(defaultValue || todayIso()));
  const [focusedDay, setFocusedDay] = useState<string>(() => defaultValue || todayIso());
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogId = useId();
  const titleId = useId();

  const iso = brToIso(text);
  const today = todayIso();

  // Erro local (só depois de sair do campo) tem prioridade; o erro do servidor some assim que o valor muda.
  const localError =
    touched && text.length > 0
      ? text.length < 10
        ? "Use o formato dd/mm/aaaa."
        : iso
          ? undefined
          : "Data inválida."
      : undefined;
  const shownError = localError ?? (hideExternalError ? undefined : error);

  useEffect(() => {
    if (error) setHideExternalError(false);
  }, [error]);

  // `form.reset()` (ex.: após enviar) volta ao valor inicial.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setText(isoToBr(defaultValue));
      setTouched(false);
      setOpen(false);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue]);

  // Fecha o calendário ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Mantém o foco no dia ativo enquanto navega pelo teclado.
  useEffect(() => {
    if (!open) return;
    gridRef.current?.querySelector<HTMLButtonElement>(`button[data-iso="${focusedDay}"]`)?.focus();
  }, [open, focusedDay]);

  function changeText(next: string) {
    setText(next);
    setHideExternalError(true);
  }

  function openCalendar() {
    const start = iso ?? today;
    setView(parts(start));
    setFocusedDay(start);
    setOpen(true);
  }

  function pick(day: string) {
    changeText(isoToBr(day));
    setTouched(true);
    setOpen(false);
    inputRef.current?.focus();
  }

  function moveFocus(next: string) {
    setFocusedDay(next);
    setView(parts(next));
  }

  function onGridKeyDown(e: KeyboardEvent<HTMLTableElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    let next: string | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = addDaysIso(focusedDay, -1);
        break;
      case "ArrowRight":
        next = addDaysIso(focusedDay, 1);
        break;
      case "ArrowUp":
        next = addDaysIso(focusedDay, -7);
        break;
      case "ArrowDown":
        next = addDaysIso(focusedDay, 7);
        break;
      case "PageUp":
        next = shiftFocusedMonth(-1);
        break;
      case "PageDown":
        next = shiftFocusedMonth(1);
        break;
    }
    if (next) {
      e.preventDefault();
      moveFocus(next);
    }
  }

  function shiftFocusedMonth(delta: number) {
    const { year, month } = shiftMonth(view.year, view.month, delta);
    const day = Math.min(Number(focusedDay.slice(8, 10)), new Date(Date.UTC(year, month, 0)).getUTCDate());
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function showMonth(delta: number) {
    const next = shiftMonth(view.year, view.month, delta);
    setView(next);
    setFocusedDay(`${next.year}-${String(next.month).padStart(2, "0")}-01`);
  }

  const describedBy = shownError ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <FieldShell
        id={id}
        label={label}
        icon={icon}
        error={shownError}
        hint={hint}
        trailing={
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={() => (open ? setOpen(false) : openCalendar())}
            aria-label={open ? "Fechar calendário" : `Abrir calendário de ${label}`}
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-controls={open ? dialogId : undefined}
            className="grid size-10 place-items-center rounded-lg text-ink-subtle transition hover:bg-surface-muted hover:text-brand-800 disabled:opacity-50"
          >
            <CalendarDays className="size-[18px]" aria-hidden />
          </button>
        }
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          disabled={disabled}
          value={text}
          onChange={(e) => changeText(maskBrDate(e.target.value))}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              openCalendar();
            }
          }}
          aria-invalid={!!shownError}
          aria-describedby={describedBy}
          className={cn(fieldControlClass, "pr-14 tabular-nums")}
        />
      </FieldShell>
      {/* Valor real do formulário: ISO quando a data é válida; texto cru se não for (o schema recusa). */}
      <input type="hidden" name={name ?? id} value={iso ?? text} />

      {open && (
        <div
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="animate-fade-up absolute left-0 top-[3.75rem] z-30 w-72 max-w-[calc(100vw-2.5rem)] rounded-card bg-surface p-3 shadow-raised ring-1 ring-line"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => showMonth(-1)}
              aria-label="Mês anterior"
              className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <p id={titleId} className="font-display text-sm font-bold text-brand-950" aria-live="polite">
              {monthTitle(view.year, view.month)}
            </p>
            <button
              type="button"
              onClick={() => showMonth(1)}
              aria-label="Próximo mês"
              className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>

          <table ref={gridRef} aria-labelledby={titleId} onKeyDown={onGridKeyDown} className="w-full table-fixed">
            <thead>
              <tr>
                {WEEKDAYS.map((w) => (
                  <th
                    key={w.long}
                    scope="col"
                    abbr={w.long}
                    className="h-8 text-center text-[11px] font-semibold text-ink-subtle"
                  >
                    {w.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(view.year, view.month).map((week, wi) => (
                <tr key={week.find(Boolean) ?? `vazia-${wi}`}>
                  {week.map((day, di) =>
                    day ? (
                      <td key={day} className="p-0">
                        <button
                          type="button"
                          data-iso={day}
                          tabIndex={day === focusedDay ? 0 : -1}
                          onClick={() => pick(day)}
                          aria-label={longDateLabel(day)}
                          aria-pressed={day === iso}
                          aria-current={day === today ? "date" : undefined}
                          className={cn(
                            "grid h-9 w-full place-items-center rounded-lg text-sm tabular-nums transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500",
                            day === iso
                              ? "bg-brand-900 font-semibold text-white"
                              : day === today
                                ? "font-semibold text-accent-700 ring-1 ring-accent-300"
                                : "text-ink hover:bg-surface-muted",
                          )}
                        >
                          {Number(day.slice(8, 10))}
                        </button>
                      </td>
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: casas vazias não têm identidade além da posição.
                      <td key={`vazio-${wi}-${di}`} aria-hidden className="h-9 p-0" />
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => pick(today)}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-700 hover:bg-surface-muted"
            >
              Hoje
            </button>
            {text && (
              <button
                type="button"
                onClick={() => {
                  changeText("");
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-muted hover:bg-surface-muted"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
