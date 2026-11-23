import { MONTH_LABELS } from "@/config/options";

/**
 * Regras puras de período dos ciclos de avaliação (sem banco), testadas em `cycle-period.test.ts`.
 * Datas sempre no formato do <input type="date"> (AAAA-MM-DD), comparáveis como string.
 */
export type CyclePeriod = { id: string; label: string; startsOn: string; endsOn: string };

const pad = (n: number) => String(n).padStart(2, "0");

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Soma `days` dias a uma data AAAA-MM-DD (UTC, sem efeito de fuso). */
export function addDays(dateIso: string, days: number) {
  const d = new Date(`${dateIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dias corridos de `from` até `to` (negativo se `to` for antes). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Ciclo mensal que contém a data: id "AAAA-MM", rótulo "Novembro/26", do dia 1º ao último dia do mês. */
export function monthCycleFor(dateIso: string): CyclePeriod {
  const [yearText, monthText] = dateIso.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return {
    id: `${year}-${pad(month)}`,
    label: `${MONTH_LABELS[month - 1]}/${String(year).slice(-2)}`,
    startsOn: `${year}-${pad(month)}-01`,
    endsOn: `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`,
  };
}

/**
 * Ciclo a criar automaticamente para `today` quando nenhum o cobre: o mês de `today`, ajustado para não
 * sobrepor ciclos existentes (começa depois do último que terminou antes e termina antes do próximo).
 */
export function autoCycleFor(today: string, existing: Pick<CyclePeriod, "startsOn" | "endsOn">[]): CyclePeriod {
  const month = monthCycleFor(today);
  let startsOn = month.startsOn;
  let endsOn = month.endsOn;
  for (const c of existing) {
    if (c.endsOn < today && c.endsOn >= startsOn) startsOn = addDays(c.endsOn, 1);
    if (c.startsOn > today && c.startsOn <= endsOn) endsOn = addDays(c.startsOn, -1);
  }
  return { ...month, startsOn, endsOn };
}

/** Dois períodos se sobrepõem (inclusive nas pontas). */
export function periodsOverlap(
  a: Pick<CyclePeriod, "startsOn" | "endsOn">,
  b: Pick<CyclePeriod, "startsOn" | "endsOn">,
) {
  return a.startsOn <= b.endsOn && b.startsOn <= a.endsOn;
}
