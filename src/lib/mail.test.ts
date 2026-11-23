import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { getMailDriver, sendMail, sendMailSafely } from "./mail";
import { resetPasswordEmail, verificationEmail } from "./mail-templates";

const message = { to: "ana@raitec.ufc.br", subject: "Assunto", html: "<p>Oi</p>", text: "Oi" };
const originalFetch = globalThis.fetch;
const originalEnv = { key: process.env.RESEND_API_KEY, from: process.env.MAIL_FROM };

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test_123";
  process.env.MAIL_FROM = "RAITec App <nao-responda@raitec.test>";
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnv("RESEND_API_KEY", originalEnv.key);
  restoreEnv("MAIL_FROM", originalEnv.from);
});

function mockFetch(status: number, body = "{}") {
  const fn = mock(async (_url: string | URL | Request, _init?: RequestInit) => new Response(body, { status }));
  globalThis.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("driver Resend", () => {
  test("testes sempre usam o driver em memória", () => {
    expect(getMailDriver()).toBe("memory");
  });

  test("envia para a API do Resend com Bearer e o corpo esperado", async () => {
    const fetchMock = mockFetch(200, '{"id":"abc"}');
    await sendMail(message, "resend");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch não foi chamado");
    const [url, init = {}] = call;
    expect(String(url)).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_123");
    expect(JSON.parse(String(init.body))).toEqual({
      from: "RAITec App <nao-responda@raitec.test>",
      to: ["ana@raitec.ufc.br"],
      subject: "Assunto",
      html: "<p>Oi</p>",
      text: "Oi",
    });
  });

  test("falha clara sem RESEND_API_KEY, sem chamar a API", async () => {
    const fetchMock = mockFetch(200);
    delete process.env.RESEND_API_KEY;
    await expect(sendMail(message, "resend")).rejects.toThrow("RESEND_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("resposta de erro do Resend vira exceção; a variante segura só registra e devolve false", async () => {
    mockFetch(422, '{"message":"domínio não verificado"}');
    await expect(sendMail(message, "resend")).rejects.toThrow("Resend respondeu 422");

    const errorLog = mock(() => {});
    const originalError = console.error;
    console.error = errorLog;
    try {
      expect(await sendMailSafely(message, "resend")).toBe(false);
      expect(errorLog).toHaveBeenCalled();
      expect(String(errorLog.mock.calls[0])).not.toContain("re_test_123");
    } finally {
      console.error = originalError;
    }
  });
});

describe("templates", () => {
  test("escapam HTML do nome e incluem o link em HTML e texto", () => {
    const url = "http://localhost:3000/api/auth/verify-email?token=abc&callbackURL=%2Fverificar-email";
    const mail = verificationEmail({ email: "x@raitec.ufc.br", name: "<script>alert(1)</script>" }, url);

    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("token=abc&amp;callbackURL");
    expect(mail.text).toContain(url);
  });

  test("e-mail de redefinição avisa sobre expiração e uso único", () => {
    const mail = resetPasswordEmail({ email: "x@raitec.ufc.br", name: "Ana" }, "http://x/reset");
    expect(mail.subject).toBe("Redefinição de senha do RAITec App");
    expect(mail.text).toContain("expira em 1 hora");
  });
});
