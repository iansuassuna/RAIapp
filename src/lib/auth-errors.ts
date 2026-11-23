import { APIError } from "better-auth/api";

/** Códigos do Better Auth com mensagem própria em pt-BR (verificados antes do status HTTP genérico). */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha inválidos.",
  USER_ALREADY_EXISTS: "Já existe uma conta cadastrada com este e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta cadastrada com este e-mail.",
  PASSWORD_TOO_SHORT: "A senha precisa ter ao menos 8 caracteres.",
  PASSWORD_TOO_LONG: "Use no máximo 128 caracteres.",
  INVALID_PASSWORD: "Senha atual incorreta.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Esta conta não usa senha para entrar.",
  SESSION_NOT_FRESH: "Por segurança, saia e entre novamente antes de fazer esta alteração.",
  SESSION_EXPIRED: "Por segurança, saia e entre novamente antes de fazer esta alteração.",
  INVALID_TOKEN: "Este link é inválido ou expirou. Peça um novo.",
};

/** Converte erros do Better Auth em mensagens pt-BR para formulários. */
export function translateAuthError(error: unknown, fallback: string): string {
  if (!(error instanceof APIError)) return fallback;

  const code = String((error.body as { code?: string } | undefined)?.code ?? "");
  const known = MESSAGES[code];
  if (known) return known;
  if (error.status === "UNAUTHORIZED") return "E-mail ou senha inválidos.";
  return error.message || fallback;
}
