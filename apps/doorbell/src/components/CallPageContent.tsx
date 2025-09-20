"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ApiService from "@/lib/api";
import { useAutoSubscription } from "@/hooks/useAutoSubscription";
import { playSound, unlockAudio, getSoundConfig } from "@/lib/sound";
import PWADebug from "@/components/pwa-debug";
import { webRTCService } from "@/lib/services/webrtc-service";
import VoiceCallFirebase from "@/components/voice-call-firebase";
import AvailableCalls from "@/components/available-calls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);

  // Voice call states
  const [incomingVoiceCall, setIncomingVoiceCall] = useState<{
    visitId: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  const [showVoiceCallDialog, setShowVoiceCallDialog] = useState(false);

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

    // Verificar se já foi dispensado anteriormente (expira em 7 dias)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      if (dismissedTime > sevenDaysAgo) {
        setInstallPromptDismissed(true);
      } else {
        // Expirou, remover do localStorage
        localStorage.removeItem("pwa-install-dismissed");
      }
    }

    // Subscription é gerenciada pelo hook useAutoSubscription

    // Event listener para installabilidade
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setIsInstallable(true);

      // Mostrar banner se não foi dispensado e não está instalado
      if (!dismissed && !isInstalled) {
        setTimeout(() => {
          setShowInstallBanner(true);
        }, 3000); // Mostrar após 3 segundos
      }
    };

    // Event listener para instalação bem-sucedida
    const handleAppInstalled = () => {
      console.log("PWA instalado com sucesso");
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallBanner(false);
      localStorage.removeItem("pwa-install-dismissed");
    };

    // Status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for WebRTC signals from service worker
    const handleServiceWorkerMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === "WEBRTC_SIGNAL") {
        console.log("📞 Sinal WebRTC recebido via FCM:", event.data);

        const signal = event.data.signal;

        if (signal.type === "offer") {
          // Oferta de chamada recebida - mostrar dialog
          setIncomingVoiceCall({
            visitId: event.data.visitId,
            offer: signal.sdp,
          });
          setShowVoiceCallDialog(true);

          // Play notification sound
          try {
            const audio = new Audio("/sounds/doorbell.mp3");
            audio.volume = 0.8;
            audio.play().catch(console.error);
          } catch (error) {
            console.error("Error playing notification sound:", error);
          }
        } else if (signal.type === "answer") {
          // Resposta recebida - repassar para WebRTC service
          // TODO: Implementar se o visitante precisar receber answer
          console.log("📞 Answer recebido via FCM");
        } else if (signal.type === "candidate") {
          // ICE candidate recebido - repassar para WebRTC service
          // TODO: Implementar se necessário
          console.log("📞 ICE candidate recebido via FCM");
        }
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "message",
        handleServiceWorkerMessage
      );
    }

    // Check URL parameters for voice call from notification
    const urlParams = new URLSearchParams(window.location.search);
    const voiceCallId = urlParams.get("voiceCall");
    const webrtcParam = urlParams.get("webrtc");

    if (voiceCallId && webrtcParam) {
      try {
        const webrtcData = JSON.parse(decodeURIComponent(webrtcParam));

        if (webrtcData.type === "offer") {
          setIncomingVoiceCall({
            visitId: voiceCallId,
            offer: webrtcData.sdp,
          });
          setShowVoiceCallDialog(true);
        }

        // Clean URL
        window.history.replaceState({}, "", "/atendimento");
      } catch (error) {
        console.error("Error parsing voice call data from URL:", error);
      }
    }

    // Para iOS e navegadores que não suportam beforeinstallprompt
    // Mostrar banner após 5 segundos se não está instalado e não foi dispensado
    let fallbackTimer: NodeJS.Timeout | null = null;
    if (!isInstalled && !dismissed) {
      fallbackTimer = setTimeout(() => {
        // Verificar se ainda não está instalado e não recebeu o evento
        if (!isInstalled && !deferredPromptRef.current) {
          setShowInstallBanner(true);
        }
      }, 5000);
    }

    return () => {
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleServiceWorkerMessage
        );
      }
    };
  }, []);

  const installApp = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === "accepted") {
        setIsInstallable(false);
        setIsInstalled(true);
        setShowInstallBanner(false);
      } else {
        // Usuário recusou, ocultar banner por um tempo
        setShowInstallBanner(false);
        localStorage.setItem("pwa-install-dismissed", Date.now().toString());
        setInstallPromptDismissed(true);
      }

      deferredPromptRef.current = null;
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setInstallPromptDismissed(true);
  };

  // Voice call functions
  const acceptVoiceCall = async () => {
    if (!incomingVoiceCall) return;

    try {
      setShowVoiceCallDialog(false);

      // Callback para estado da chamada
      const onStateChange = (state: any) => {
        console.log("📞 Estado da chamada:", state);
        // TODO: Atualizar UI se necessário
      };

      // Callback para stream remoto
      const onRemoteStream = (stream: MediaStream | null) => {
        console.log("📞 Stream remoto recebido:", stream);
        // TODO: Conectar ao elemento audio se necessário
      };

      await webRTCService.acceptCall(
        incomingVoiceCall.visitId,
        incomingVoiceCall.offer,
        onStateChange,
        onRemoteStream
      );

      setIncomingVoiceCall(null);
    } catch (error) {
      console.error("Error accepting voice call:", error);
    }
  };

  const rejectVoiceCall = async () => {
    if (!incomingVoiceCall) return;

    try {
      // Send reject message via FCM
      await fetch("/api/webrtc-signal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitId: incomingVoiceCall.visitId,
          signal: {
            type: "call-reject",
            visitId: incomingVoiceCall.visitId,
            from: "resident",
          },
          targetType: "visitor",
        }),
      });

      setShowVoiceCallDialog(false);
      setIncomingVoiceCall(null);
    } catch (error) {
      console.error("Error rejecting voice call:", error);
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

      // Primeiro desbloquear áudio se necessário
      const cfg = getSoundConfig();
      unlockAudio(cfg.file);

      // Aguardar um pouco para o desbloqueio
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Tocar som usando a nova lib
      await playSound("doorbell.mp3");

      console.log("🎵 Som da campainha testado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao testar som da campainha:", error);
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
        {/* Install PWA Banner */}
        {showInstallBanner && !isInstalled && (
          <div className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 shadow-lg animate-pulse">
            <div className="flex flex-col items-start justify-start gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">📲</div>
                <div>
                  <h3 className="font-bold text-lg">
                    🚨 Instale o App da Campainha
                  </h3>
                  <p className="text-sm text-blue-100">
                    <strong>IMPORTANTE:</strong> Receba notificações mesmo com o
                    navegador fechado e tenha acesso mais rápido
                  </p>
                  {/* Instruções específicas para iOS */}
                  {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
                    <p className="text-xs text-blue-200 mt-1">
                      📱 iOS: Toque no botão "Compartilhar" e depois "Adicionar
                      à Tela de Início"
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {deferredPromptRef.current ? (
                  <Button
                    onClick={installApp}
                    className="bg-white text-blue-600 hover:bg-blue-50 font-medium"
                    size="sm"
                  >
                    📲 Instalar Agora
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      // Para iOS e outros navegadores sem suporte ao beforeinstallprompt
                      const userAgent = navigator.userAgent.toLowerCase();
                      let instructions = "";

                      if (/ipad|iphone|ipod/.test(userAgent)) {
                        instructions =
                          "📱 COMO INSTALAR NO iOS:\n\n1. Toque no botão 'Compartilhar' (quadrado com seta) na barra inferior\n2. Role para baixo e toque em 'Adicionar à Tela de Início'\n3. Toque em 'Adicionar' para confirmar\n\nApós isso, você terá o app na tela inicial!";
                      } else if (userAgent.includes("android")) {
                        instructions =
                          "📱 COMO INSTALAR NO ANDROID:\n\n1. Toque no menu (três pontos) do navegador\n2. Toque em 'Instalar app' ou 'Adicionar à tela inicial'\n3. Confirme a instalação\n\nApós isso, você terá o app na tela inicial!";
                      } else {
                        instructions =
                          "💻 COMO INSTALAR NO DESKTOP:\n\n1. Procure pelo ícone de instalação na barra de endereços\n2. OU vá no menu do navegador > 'Instalar [nome do app]'\n3. Confirme a instalação\n\nApós isso, você terá o app como aplicativo desktop!";
                      }

                      alert(instructions);
                    }}
                    className="bg-white text-blue-600 hover:bg-blue-50 font-medium"
                    size="sm"
                  >
                    📖 Como Instalar
                  </Button>
                )}
                <Button
                  onClick={dismissInstallBanner}
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                  size="sm"
                >
                  ✕
                </Button>
              </div>
            </div>
          </div>
        )}

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
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">👤 Informações do Usuário</h2>
            <Button
              onClick={() => (window.location.href = `/editar-cadastro`)}
              variant="outline"
              size="sm"
            >
              ✏️ Editar
            </Button>
          </div>
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

        {/* Available Calls */}
        <AvailableCalls
          addressUuid={user.address.addressUuid}
          onCallAccepted={(visitId) => {
            console.log("Chamada aceita:", visitId);
            // TODO: Implementar feedback visual ou notificação
          }}
        />

        {/* WebRTC Voice Call Component */}
        <VoiceCallFirebase
          addressUuid={user.address.addressUuid}
          visitorCoords={null}
          distance={null}
          role="resident"
        />

        {/* PWA Status Card */}
        <Card className="mb-6 p-6">
          <h2 className="mb-4 text-xl font-semibold">📱 Status do PWA</h2>

          {/* Banner de instalação crítico */}
          {!isInstalled &&
            !notificationsConfigured &&
            !installPromptDismissed && (
              <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-800">
                      Instalação Recomendada
                    </h3>
                    <p className="text-sm text-red-700 mb-3">
                      Para receber notificações da campainha quando o navegador
                      estiver fechado, é <strong>altamente recomendado</strong>{" "}
                      instalar o aplicativo.
                    </p>
                    <div className="flex space-x-2">
                      {deferredPromptRef.current ? (
                        <Button
                          onClick={installApp}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          📲 Instalar Agora
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            const userAgent = navigator.userAgent.toLowerCase();
                            let instructions = "";

                            if (/ipad|iphone|ipod/.test(userAgent)) {
                              instructions =
                                "📱 INSTALAR NO iOS:\n\n1. Toque no botão 'Compartilhar' (⬆️) na barra inferior\n2. Role para baixo e toque em 'Adicionar à Tela de Início'\n3. Toque em 'Adicionar'\n\n✅ O app aparecerá na sua tela inicial!";
                            } else if (userAgent.includes("android")) {
                              instructions =
                                "📱 INSTALAR NO ANDROID:\n\n1. Toque no menu (⋮) do navegador\n2. Toque em 'Instalar app' ou 'Adicionar à tela inicial'\n3. Confirme a instalação\n\n✅ O app aparecerá na sua tela inicial!";
                            } else {
                              instructions =
                                "💻 INSTALAR NO DESKTOP:\n\n1. Procure pelo ícone de instalação (⬇️) na barra de endereços\n2. OU vá no menu do navegador > 'Instalar aplicativo'\n3. Confirme a instalação\n\n✅ O app será instalado como aplicativo!";
                            }

                            alert(instructions);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          📖 Ver Instruções
                        </Button>
                      )}
                      <Button
                        onClick={dismissInstallBanner}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        size="sm"
                      >
                        Mais tarde
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

        {/* PWA Debug */}
        <PWADebug />

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

        {/* Voice Call Dialog */}
        <Dialog open={showVoiceCallDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>📞 Chamada de Voz Recebida</DialogTitle>
              <DialogDescription>
                Um visitante está tentando fazer uma chamada de voz. Deseja
                atender?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="flex items-center justify-center p-6">
                <div className="text-6xl animate-pulse">📞</div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  O visitante está no portão e gostaria de falar com você
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-row gap-2 justify-center">
              <Button
                onClick={rejectVoiceCall}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                ❌ Recusar
              </Button>
              <Button
                onClick={acceptVoiceCall}
                className="bg-green-600 hover:bg-green-700"
              >
                📞 Atender
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
