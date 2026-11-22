import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const BASE = "http://localhost:3000";
const STALE_COOKIE = "better-auth.session_token=sessao-revogada.assinatura";

function run(path: string, cookie?: string) {
  const res = proxy(new NextRequest(`${BASE}${path}`, { headers: cookie ? { cookie } : {} }));
  return { status: res.status, location: res.headers.get("location") };
}

describe("proxy", () => {
  test("anônimo em rota protegida vai para /login", () => {
    for (const path of ["/dashboard", "/eixos/inovacao", "/diretoria/membros", "/inventario/c1"]) {
      expect(run(path)).toEqual({ status: 307, location: `${BASE}/login` });
    }
  });

  test("rota protegida com cookie segue para validação no servidor", () => {
    expect(run("/dashboard", STALE_COOKIE).location).toBeNull();
  });

  test("cookie órfão em /login e /cadastro não redireciona (evita loop com /dashboard)", () => {
    expect(run("/login", STALE_COOKIE).location).toBeNull();
    expect(run("/cadastro", STALE_COOKIE).location).toBeNull();
  });

  test("rotas públicas sem cookie seguem normalmente", () => {
    expect(run("/login").location).toBeNull();
    expect(run("/cadastro").location).toBeNull();
  });
});
