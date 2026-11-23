import { beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { session, user } from "@/db/schema";
import { resetTestDatabase } from "@/db/seed";
import { SEED_PASSWORD } from "@/db/seed-data";
import { getMember, getProfile } from "@/lib/api";
import { auth } from "@/lib/auth";
import { clearOutbox, getOutbox } from "@/lib/mail";

/** Login real (cookie assinado do Better Auth), como o navegador faria. */
async function login(email: string, password = SEED_PASSWORD) {
  const res = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const cookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { headers: new Headers({ cookie }), sessionToken: res.response.token, userId: res.response.user.id };
}

async function apiError(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (error) {
    return error as { statusCode?: number; body?: { code?: string; message?: string } };
  }
}

async function userRow(email: string) {
  const [row] = await db.select().from(user).where(eq(user.email, email));
  return row;
}

function linkFrom(to: string) {
  const mail = getOutbox().findLast((m) => m.to === to);
  const match = mail?.text.match(/\/api\/auth\/verify-email\?token=([^&\s]+)/);
  if (!match?.[1]) throw new Error(`Nenhum link de verificação enviado para ${to}.`);
  return decodeURIComponent(match[1]);
}

beforeEach(async () => {
  await resetTestDatabase();
  clearOutbox();
});

describe("segurança: campos protegidos não mudam por /update-user", () => {
  test.each([
    ["eixo", { eixo: "tecnologias-saude" }],
    ["time", { time: "processos" }],
    ["eixo e time juntos", { eixo: "tecnologias-saude", time: "processos" }],
    ["papel", { role: "diretoria" }],
    ["pontuação", { score: 999 }],
    ["verificationRequired", { verificationRequired: false }],
  ])("membro não consegue alterar %s do próprio cadastro", async (_label, body) => {
    const { headers } = await login("bruno@raitec.ufc.br");
    const error = await apiError(() => auth.api.updateUser({ body: body as never, headers }));

    expect(error?.statusCode).toBe(400);
    expect(await userRow("bruno@raitec.ufc.br")).toMatchObject({
      role: "membro",
      eixo: "inovacao",
      time: "midias",
    });
  });
});

describe("nome e avatar", () => {
  test("nome é salvo sem espaços nas pontas; nome curto é rejeitado mesmo via API direta", async () => {
    const { headers } = await login("bruno@raitec.ufc.br");

    await auth.api.updateUser({ body: { name: "  Bruno Lima Souza  " }, headers });
    expect((await userRow("bruno@raitec.ufc.br"))?.name).toBe("Bruno Lima Souza");

    const error = await apiError(() => auth.api.updateUser({ body: { name: "B" }, headers }));
    expect(error?.statusCode).toBe(400);
    expect((await userRow("bruno@raitec.ufc.br"))?.name).toBe("Bruno Lima Souza");
  });

  test("avatar aceita só https; vazio remove; aparece no Member", async () => {
    const { headers } = await login("bruno@raitec.ufc.br");

    for (const bad of ["http://exemplo.com/a.png", "javascript:alert(1)", "não é url"]) {
      expect((await apiError(() => auth.api.updateUser({ body: { image: bad }, headers })))?.statusCode).toBe(400);
    }

    await auth.api.updateUser({ body: { image: "https://exemplo.com/bruno.png" }, headers });
    expect((await getMember("m2"))?.avatarUrl).toBe("https://exemplo.com/bruno.png");

    await auth.api.updateUser({ body: { image: "" }, headers });
    expect((await userRow("bruno@raitec.ufc.br"))?.image).toBeNull();
  });
});

describe("troca de senha", () => {
  test("senha atual errada é recusada", async () => {
    const { headers } = await login("bruno@raitec.ufc.br");
    const error = await apiError(() =>
      auth.api.changePassword({ body: { currentPassword: "errada123", newPassword: "novaSenha123" }, headers }),
    );
    expect(error?.body?.code).toBe("INVALID_PASSWORD");
  });

  test("troca a senha, encerra as outras sessões e emite um cookie novo para o aparelho atual", async () => {
    const other = await login("bruno@raitec.ufc.br");
    const current = await login("bruno@raitec.ufc.br");

    // Com `revokeOtherSessions`, o Better Auth revoga todas as sessões e cria uma nova para quem trocou a senha.
    const res = await auth.api.changePassword({
      body: { currentPassword: SEED_PASSWORD, newPassword: "novaSenha123", revokeOtherSessions: true },
      headers: current.headers,
      returnHeaders: true,
    });
    const freshCookie = res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");

    expect(await auth.api.getSession({ headers: other.headers })).toBeNull();
    expect((await auth.api.getSession({ headers: new Headers({ cookie: freshCookie }) }))?.user.email).toBe(
      "bruno@raitec.ufc.br",
    );
    expect((await login("bruno@raitec.ufc.br", "novaSenha123")).userId).toBe("m2");
    expect(await apiError(() => login("bruno@raitec.ufc.br"))).not.toBeNull();
  });
});

describe("troca de e-mail", () => {
  test("conta verificada: aprova no e-mail atual, confirma no novo, e só então troca", async () => {
    const { headers } = await login("bruno@raitec.ufc.br");
    await auth.api.changeEmail({ body: { newEmail: "bruno.novo@raitec.ufc.br", callbackURL: "/perfil" }, headers });

    // 1ª etapa: só o endereço atual recebe e-mail; nada mudou ainda.
    expect(getOutbox().map((m) => m.to)).toEqual(["bruno@raitec.ufc.br"]);
    expect(getOutbox()[0]?.subject).toContain("Confirme a troca");
    expect((await userRow("bruno@raitec.ufc.br"))?.id).toBe("m2");

    await auth.api.verifyEmail({ query: { token: linkFrom("bruno@raitec.ufc.br") } });

    // 2ª etapa: link para o novo endereço, com o template de "novo e-mail".
    const second = getOutbox().findLast((m) => m.to === "bruno.novo@raitec.ufc.br");
    expect(second?.subject).toContain("novo e-mail");
    expect((await userRow("bruno@raitec.ufc.br"))?.id).toBe("m2");

    await auth.api.verifyEmail({ query: { token: linkFrom("bruno.novo@raitec.ufc.br") } });
    expect(await userRow("bruno@raitec.ufc.br")).toBeUndefined();
    expect(await userRow("bruno.novo@raitec.ufc.br")).toMatchObject({ id: "m2", emailVerified: true });
  });

  test("e-mail já usado por outra conta: resposta neutra, nenhum envio e nada muda", async () => {
    const { headers } = await login("bruno@raitec.ufc.br");
    await auth.api.changeEmail({ body: { newEmail: "ana@raitec.ufc.br" }, headers });

    expect(getOutbox()).toHaveLength(0);
    expect((await userRow("bruno@raitec.ufc.br"))?.id).toBe("m2");
    expect((await userRow("ana@raitec.ufc.br"))?.id).toBe("m1");
  });

  test("conta antiga sem e-mail verificado recebe o link direto no endereço novo", async () => {
    await db.update(user).set({ emailVerified: false }).where(eq(user.id, "m2"));
    const { headers } = await login("bruno@raitec.ufc.br");

    await auth.api.changeEmail({ body: { newEmail: "bruno.novo@raitec.ufc.br" }, headers });
    expect(getOutbox().map((m) => m.to)).toEqual(["bruno.novo@raitec.ufc.br"]);

    await auth.api.verifyEmail({ query: { token: linkFrom("bruno.novo@raitec.ufc.br") } });
    expect((await userRow("bruno.novo@raitec.ufc.br"))?.id).toBe("m2");
  });
});

describe("sessões ativas", () => {
  test("lista só as sessões do próprio membro, marca a atual e encerra as outras", async () => {
    await login("bruno@raitec.ufc.br");
    const current = await login("bruno@raitec.ufc.br");
    await login("ana@raitec.ufc.br");

    const [currentRow] = await db.select().from(session).where(eq(session.token, current.sessionToken));
    const bruno = await getMember("m2");
    if (!bruno || !currentRow) throw new Error("fixture");

    const before = await getProfile(bruno, currentRow.id);
    expect(before.emailVerified).toBe(true);
    expect(before.sessions).toHaveLength(2);
    expect(before.sessions[0]).toMatchObject({ id: currentRow.id, current: true });

    await auth.api.revokeOtherSessions({ headers: current.headers });

    const after = await getProfile(bruno, currentRow.id);
    expect(after.sessions.map((s) => s.id)).toEqual([currentRow.id]);
    expect(await db.select().from(session).where(eq(session.userId, "m1"))).toHaveLength(1);
  });
});
