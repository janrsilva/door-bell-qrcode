"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ComponentType } from "react";
import { Card } from "@/components/ui/card";

interface WithAuthOptions {
  redirectTo?: string;
  loadingComponent?: ComponentType;
}

// HOC para proteger páginas que precisam de autenticação
export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const { redirectTo = "/auth/login", loadingComponent: LoadingComponent } =
    options;

  return function AuthenticatedComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
      // Se não está carregando e não tem sessão, redirecionar
      if (status === "unauthenticated") {
        const currentUrl = window.location.pathname;
        const loginUrl = `${redirectTo}?callbackUrl=${encodeURIComponent(currentUrl)}`;
        router.push(loginUrl);
      }
    }, [status, router]);

    // Loading state
    if (status === "loading") {
      if (LoadingComponent) {
        return <LoadingComponent />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              🔐 Verificando autenticação...
            </h2>
            <p className="text-gray-600">
              Aguarde enquanto validamos suas credenciais
            </p>
          </Card>
        </div>
      );
    }

    // Not authenticated
    if (status === "unauthenticated") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              🔒 Acesso Restrito
            </h2>
            <p className="text-gray-600 mb-4">Redirecionando para o login...</p>
            <div className="animate-pulse bg-blue-200 h-2 rounded"></div>
          </Card>
        </div>
      );
    }

    // Authenticated - render the wrapped component with session data
    if (session?.user) {
      return <WrappedComponent {...props} user={session.user} />;
    }

    return null;
  };
}

// HOC específico para páginas que precisam de dados do usuário
export function withAuthUser<P extends object>(
  WrappedComponent: ComponentType<P & { user: any }>,
  options: WithAuthOptions = {}
) {
  return withAuth(WrappedComponent, options);
}

// Componente de loading customizável
export const DefaultAuthLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <Card className="p-8 text-center max-w-md">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">🔔 QR Doorbell</h2>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Verificando autenticação...
      </h3>
      <p className="text-gray-600 text-sm">
        Aguarde enquanto validamos suas credenciais
      </p>
      <div className="mt-4 bg-blue-100 rounded-full h-2 overflow-hidden">
        <div className="bg-blue-600 h-full rounded-full animate-pulse"></div>
      </div>
    </Card>
  </div>
);

// Hook personalizado para usar dados do usuário autenticado
export function useAuthUser() {
  const { data: session, status } = useSession();

  return {
    user: session?.user || null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  };
}

