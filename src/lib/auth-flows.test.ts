import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user, verification } from "@/db/schema";
import { resetTestDatabase } from "@/db/seed";
import { SEED_PASSWORD } from "@/db/seed-data";
import { auth } from "@/lib/auth";
import { clearOutbox, getOutbox } from "@/lib/mail";

const NEW_USER = {
  name: "Paula Nova",
  email: "paula@raitec.ufc.br",
  password: "senhasegura123",
  eixo: "inovacao",
  time: "midias",
};

async function signUpNewUser() {
  return auth.api.signUpEmail({ body: { ...NEW_USER, callbackURL: "/verificar-email" } });
}

async function rejects(fn: () => Promise<unknown>) {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

function lastMailTo(email: string) {
  const mail = getOutbox().findLast((m) => m.to === email);
  if (!mail) throw new Error(`Nenhum e-mail enviado para ${email}.`);
  return mail;
}

function extractVerifyToken(text: string) {
  const match = text.match(/\/api\/auth\/verify-email\?token=([^&\s]+)/);
  if (!match?.[1]) throw new Error("Link de verificação não encontrado no e-mail.");
  return decodeURIComponent(match[1]);
}

function extractResetToken(text: string) {
  const match = text.match(/\/api\/auth\/reset-password\/([^?\s]+)/);
  if (!match?.[1]) throw new Error("Link de redefinição não encontrado no e-mail.");
  return decodeURIComponent(match[1]);
}

beforeEach(async () => {
  await resetTestDatabase();
  clearOutbox();
});

describe("verificação de e-mail (só para cadastros novos)", () => {
  test("cadastro novo exige verificação e envia o link de confirmação", async () => {
    await signUpNewUser();

    const [created] = await db.select().from(user).where(eq(user.email, NEW_USER.email));
    expect(created).toMatchObject({ verificationRequired: true, emailVerified: false, role: "membro" });

    const mail = lastMailTo(NEW_USER.email);
    expect(mail.subject).toContain("Confirme seu e-mail");
    expect(mail.text).toContain("callbackURL=%2Fverificar-email");
    expect(mail.html).toContain("Confirmar e-mail");
  });

  test("link de confirmação marca o e-mail como verificado", async () => {
    await signUpNewUser();
    const token = extractVerifyToken(lastMailTo(NEW_USER.email).text);

    await auth.api.verifyEmail({ query: { token } });

    const [verified] = await db.select().from(user).where(eq(user.email, NEW_USER.email));
    expect(verified?.emailVerified).toBe(true);
  });

  test("token de confirmação adulterado é rejeitado", async () => {
    await signUpNewUser();
    expect(await rejects(() => auth.api.verifyEmail({ query: { token: "token-falso" } }))).toBe(true);

    const [pending] = await db.select().from(user).where(eq(user.email, NEW_USER.email));
    expect(pending?.emailVerified).toBe(false);
  });

  test("contas antigas (seed) não exigem verificação e continuam entrando", async () => {
    const [old] = await db.select().from(user).where(eq(user.email, "ana@raitec.ufc.br"));
    expect(old?.verificationRequired).toBe(false);

    const res = await auth.api.signInEmail({ body: { email: "ana@raitec.ufc.br", password: SEED_PASSWORD } });
    expect(res.user.email).toBe("ana@raitec.ufc.br");
  });

  test("reenvio gera um novo link para conta pendente", async () => {
    await signUpNewUser();
    clearOutbox();

    await auth.api.sendVerificationEmail({ body: { email: NEW_USER.email, callbackURL: "/verificar-email" } });

    expect(extractVerifyToken(lastMailTo(NEW_USER.email).text)).toBeTruthy();
  });
});

describe("redefinição de senha", () => {
  const email = "ana@raitec.ufc.br";
  const newPassword = "novaSenhaForte456";

  async function requestReset(target = email) {
    await auth.api.requestPasswordReset({ body: { email: target, redirectTo: "/redefinir-senha" } });
  }

  test("fluxo completo: pedido → e-mail → nova senha → login só com a nova", async () => {
    await requestReset();
    const mail = lastMailTo(email);
    expect(mail.subject).toContain("Redefinição de senha");
    expect(mail.text).toContain("callbackURL=%2Fredefinir-senha");

    await auth.api.resetPassword({ body: { newPassword, token: extractResetToken(mail.text) } });

    const ok = await auth.api.signInEmail({ body: { email, password: newPassword } });
    expect(ok.user.email).toBe(email);
    expect(await rejects(() => auth.api.signInEmail({ body: { email, password: SEED_PASSWORD } }))).toBe(true);
  });

  test("token de redefinição só pode ser usado uma vez", async () => {
    await requestReset();
    const token = extractResetToken(lastMailTo(email).text);

    await auth.api.resetPassword({ body: { newPassword, token } });
    expect(await rejects(() => auth.api.resetPassword({ body: { newPassword: "outraSenha789", token } }))).toBe(true);
  });

  test("token expirado é rejeitado e a senha não muda", async () => {
    await requestReset();
    const token = extractResetToken(lastMailTo(email).text);
    await db.update(verification).set({ expiresAt: new Date(Date.now() - 60_000) });

    expect(await rejects(() => auth.api.resetPassword({ body: { newPassword, token } }))).toBe(true);
    const ok = await auth.api.signInEmail({ body: { email, password: SEED_PASSWORD } });
    expect(ok.user.email).toBe(email);
  });

  test("redefinir a senha encerra as sessões abertas da conta", async () => {
    const before = await auth.api.signInEmail({ body: { email, password: SEED_PASSWORD } });
    expect(before.token).toBeTruthy();

    await requestReset();
    await auth.api.resetPassword({ body: { newPassword, token: extractResetToken(lastMailTo(email).text) } });

    const sessions = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${before.token}` }),
    });
    expect(sessions).toBeNull();
  });

  test("e-mail sem conta: resposta normal e nenhum envio (não revela contas)", async () => {
    await requestReset("ninguem@raitec.ufc.br");
    expect(getOutbox()).toHaveLength(0);
  });
});
