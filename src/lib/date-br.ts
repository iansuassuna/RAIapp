import { MONTH_LABELS } from "@/config/options";

/**
 * Datas no formato brasileiro (dd/mm/aaaa) para os campos de data do app.
 * O valor enviado ao servidor continua sendo ISO (AAAA-MM-DD), validado por `isoDate` em `lib/validation.ts`.
 * Funções puras, testadas em `date-br.test.ts`.
 */

const pad = (n: number) => String(n).padStart(2, "0");

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "2026-11-23" → "23/11/2026". Valor vazio ou inválido → "". */
export function isoToBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/** "23/11/2026" → "2026-11-23". Data incompleta ou impossível (31/02, 00/05) → null. */
export function brToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Máscara de digitação: mantém só dígitos (até 8) e insere as barras — "23112026" → "23/11/2026".
 * Também aceita texto colado já formatado ou em ISO ("2026-11-23").
 */
export function maskBrDate(raw: string): string {
  const fromIso = isoToBr(raw.trim());
  if (fromIso) return fromIso;
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "Novembro de 2026". */
export function monthTitle(year: number, month: number) {
  return `${MONTH_LABELS[month - 1]} de ${year}`;
}

/** "23 de novembro de 2026" (rótulo acessível de um dia do calendário). */
export function longDateLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MONTH_LABELS[(m ?? 1) - 1]?.toLowerCase()} de ${y}`;
}

/** Soma meses a {ano, mês} (mês 1–12). */
export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Soma dias a uma data ISO. */
export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Grade do mês para o calendário: semanas de domingo a sábado, com `null` nos dias fora do mês.
 * Sempre 6 semanas, para a altura do calendário não pular ao trocar de mês.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const total = daysInMonth(year, month);
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= total; day++) cells.push(`${year}-${pad(month)}-${pad(day)}`);
  while (cells.length < 42) cells.push(null);
  return Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** Iniciais dos dias da semana (domingo primeiro), com o nome completo para leitores de tela. */
export const WEEKDAYS = [
  { short: "D", long: "Domingo" },
  { short: "S", long: "Segunda-feira" },
  { short: "T", long: "Terça-feira" },
  { short: "Q", long: "Quarta-feira" },
  { short: "Q", long: "Quinta-feira" },
  { short: "S", long: "Sexta-feira" },
  { short: "S", long: "Sábado" },
] as const;
