import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/eixos", "/minha-area", "/diretoria", "/inventario", "/avaliacao"];

/**
 * Next.js 16 Proxy — verificação otimista de presença do cookie de sessão do Better Auth.
 * Só barra rotas protegidas sem cookie. A presença do cookie NÃO prova sessão válida (pode estar
 * expirada/revogada), então o redirecionamento de quem já está logado em `/login`/`/cadastro` é feito
 * pelo layout `(auth)`, que valida a sessão no banco — evitando loop `/login` ↔ `/dashboard`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtected && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
