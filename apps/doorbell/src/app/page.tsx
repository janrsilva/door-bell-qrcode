"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-8">
          <div className="text-6xl mb-4">🔔</div>
          <h1 className="text-3xl font-bold text-gray-800">
            Campainha Eletrônica PWA
          </h1>
          <p className="text-gray-600 mt-2">
            Sistema completo de campainha virtual com notificações push
          </p>
        </div>

        {/* Links Principais */}
        <div className="grid gap-4">
          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">📱</div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  Central de Chamadas (PWA)
                </h3>
                <p className="text-gray-600 text-sm">
                  Para moradores - receba chamadas da campainha
                </p>
              </div>
              <Button onClick={() => (window.location.href = "/atendimento")}>
                Acessar
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center space-x-4">
              <div className="text-3xl">🚪</div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Teste da Campainha</h3>
                <p className="text-gray-600 text-sm">
                  Simular visitante tocando campainha
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/teste-campainha")}
              >
                Testar
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">🔐</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Login</h3>
                  <p className="text-gray-600 text-sm">Entrar no sistema</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/auth/login")}
                >
                  Login
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">📝</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Cadastro</h3>
                  <p className="text-gray-600 text-sm">Criar nova conta</p>
                </div>
                <Button onClick={() => (window.location.href = "/cadastro")}>
                  Cadastrar
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Instruções */}
        <Card className="p-6 bg-green-50 border-green-200">
          <h3 className="font-semibold text-lg mb-4 text-green-800">
            🎯 Como Testar o Sistema Completo:
          </h3>

          <div className="space-y-4 text-sm">
            <div>
              <strong className="text-green-700">1. Login do Morador:</strong>
              <ul className="mt-1 ml-4 list-disc text-green-700">
                <li>
                  Acesse <code>/auth/login</code>
                </li>
                <li>
                  CPF: <code>123.456.789-00</code> (pode digitar com ou sem
                  máscara)
                </li>
                <li>
                  Senha: <code>123456</code>
                </li>
              </ul>
            </div>

            <div>
              <strong className="text-green-700">2. Configurar PWA:</strong>
              <ul className="mt-1 ml-4 list-disc text-green-700">
                <li>
                  Após login, acesse <code>/atendimento</code>
                </li>
                <li>Clique "Configurar Notificações"</li>
                <li>Permita notificações</li>
                <li>Instale o PWA (se aparecer opção)</li>
              </ul>
            </div>

            <div>
              <strong className="text-green-700">3. Testar Campainha:</strong>
              <ul className="mt-1 ml-4 list-disc text-green-700">
                <li>
                  Abra <code>/teste-campainha</code> em outra aba
                </li>
                <li>Clique "TOCAR CAMPAINHA"</li>
                <li>Veja se o PWA recebe a notificação!</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Funcionalidades */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">
            ✨ Funcionalidades Implementadas:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>🔐 Autenticação:</strong>
              <ul className="mt-1 ml-4 list-disc text-gray-600">
                <li>Login com CPF e senha</li>
                <li>JWT tokens seguros</li>
                <li>Proteção de rotas</li>
              </ul>
            </div>

            <div>
              <strong>📱 PWA:</strong>
              <ul className="mt-1 ml-4 list-disc text-gray-600">
                <li>Instalável na tela inicial</li>
                <li>Funciona offline</li>
                <li>Push notifications</li>
              </ul>
            </div>

            <div>
              <strong>🔔 Notificações:</strong>
              <ul className="mt-1 ml-4 list-disc text-gray-600">
                <li>Funciona com app fechado</li>
                <li>Som automático</li>
                <li>Vibração</li>
              </ul>
            </div>

            <div>
              <strong>🏠 Segurança:</strong>
              <ul className="mt-1 ml-4 list-disc text-gray-600">
                <li>Apenas seu endereço</li>
                <li>Subscriptions protegidas</li>
                <li>Tokens com expiração</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
