"use client";

import { withAuth, useAuthUser } from "@/components/hoc/withAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

// Exemplo 1: Página simples protegida (sem precisar dos dados do usuário como prop)
function ExemploProtegidaPage() {
  const { user, isLoading } = useAuthUser();

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">
            🔒 Página Protegida (Exemplo)
          </h1>

          <p className="text-gray-600 mb-4">
            Esta página só pode ser acessada por usuários autenticados.
          </p>

          {user && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h2 className="font-semibold mb-2">👤 Dados do Usuário:</h2>
              <p>
                <strong>Nome:</strong> {user.name}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>CPF:</strong> {user.cpf}
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={() => window.history.back()} variant="outline">
              ← Voltar
            </Button>

            <Button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              variant="destructive"
            >
              🚪 Sair
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Exportar com HOC - esta página será protegida automaticamente
export default withAuth(ExemploProtegidaPage, {
  redirectTo: "/auth/login",
});

