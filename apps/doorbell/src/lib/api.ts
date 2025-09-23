/**
 * Serviço centralizado de API com autenticação automática
 */

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean; // Por padrão, tenta usar auth se disponível
}

interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

class ApiService {
  private static baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  /**
   * Rotas que NÃO precisam de autenticação
   */
  private static publicRoutes = [
    "/api/auth/", // NextAuth APIs (login, session, etc.)
    "/api/register",
    "/api/ring",
    "/api/qr",
    "/api/pdf",
    "/api/create-visit",
    "/api/visit",
    "/api/debug", // APIs de debug são públicas
  ];

  /**
   * Verifica se uma rota precisa de autenticação
   */
  private static needsAuth(url: string): boolean {
    return !this.publicRoutes.some((route) => url.startsWith(route));
  }

  /**
   * Obtém o token de autenticação (NextAuth usa cookies automaticamente)
   */
  private static getAuthToken(): string | null {
    // NextAuth gerencia autenticação via cookies de sessão
    // Não precisamos de tokens manuais
    return null;
  }

  /**
   * Método principal para fazer requests
   */
  static async request<T = any>(
    url: string,
    options: ApiOptions = {},
  ): Promise<ApiResponse<T>> {
    try {
      const {
        method = "GET",
        body,
        headers = {},
        requireAuth = this.needsAuth(url),
      } = options;

      // Preparar headers
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...headers,
      };

      // NextAuth gerencia autenticação automaticamente via cookies
      // Não precisamos adicionar tokens manualmente
      if (requireAuth) {
      }

      // Fazer a requisição
      let response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      // Se 401, NextAuth redirecionará automaticamente para login
      if (response.status === 401 && requireAuth) {
      }

      // Parsear resposta
      let data: T;
      try {
        data = await response.json();
      } catch (parseError) {
        data = null as T;
      }

      const result: ApiResponse<T> = {
        ok: response.ok,
        status: response.status,
        data,
        error: !response.ok
          ? (data as any)?.error || `HTTP ${response.status}`
          : undefined,
      };

      if (!response.ok) {
        console.error(`❌ API Error: ${result.error}`);
      } else {
      }

      return result;
    } catch (error: any) {
      console.error("❌ Network/Request Error:", error);
      return {
        ok: false,
        status: 0,
        data: null as T,
        error: `Network error: ${error.message}`,
      };
    }
  }

  /**
   * Métodos de conveniência
   */
  static get<T = any>(url: string, options: Omit<ApiOptions, "method"> = {}) {
    return this.request<T>(url, { ...options, method: "GET" });
  }

  static post<T = any>(
    url: string,
    body?: any,
    options: Omit<ApiOptions, "method" | "body"> = {},
  ) {
    return this.request<T>(url, { ...options, method: "POST", body });
  }

  static put<T = any>(
    url: string,
    body?: any,
    options: Omit<ApiOptions, "method" | "body"> = {},
  ) {
    return this.request<T>(url, { ...options, method: "PUT", body });
  }

  static delete<T = any>(
    url: string,
    options: Omit<ApiOptions, "method"> = {},
  ) {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }

  /**
   * Métodos específicos para APIs comuns
   */

  // Autenticação gerenciada pelo NextAuth

  // Notificações
  static subscribeNotifications(subscription: any) {
    return this.post("/api/notifications/subscribe", { subscription });
  }

  // Campainha
  static ringBell(visitUuid: string, coords?: any) {
    return this.post(
      "/api/ring",
      { visitUuid, coords },
      { requireAuth: false },
    );
  }

  // Usuário
  static getUserProfile() {
    return this.get("/api/user/profile");
  }

  // Debug APIs
  static debugSubscriptions() {
    return this.get("/api/debug/subscriptions", { requireAuth: false });
  }

  static debugMiddleware() {
    return this.get("/api/debug/middleware-test");
  }

  static testRealPush(addressId: number) {
    return this.post(
      "/api/debug/test-real-push",
      { addressId },
      { requireAuth: false },
    );
  }

  static ringDirect() {
    return this.post("/api/debug/ring-direct", {}, { requireAuth: false });
  }

  // Cadastro
  static register(userData: any) {
    return this.post("/api/register", userData, { requireAuth: false });
  }

  // Stats
  static getAdminStats() {
    return this.get("/api/admin/stats");
  }
}

export default ApiService;
