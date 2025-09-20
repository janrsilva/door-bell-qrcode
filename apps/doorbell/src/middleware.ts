import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 🔓 EXCEÇÕES - APIs que NÃO precisam de autenticação (mais seguro!)
const unprotectedApiRoutes = [
  "/api/auth/", // NextAuth APIs (login, session, etc.)
  "/api/register", // Cadastro de novos usuários
  "/api/create-visit", // Criar visita (visitantes)
  "/api/qr", // Gerar QR codes (visitantes)
  "/api/pdf", // Gerar PDFs (visitantes)
  "/api/visit", // Buscar dados de visita (visitantes)
  "/api/ring", // Tocar campainha (visitantes)
];

// 🔐 APIs que PRECISAM de autenticação (protegidas automaticamente):
// - /api/notifications/subscribe (configurar push)
// - /api/user/profile (perfil do usuário)
// - /api/admin/stats (estatísticas admin)
// - /api/debug/* (debug APIs)

// 🔓 PÁGINAS que NÃO precisam de autenticação
const unprotectedPages = [
  "/", // Home page
  "/cadastro", // Registro de usuários
  "/auth/login", // Login NextAuth
  "/auth/error", // Erro NextAuth
  "/use", // Páginas de visitantes
  "/v", // Páginas de visitantes (alternativa)
  "/campainha-tocada", // Confirmação pós-campainha
];

// 🔐 PÁGINAS que PRECISAM de autenticação (protegidas pelo HOC):
// - /atendimento (morador - withAuthUser)
// - /admin (administradores - withCpfPermission)
// - /teste-campainha (usuários logados - withAuth)
// - /exemplo-protegida (exemplo - withAuth)

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    console.log(`🛡️ NextAuth Middleware executando para: ${pathname}`);

    // ✅ Permitir arquivos estáticos
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/manifest") ||
      pathname.startsWith("/sw.js") ||
      pathname.startsWith("/sounds/") ||
      pathname.startsWith("/icons/") ||
      pathname.includes(".")
    ) {
      console.log(`📁 Arquivo estático permitido: ${pathname}`);
      return NextResponse.next();
    }

    // ✅ Permitir páginas não protegidas
    const isUnprotectedPage = unprotectedPages.some((route) =>
      pathname.startsWith(route)
    );

    if (isUnprotectedPage) {
      console.log(`🔓 Página não protegida: ${pathname}`);
      return NextResponse.next();
    }

    // ✅ Permitir APIs não protegidas
    const isUnprotectedApi = unprotectedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isUnprotectedApi) {
      console.log(`🔓 API não protegida: ${pathname}`);
      return NextResponse.next();
    }

    console.log(`✅ Usuário autenticado acessando: ${pathname}`);
    console.log(`👤 NextAuth Token:`, {
      userId: req.nextauth.token?.userId,
      cpf: req.nextauth.token?.cpf,
      addressId: req.nextauth.token?.addressId,
    });

    // 💡 OTIMIZAÇÃO: Injetar dados do usuário nos headers para APIs
    const response = NextResponse.next();

    if (pathname.startsWith("/api/") && req.nextauth.token) {
      response.headers.set(
        "x-user-id",
        req.nextauth.token.userId?.toString() || ""
      );
      response.headers.set("x-user-cpf", req.nextauth.token.cpf || "");
      response.headers.set(
        "x-address-id",
        req.nextauth.token.addressId?.toString() || ""
      );
      response.headers.set(
        "x-address-uuid",
        String(req.nextauth.token.addressUuid || "")
      );
      response.headers.set("x-user-name", req.nextauth.token.name || "");
      response.headers.set("x-user-email", req.nextauth.token.email || "");

      console.log(`🔧 Headers injetados para API: ${pathname}`);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // ✅ Sempre permitir arquivos estáticos
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

        // ✅ Permitir páginas não protegidas
        const isUnprotectedPage = unprotectedPages.some((route) =>
          pathname.startsWith(route)
        );
        if (isUnprotectedPage) return true;

        // ✅ Permitir APIs não protegidas
        const isUnprotectedApi = unprotectedApiRoutes.some((route) =>
          pathname.startsWith(route)
        );
        if (isUnprotectedApi) return true;

        // 🔐 Para rotas protegidas, exigir token válido
        const isAuthenticated = !!token;
        console.log(
          `🔐 Verificando autorização para ${pathname}: ${isAuthenticated ? "✅ Autorizado" : "❌ Negado"}`
        );

        return isAuthenticated;
      },
    },
    pages: {
      signIn: "/auth/login",
      error: "/auth/error",
    },
  }
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
