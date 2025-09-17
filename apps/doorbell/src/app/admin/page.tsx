"use client";

import {
  withCpfPermission,
  DefaultUnauthorizedComponent,
} from "@/components/hoc/withPermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

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

interface AdminPageProps {
  user: User;
}

// Página de administração - só para CPFs específicos
function AdminPage({ user }: AdminPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">
            👑 Painel de Administração
          </h1>
          <p className="text-gray-600">
            Bem-vindo ao painel administrativo, {user.name}!
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Estatísticas</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total de Usuários:</span>
                <span className="font-semibold">42</span>
              </div>
              <div className="flex justify-between">
                <span>Campainhas Tocadas Hoje:</span>
                <span className="font-semibold">15</span>
              </div>
              <div className="flex justify-between">
                <span>Endereços Cadastrados:</span>
                <span className="font-semibold">38</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">👤 Seu Acesso</h2>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Nome:</strong> {user.name}
              </p>
              <p>
                <strong>CPF:</strong> {user.cpf}
              </p>
              <p>
                <strong>Nível:</strong> Administrador
              </p>
              <p>
                <strong>Endereço ID:</strong> {user.addressId}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                variant="destructive"
                size="sm"
              >
                🚪 Sair
              </Button>
            </div>
          </Card>

          <Card className="p-6 md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">
              ⚙️ Ações Administrativas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline">📋 Listar Usuários</Button>
              <Button variant="outline">📊 Relatórios</Button>
              <Button variant="outline">🔧 Configurações</Button>
              <Button variant="outline">📱 Push Notifications</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Exportar página protegida - só para CPFs específicos de administradores
export default withCpfPermission(
  AdminPage,
  [
    "12345678900", // João Silva (exemplo)
    "98765432100", // Outro admin (exemplo)
  ],
  {
    redirectTo: "/auth/login",
    unauthorizedComponent: DefaultUnauthorizedComponent,
  }
);

