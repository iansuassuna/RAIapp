import type { MailMessage } from "./mail";

/**
 * Templates de e-mail transacional (pt-BR).
 * Clientes de e-mail não suportam variáveis CSS: as cores abaixo ESPELHAM os tokens de `app/globals.css`
 * (`brand-900`, `accent-500`, `canvas`, `line`, `ink`, `ink-muted`). Se um token mudar, atualize aqui.
 */
const EMAIL_COLORS = {
  brand900: "#070a35",
  accent500: "#0dbfbe",
  canvas: "#f3f4f9",
  line: "#e2e5f0",
  ink: "#0c0e2b",
  inkMuted: "#5d6280",
} as const;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type ActionEmail = {
  to: string;
  subject: string;
  greetingName: string;
  intro: string;
  actionLabel: string;
  url: string;
  outro: string;
};

function renderActionEmail({ to, subject, greetingName, intro, actionLabel, url, outro }: ActionEmail): MailMessage {
  const c = EMAIL_COLORS;
  const name = escapeHtml(greetingName);
  const href = escapeHtml(url);

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:${c.canvas};font-family:Arial,Helvetica,sans-serif;color:${c.ink}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid ${c.line};border-radius:16px;overflow:hidden">
      <tr><td style="background:${c.brand900};padding:20px 28px;color:#fff;font-weight:bold;font-size:18px">RAITec App</td></tr>
      <tr><td style="padding:28px">
        <p style="margin:0 0 12px;font-size:16px">Olá, ${name}!</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:${c.inkMuted}">${escapeHtml(intro)}</p>
        <p style="margin:0 0 24px"><a href="${href}" style="display:inline-block;background:${c.brand900};color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px">${escapeHtml(actionLabel)}</a></p>
        <p style="margin:0 0 8px;font-size:13px;color:${c.inkMuted}">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
        <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${href}" style="color:${c.accent500}">${href}</a></p>
        <p style="margin:0;font-size:13px;color:${c.inkMuted}">${escapeHtml(outro)}</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Olá, ${greetingName}!\n\n${intro}\n\n${actionLabel}: ${url}\n\n${outro}\n\n— RAITec App`;
  return { to, subject, html, text };
}

export function verificationEmail(user: { email: string; name: string }, url: string): MailMessage {
  return renderActionEmail({
    to: user.email,
    subject: "Confirme seu e-mail no RAITec App",
    greetingName: user.name,
    intro: "Falta pouco! Confirme seu e-mail para começar a usar o RAITec App.",
    actionLabel: "Confirmar e-mail",
    url,
    outro: "O link expira em 1 hora. Se você não criou esta conta, ignore este e-mail.",
  });
}

export function resetPasswordEmail(user: { email: string; name: string }, url: string): MailMessage {
  return renderActionEmail({
    to: user.email,
    subject: "Redefinição de senha do RAITec App",
    greetingName: user.name,
    intro: "Recebemos um pedido para redefinir a senha da sua conta.",
    actionLabel: "Criar nova senha",
    url,
    outro:
      "O link expira em 1 hora e só pode ser usado uma vez. Se não foi você, ignore este e-mail: sua senha continua a mesma.",
  });
}

/** 1ª etapa da troca de e-mail: enviado ao endereço ATUAL, que precisa aprovar a mudança. */
export function changeEmailConfirmationEmail(user: { email: string; name: string }, newEmail: string, url: string) {
  return renderActionEmail({
    to: user.email,
    subject: "Confirme a troca do e-mail da sua conta",
    greetingName: user.name,
    intro: `Recebemos um pedido para trocar o e-mail da sua conta para ${newEmail}. Para continuar, confirme pelo botão abaixo; depois enviaremos um link para o novo endereço.`,
    actionLabel: "Aprovar troca de e-mail",
    url,
    outro:
      "O link expira em 1 hora. Se não foi você, ignore este e-mail e troque sua senha: seu e-mail continua o mesmo.",
  });
}

/** 2ª etapa da troca de e-mail: enviado ao endereço NOVO; a troca só acontece ao confirmar. */
export function newEmailVerificationEmail(user: { email: string; name: string }, url: string) {
  return renderActionEmail({
    to: user.email,
    subject: "Confirme seu novo e-mail no RAITec App",
    greetingName: user.name,
    intro: "Confirme este endereço para concluir a troca do e-mail da sua conta no RAITec App.",
    actionLabel: "Confirmar novo e-mail",
    url,
    outro: "O link expira em 1 hora. Se você não pediu esta troca, ignore este e-mail.",
  });
}
