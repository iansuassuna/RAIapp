/** Formata datas no padrão usado no app: 27/10/2026 (dd/mm/aaaa). */
export function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

/** Data e hora: 14/11/2026 às 10:20 (fuso de Fortaleza). */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Fortaleza",
  })
    .format(new Date(iso))
    .replace(",", " às");
}

/** Descrição curta do aparelho a partir do User-Agent: "Chrome · Windows". Sem dependências externas. */
export function describeUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return "Aparelho desconhecido";
  const ua = userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const os = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  if (!browser && !os) return "Navegador desconhecido";
  return [browser, os].filter(Boolean).join(" · ");
}

/** IP legível: IPv6 compactado, loopback como "esta máquina" e endereço não especificado (`::`, `0.0.0.0`) omitido. */
export function formatIpAddress(ip: string | null | undefined) {
  if (!ip) return null;
  let value = ip.trim();
  if (value.includes(":")) {
    try {
      value = new URL(`http://[${value}]`).hostname.replace(/^\[|\]$/g, "");
    } catch {
      // Mantém como veio se não for um IPv6 válido.
    }
  }
  if (value === "" || value === "::" || value === "0.0.0.0") return null;
  if (value === "::1" || value === "127.0.0.1" || value === "::ffff:127.0.0.1") return "esta máquina";
  return value;
}

/** "encerra hoje" · "encerra amanhã" · "encerra em 5 dias (30/11)". */
export function cycleDeadlineText(daysLeft: number, endsOn: string) {
  if (daysLeft <= 0) return "encerra hoje";
  if (daysLeft === 1) return "encerra amanhã";
  return `encerra em ${daysLeft} dias (${formatShortDate(endsOn).slice(0, 5)})`;
}

/** Tempo relativo curto: "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data. */
export function formatRelativeTime(iso: string, now: number = Date.now()) {
  const diff = Math.max(0, now - Date.parse(iso));
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return formatShortDate(iso);
}
