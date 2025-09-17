"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ApiService from "@/lib/api";
import { useAutoSubscription } from "@/hooks/useAutoSubscription";

interface CallPageContentProps {
  user: {
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
  };
}

export function CallPageContent({ user }: CallPageContentProps) {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [isInstallable, setIsInstallable] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  // Hook para configuração automática de subscriptions
  const {
    isConfiguring: isAutoConfiguring,
    isConfigured: notificationsConfigured,
    error: subscriptionError,
  } = useAutoSubscription();

  // Status PWA
  const [isPWA, setIsPWA] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Verificar se está rodando como PWA
    const checkPWA = () => {
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)"
      ).matches;
      const isIOSPWA = (window.navigator as any).standalone === true;
      setIsPWA(isStandalone || isIOSPWA);
      setIsInstalled(isStandalone || isIOSPWA);
    };

    checkPWA();

    // Subscription é gerenciada pelo hook useAutoSubscription

    // Event listener para installabilidade
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === "accepted") {
        setIsInstallable(false);
        setIsInstalled(true);
      }

      deferredPromptRef.current = null;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/auth/login" });
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  const playRingSound = async () => {
    try {
      console.log("🔔 Testando som da campainha...");
      const audio = new Audio("/sounds/doorbell.mp3");
      audio.volume = 1.0;
      await audio.play();

      // Simular padrão de campainha (3 toques)
      for (let i = 0; i < 2; i++) {
        setTimeout(
          async () => {
            try {
              const repeatAudio = new Audio("/sounds/doorbell.mp3");
              repeatAudio.volume = 1.0;
              await repeatAudio.play();
              console.log(`🔔 Toque da campainha ${i + 2}/3`);
            } catch (e) {
              console.log(`Erro no toque ${i + 2}:`, e);
            }
          },
          (i + 1) * 2000
        );
      }

      console.log("🎵 Som da campainha reproduzido com sucesso");
    } catch (error) {
      console.error("❌ Erro ao reproduzir som da campainha:", error);
    }
  };

  const testRealPush = async () => {
    try {
      const response = await fetch("/api/debug/test-real-push", {
        method: "POST",
      });

      if (response.ok) {
        console.log("✅ Push test enviado!");
      } else {
        console.error("❌ Erro no push test:", await response.text());
      }
    } catch (error) {
      console.error("❌ Erro ao testar push:", error);
    }
  };

  const testUserProfile = async () => {
    try {
      console.log("🔍 Testando API de perfil...");
      const result = await ApiService.getUserProfile();
      if (result.ok) {
        alert(`✅ API Perfil: ${JSON.stringify(result.data, null, 2)}`);
      } else {
        alert(`❌ Erro API Perfil: ${result.error}`);
      }
    } catch (error: any) {
      console.error("❌ Erro API Perfil:", error);
      alert(`❌ Erro API Perfil: ${error.message}`);
    }
  };

  const testAdminStats = async () => {
    try {
      console.log("📊 Testando API de stats...");
      const result = await ApiService.getAdminStats();
      if (result.ok) {
        alert(`✅ API Stats: ${JSON.stringify(result.data, null, 2)}`);
      } else {
        alert(`❌ Erro API Stats: ${result.error}`);
      }
    } catch (error: any) {
      console.error("❌ Erro API Stats:", error);
      alert(`❌ Erro API Stats: ${error.message}`);
    }
  };

  const testDebugMiddleware = async () => {
    try {
      console.log("🛡️ Testando middleware...");
      const result = await ApiService.debugMiddleware();
      if (result.ok) {
        alert(`✅ Middleware: ${JSON.stringify(result.data, null, 2)}`);
      } else {
        alert(`❌ Erro Middleware: ${result.error}`);
      }
    } catch (error: any) {
      console.error("❌ Erro Middleware:", error);
      alert(`❌ Erro Middleware: ${error.message}`);
    }
  };

  const debugSubscriptions = async () => {
    try {
      console.log("🔍 Debugando subscriptions...");
      const result = await ApiService.debugSubscriptions();
      if (result.ok) {
        const data = result.data;
        console.log("📊 Debug subscriptions:", data);

        let report = `🔍 DEBUG SUBSCRIPTIONS:\n\n`;
        report += `📊 Total: ${data.total}\n\n`;

        if (data.total === 0) {
          report += `❌ NENHUMA SUBSCRIPTION ENCONTRADA!\n`;
          report += `🔧 Configure notificações no PWA primeiro.`;
        } else {
          report += `📋 Por Endereço:\n`;
          for (const [addressId, subs] of Object.entries(data.byAddress)) {
            report += `  🏠 AddressId ${addressId}: ${(subs as any[]).length} dispositivos\n`;
          }

          report += `\n🎯 Usuário atual: AddressId = ${user.addressId}\n`;

          if (data.byAddress[user.addressId.toString()]) {
            report += `✅ Encontrado ${data.byAddress[user.addressId.toString()].length} dispositivos para seu endereço`;
          } else {
            report += `❌ NENHUM dispositivo para seu endereço!`;
          }
        }

        alert(report);
      } else {
        alert(`❌ Erro ao buscar subscriptions: ${result.error}`);
      }
    } catch (error: any) {
      console.error("❌ Erro no debug:", error);
      alert(`❌ Erro: ${error.message}`);
    }
  };

  const forceUpdatePWA = async () => {
    try {
      console.log("🔄 Forçando atualização do PWA...");

      if (!("serviceWorker" in navigator)) {
        alert("❌ Service Worker não suportado neste navegador");
        return;
      }

      // Remover todos os service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`🗑️ Removendo ${registrations.length} service workers...`);

      for (const registration of registrations) {
        await registration.unregister();
        console.log("✅ Service Worker removido");
      }

      // Limpar cache
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        console.log(`🗑️ Limpando ${cacheNames.length} caches...`);

        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
          console.log(`✅ Cache removido: ${cacheName}`);
        }
      }

      // Limpar localStorage e sessionStorage relacionado ao PWA
      localStorage.removeItem("notificationsConfigured");
      sessionStorage.clear(); // Limpar controle de execução do hook
      console.log("🗑️ localStorage e sessionStorage limpos");

      alert(
        "✅ PWA atualizado! A página será recarregada em 2 segundos para aplicar as mudanças."
      );

      // Recarregar página para reinstalar SW
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("❌ Erro ao forçar atualização:", error);
      alert(`❌ Erro ao atualizar PWA: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            🔔 Painel de Atendimento
          </h1>
          <p className="mt-2 text-gray-600">
            Bem-vindo, {user.name}! Seu sistema está{" "}
            {isOnline ? "🟢 online" : "🔴 offline"}
          </p>
        </div>

        {/* User Info Card */}
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">
            👤 Informações do Usuário
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p>
                <strong>Nome:</strong> {user.name}
              </p>
              <p>
                <strong>CPF:</strong> {user.cpf}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Telefone:</strong> {user.phone}
              </p>
            </div>
            <div>
              <p>
                <strong>Endereço:</strong>
              </p>
              <p>
                {user.address.street}, {user.address.number}
              </p>
              <p>{user.address.neighborhood}</p>
              <p>
                {user.address.city}, {user.address.state}
              </p>
              <p>CEP: {user.address.zipCode}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 hover:bg-red-50"
            >
              🚪 Sair
            </Button>
          </div>
        </Card>

        {/* PWA Status Card */}
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">📱 Status do PWA</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p>
                🔧 <strong>PWA Instalado:</strong>{" "}
                {isInstalled ? "✅ Sim" : "❌ Não"}
              </p>
              <p>
                🔔 <strong>Notificações:</strong>{" "}
                {notificationsConfigured
                  ? "✅ Permitidas"
                  : subscriptionError
                    ? "❌ Negadas"
                    : "⚠️ Configurando..."}
              </p>
              <p>
                📡 <strong>Push Configurado:</strong>{" "}
                {isAutoConfiguring
                  ? "🔄 Configurando automaticamente..."
                  : notificationsConfigured
                    ? "✅ Sim"
                    : "❌ Não"}
              </p>
              {isAutoConfiguring && (
                <p className="text-sm text-blue-600">
                  🔍 Verificando subscriptions após login...
                </p>
              )}
            </div>
            <div className="space-y-2">
              {isInstallable && (
                <Button onClick={installApp} className="w-full">
                  📲 Instalar PWA
                </Button>
              )}

              {!notificationsConfigured && isAutoConfiguring && (
                <div className="w-full text-center py-2 px-4 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-blue-700 font-medium">
                    🔄 Configurando automaticamente...
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Aceite a permissão se solicitada pelo navegador
                  </p>
                </div>
              )}

              {!notificationsConfigured && !isAutoConfiguring && (
                <div className="w-full text-center py-2 px-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 font-medium">
                    ❌ Configuração automática falhou
                  </p>
                  {subscriptionError && (
                    <p className="text-xs text-red-600 mt-1">
                      Erro: {subscriptionError}
                    </p>
                  )}
                  <p className="text-xs text-red-600 mt-1">
                    Verifique as configurações de notificação do navegador
                  </p>
                </div>
              )}

              {notificationsConfigured && (
                <div className="text-center text-green-600 font-medium">
                  ✅ Sistema totalmente configurado!
                </div>
              )}

              {/* Botão de Atualização PWA */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Button
                  onClick={forceUpdatePWA}
                  variant="outline"
                  size="sm"
                  className="w-full bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                >
                  🔄 Forçar Atualização do PWA
                </Button>
                <p className="text-xs text-blue-600 mt-2 text-center">
                  Use se o som da campainha não estiver funcionando
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Test Buttons */}
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">🧪 Testes do Sistema</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Button onClick={playRingSound} variant="outline">
              🔔 Som da Campainha
            </Button>

            <Button onClick={testRealPush} variant="outline">
              🧪 Teste Real Push
            </Button>

            <Button
              onClick={() => window.open("/teste-campainha", "_blank")}
              variant="outline"
            >
              🚪 Página Visitante
            </Button>

            <Button onClick={testUserProfile} variant="outline">
              👤 API Perfil
            </Button>

            <Button onClick={testAdminStats} variant="outline">
              📊 API Stats
            </Button>

            <Button onClick={testDebugMiddleware} variant="outline">
              🛡️ Debug Middleware
            </Button>

            <Button onClick={debugSubscriptions} variant="outline">
              🔍 Debug Subscriptions
            </Button>

            <Button
              onClick={() => window.open("/api/debug/ring-direct", "_blank")}
              variant="outline"
            >
              🔔 Ring Direto
            </Button>
          </div>
        </Card>

        {/* Instructions */}
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">📋 Instruções</h2>
          <div className="space-y-3 text-gray-700">
            <p>
              1. <strong>Instale o PWA</strong> para receber notificações mesmo
              com o app fechado
            </p>
            <p>
              2. <strong>Configure as notificações</strong> para ser alertado
              quando alguém tocar a campainha
            </p>
            <p>
              3. <strong>Compartilhe o QR Code</strong> do seu endereço para que
              visitantes possam tocar sua campainha
            </p>
            <p>
              4. <strong>Mantenha o volume alto</strong> para ouvir os alertas
              de campainha
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
