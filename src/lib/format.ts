/** Formata datas no padrão curto usado no app: 27/10/26 */
export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Zero à esquerda para os contadores: 5 → "05" */
export function padCount(n: number) {
  return String(n).padStart(2, "0");
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

export function initials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Médias da escala 1–5 com vírgula decimal: 4.25 → "4,3" */
export function formatAverage(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Data de hoje em ISO (AAAA-MM-DD), no fuso de Fortaleza. */
export function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
}

/** Prazo vencido e ainda não concluído. */
export function isOverdue(item: { deadline: string; status: string }) {
  return item.status !== "concluida" && item.status !== "concluido" && item.deadline < todayIso();
}

/** Data e hora curtas: 14/11/26 às 10:20 */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Fortaleza",
  })
    .format(new Date(iso))
    .replace(",", " às");
}
