import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// EXCEÇÕES - APIs que NÃO precisam de autenticação (mais seguro!)
const unprotectedApiRoutes = [
  "/api/auth/", // NextAuth APIs (login, session, etc.)
  "/api/register", // Cadastro de novos usuários
  "/api/create-visit", // Criar visita (visitantes)
  "/api/qr", // Gerar QR codes (visitantes)
  "/api/pdf", // Gerar PDFs (visitantes)
  "/api/visit", // Buscar dados de visita (visitantes)
  "/api/ring", // Tocar campainha (visitantes)
  "/api/waitlist", // Lista de espera (pública)
];

// APIs que PRECISAM de autenticação (protegidas automaticamente):
// - /api/notifications/subscribe (configurar push)
// - /api/user/profile (perfil do usuário)
// - /api/admin/stats (estatísticas admin)
// - /api/debug/subscriptions (debug subscriptions)

// PÁGINAS que NÃO precisam de autenticação
const unprotectedPages = [
  "/", // Home page
  "/cadastro", // Registro de usuários
  "/auth/login", // Login NextAuth
  "/auth/error", // Erro NextAuth
  "/use", // Páginas de visitantes
  "/v", // Páginas de visitantes (alternativa)
];

// PÁGINAS que PRECISAM de autenticação (protegidas pelo HOC):
// - /resident (morador - withAuthUser)
// - /admin (administradores - withCpfPermission)
// - /teste-campainha (usuários logados - withAuth)
// - /exemplo-protegida (exemplo - withAuth)

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/manifest") ||
      pathname.startsWith("/sw.js") ||
      pathname.startsWith("/sounds/") ||
      pathname.startsWith("/icons/") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const isUnprotectedPage = unprotectedPages.some((route) =>
      pathname.startsWith(route),
    );

    if (isUnprotectedPage) {
      return NextResponse.next();
    }

    const isUnprotectedApi = unprotectedApiRoutes.some((route) =>
      pathname.startsWith(route),
    );

    if (isUnprotectedApi) {
      return NextResponse.next();
    }

    // OTIMIZAÇÃO: Injetar dados do usuário nos headers para APIs
    const response = NextResponse.next();

    if (pathname.startsWith("/api/") && req.nextauth.token) {
      response.headers.set(
        "x-user-id",
        req.nextauth.token.userId?.toString() || "",
      );
      response.headers.set("x-user-cpf", req.nextauth.token.cpf || "");
      response.headers.set(
        "x-address-id",
        req.nextauth.token.addressId?.toString() || "",
      );
      response.headers.set(
        "x-address-uuid",
        String(req.nextauth.token.addressUuid || ""),
      );
      response.headers.set("x-user-name", req.nextauth.token.name || "");
      response.headers.set("x-user-email", req.nextauth.token.email || "");
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        if (
          pathname.startsWith("/_next/") ||
          pathname.startsWith("/favicon") ||
          pathname.startsWith("/manifest") ||
          pathname.startsWith("/sw.js") ||
          pathname.startsWith("/sounds/") ||
          pathname.startsWith("/icons/") ||
          pathname.includes(".")
        ) {
          return true;
        }

        const isUnprotectedPage = unprotectedPages.some((route) =>
          pathname.startsWith(route),
        );
        if (isUnprotectedPage) return true;

        const isUnprotectedApi = unprotectedApiRoutes.some((route) =>
          pathname.startsWith(route),
        );
        if (isUnprotectedApi) return true;

        const isAuthenticated = !!token;

        return isAuthenticated;
      },
    },
    pages: {
      signIn: "/auth/login",
      error: "/auth/error",
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
