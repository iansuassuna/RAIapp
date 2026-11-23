/**
 * Envio de e-mails transacionais.
 *
 * Drivers (`MAIL_DRIVER`):
 * - `resend`  — API HTTP do Resend via `fetch` (sem SDK). Padrão em produção. Exige `RESEND_API_KEY` e `MAIL_FROM`.
 * - `console` — imprime o e-mail (com links) no log do servidor. Padrão em desenvolvimento.
 * - `memory`  — guarda em memória para asserções. Sempre usado em testes (`NODE_ENV=test`).
 */
export type MailMessage = { to: string; subject: string; html: string; text: string };
export type MailDriver = "resend" | "console" | "memory";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function getMailDriver(): MailDriver {
  // Testes nunca enviam de verdade, mesmo que o `.env` (carregado pelo Bun) defina outro driver.
  if (process.env.NODE_ENV === "test") return "memory";
  const explicit = process.env.MAIL_DRIVER;
  if (explicit === "resend" || explicit === "console" || explicit === "memory") return explicit;
  return process.env.NODE_ENV === "production" ? "resend" : "console";
}

/* ---------- Caixa de saída em memória (testes) ---------- */

const OUTBOX_KEY = "__raiappMailOutbox";
const store = globalThis as typeof globalThis & { [OUTBOX_KEY]?: MailMessage[] };

/** E-mails "enviados" pelo driver `memory`, do mais antigo ao mais recente. */
export function getOutbox(): MailMessage[] {
  store[OUTBOX_KEY] ??= [];
  return store[OUTBOX_KEY];
}

export function clearOutbox() {
  store[OUTBOX_KEY] = [];
}

/* ---------- Envio ---------- */

/** `driver` é parametrizável só para testes do envio real; o app usa sempre `getMailDriver()`. */
export async function sendMail(message: MailMessage, driver: MailDriver = getMailDriver()): Promise<void> {
  if (driver === "memory") {
    getOutbox().push(message);
    return;
  }

  if (driver === "console") {
    console.info(`\n[mail:console] Para: ${message.to}\n[mail:console] Assunto: ${message.subject}\n${message.text}\n`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Envio de e-mail indisponível: defina RESEND_API_KEY e MAIL_FROM.");
  }

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
  });

  if (!res.ok) {
    // Corpo de erro do Resend não contém a chave; limitamos o tamanho para não poluir o log.
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Resend respondeu ${res.status}: ${detail}`);
  }
}

/**
 * Variante que nunca lança: registra a falha e segue. Usada nos fluxos de autenticação para que uma
 * indisponibilidade do provedor não quebre o cadastro (o usuário pode pedir reenvio depois).
 */
export async function sendMailSafely(message: MailMessage, driver?: MailDriver): Promise<boolean> {
  try {
    await sendMail(message, driver);
    return true;
  } catch (error) {
    console.error(`[mail] Falha ao enviar "${message.subject}":`, error instanceof Error ? error.message : error);
    return false;
  }
}
