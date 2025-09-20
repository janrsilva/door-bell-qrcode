"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import EditRegistrationForm from "@/components/EditRegistrationForm";

export default function EditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      const currentUrl = window.location.pathname;
      const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(currentUrl)}`;
      router.push(loginUrl as any);
    }
  }, [status, router]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="p-8 text-center max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            🔔 QR Doorbell
          </h2>
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

  // Authenticated - render the page content
  if (session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            ✏️ Editar Cadastro
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Atualize suas informações pessoais e de endereço
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <EditRegistrationForm userData={session.user as any} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
