"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface User {
  id: number;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  addressId: number;
  address: {
    id: number;
    addressUuid: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface WithPermissionsOptions {
  redirectTo?: string;
  loadingComponent?: ComponentType;
  unauthorizedComponent?: ComponentType<{ user: User | null }>;
  checkPermission?: (user: User) => boolean;
  requiredAddressId?: number;
  allowedCpfs?: string[];
}

// HOC avançado para verificar permissões específicas
export function withPermissions<P extends object>(
  WrappedComponent: ComponentType<P & { user: User }>,
  options: WithPermissionsOptions = {}
) {
  const {
    redirectTo = "/auth/login",
    loadingComponent: LoadingComponent,
    unauthorizedComponent: UnauthorizedComponent,
    checkPermission,
    requiredAddressId,
    allowedCpfs,
  } = options;

  return function PermissionProtectedComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
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
              🔐 Verificando permissões...
            </h2>
          </Card>
        </div>
      );
    }

    // Not authenticated
    if (status === "unauthenticated") {
      return null; // Will redirect
    }

    const user = session?.user as User;

    // Check permissions
    if (user) {
      let hasPermission = true;

      // Verificar função customizada de permissão
      if (checkPermission && !checkPermission(user)) {
        hasPermission = false;
      }

      // Verificar endereço específico
      if (requiredAddressId && user.addressId !== requiredAddressId) {
        hasPermission = false;
      }

      // Verificar CPFs permitidos
      if (allowedCpfs && !allowedCpfs.includes(user.cpf)) {
        hasPermission = false;
      }

      // Se não tem permissão, mostrar componente de não autorizado
      if (!hasPermission) {
        if (UnauthorizedComponent) {
          return <UnauthorizedComponent user={user} />;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="p-8 text-center max-w-md">
              <div className="text-6xl mb-4">🚫</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Acesso Negado
              </h2>
              <p className="text-gray-600 mb-6">
                Você não tem permissão para acessar esta página.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => router.back()}
                  variant="outline"
                  className="w-full"
                >
                  ← Voltar
                </Button>
                <Button onClick={() => router.push("/")} className="w-full">
                  🏠 Ir para Home
                </Button>
              </div>
            </Card>
          </div>
        );
      }

      // Tem permissão - renderizar componente
      return <WrappedComponent {...props} user={user} />;
    }

    return null;
  };
}

// HOC específico para verificar se o usuário é do endereço correto
export function withAddressPermission<P extends object>(
  WrappedComponent: ComponentType<P & { user: User }>,
  addressId: number,
  options: Omit<WithPermissionsOptions, "requiredAddressId"> = {}
) {
  return withPermissions(WrappedComponent, {
    ...options,
    requiredAddressId: addressId,
  });
}

// HOC específico para verificar CPFs autorizados
export function withCpfPermission<P extends object>(
  WrappedComponent: ComponentType<P & { user: User }>,
  allowedCpfs: string[],
  options: Omit<WithPermissionsOptions, "allowedCpfs"> = {}
) {
  return withPermissions(WrappedComponent, {
    ...options,
    allowedCpfs,
  });
}

// Exemplo de componente personalizado para não autorizado
export const DefaultUnauthorizedComponent = ({
  user,
}: {
  user: User | null;
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
    <Card className="p-8 text-center max-w-lg">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
      <p className="text-gray-600 mb-4">
        Olá {user?.name}, você não tem permissão para acessar esta área.
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Seu endereço:</strong> {user?.address.street},{" "}
          {user?.address.number}
          <br />
          <strong>Cidade:</strong> {user?.address.city}, {user?.address.state}
        </p>
      </div>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => window.history.back()} variant="outline">
          ← Voltar
        </Button>
        <Button onClick={() => (window.location.href = "/")}>🏠 Home</Button>
      </div>
    </Card>
  </div>
);

