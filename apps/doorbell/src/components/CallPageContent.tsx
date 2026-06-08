"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAutoSubscription } from "@/hooks/useAutoSubscription";
import {
  playSound,
  unlockAudio,
  getSoundConfig,
  isAudioUnlocked,
  stopSound,
} from "@/lib/sound";
// import { webRTCService } from "@/lib/services/webrtc-service"; // REMOVIDO
import VoiceCallFirebase from "@/components/voice-call-firebase";
import AvailableCalls from "@/components/available-calls";
import { openDoorbellPrintPage } from "@/lib/doorbell-print";
import { onValue, ref } from "firebase/database";
import { getFirebaseRealtimeDatabase } from "@/lib/firebase-client";
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
      complement?: string | null;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
}

type BrowserPermissionState =
  | PermissionState
  | NotificationPermission
  | "unsupported"
  | "unavailable";

type PermissionStatusMap = {
  location: BrowserPermissionState;
  camera: BrowserPermissionState;
  microphone: BrowserPermissionState;
  notifications: BrowserPermissionState;
};

type PermissionRow = {
  icon: string;
  title: string;
  state: BrowserPermissionState | "ready" | "blocked";
  description: string;
  action: React.ReactNode;
};

const DEFAULT_PERMISSION_STATUS: PermissionStatusMap = {
  location: "unavailable",
  camera: "unavailable",
  microphone: "unavailable",
  notifications: "unavailable",
};

const LATEST_RING_VISIBLE_MS = 60 * 1000;

export function CallPageContent({ user }: CallPageContentProps) {
  const [isOnline, setIsOnline] = useState(true);
  const deferredPromptRef = useRef<any>(null);
  const [pwaUpdateAvailable, setPwaUpdateAvailable] = useState(false);
  const [pwaUpdateRegistration, setPwaUpdateRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  // Hook para configuração automática de subscriptions
  const {
    isConfiguring: isAutoConfiguring,
    isConfigured: notificationsConfigured,
    error: subscriptionError,
    configure: configureNotifications,
  } = useAutoSubscription();

  // Status PWA
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [latestRing, setLatestRing] = useState<{
    visitUuid: string;
    createdAt: string;
  } | null>(null);
  const [isSoundReady, setIsSoundReady] = useState(false);
  const [soundWarning, setSoundWarning] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatusMap>(
    DEFAULT_PERMISSION_STATUS,
  );
  const latestRingRef = useRef<string | null>(null);

  // Voice call states
  const [incomingVoiceCall, setIncomingVoiceCall] = useState<{
    visitId: string;
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  const [showVoiceCallDialog, setShowVoiceCallDialog] = useState(false);

  const readBrowserPermission = async (
    name: PermissionName,
  ): Promise<BrowserPermissionState> => {
    if (!("permissions" in navigator)) return "unsupported";

    try {
      const status = await navigator.permissions.query({ name });
      return status.state;
    } catch {
      return "unsupported";
    }
  };

  const refreshPermissionStatus = async () => {
    const [location, camera, microphone] = await Promise.all([
      readBrowserPermission("geolocation"),
      readBrowserPermission("camera" as PermissionName),
      readBrowserPermission("microphone" as PermissionName),
    ]);

    const notifications =
      "Notification" in window
        ? (Notification.permission as BrowserPermissionState)
        : "unsupported";

    setPermissionStatus({
      location,
      camera,
      microphone,
      notifications,
    });
    setIsSoundReady(isAudioUnlocked());
  };

  useEffect(() => {
    // Verificar se está rodando como PWA
    const checkPWA = () => {
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      const isIOSPWA = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSPWA);
    };

    checkPWA();
    refreshPermissionStatus();

    // Verificar se já foi dispensado anteriormente (expira em 7 dias)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      if (dismissedTime <= sevenDaysAgo) {
        // Expirou, remover do localStorage
        localStorage.removeItem("pwa-install-dismissed");
      }
    }

    // Subscription é gerenciada pelo hook useAutoSubscription

    // Event listener para installabilidade
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;

      // Mostrar banner se não foi dispensado e não está instalado
      if (!dismissed && !isInstalled) {
        setTimeout(() => {
          setShowInstallBanner(true);
        }, 3000); // Mostrar após 3 segundos
      }
    };

    // Event listener para instalação bem-sucedida
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      localStorage.removeItem("pwa-install-dismissed");
    };

    const handlePWAUpdateAvailable = (
      event: WindowEventMap["pwa-update-available"],
    ) => {
      setPwaUpdateAvailable(true);
      setPwaUpdateRegistration(event.detail);
    };

    // Status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener(
      "pwa-update-available",
      handlePWAUpdateAvailable,
    );
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", refreshPermissionStatus);
    document.addEventListener("visibilitychange", refreshPermissionStatus);

    // Listen for WebRTC signals from service worker
    const handleServiceWorkerMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === "WEBRTC_SIGNAL") {
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
        } else if (signal.type === "candidate") {
          // ICE candidate recebido - repassar para WebRTC service
        }
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "message",
        handleServiceWorkerMessage,
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
        window.history.replaceState({}, "", "/resident");
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
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener(
        "pwa-update-available",
        handlePWAUpdateAvailable,
      );
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", refreshPermissionStatus);
      document.removeEventListener("visibilitychange", refreshPermissionStatus);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleServiceWorkerMessage,
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!user.address.addressUuid) return;

    const db = getFirebaseRealtimeDatabase();
    const latestRingDbRef = ref(
      db,
      `addresses/${user.address.addressUuid}/latestRing`,
    );

    const unsubscribe = onValue(latestRingDbRef, async (snapshot) => {
      const ring = snapshot.val() as {
        visitUuid?: string;
        createdAt?: string;
      } | null;

      if (!ring?.visitUuid || !ring.createdAt) return;

      const ringKey = `${ring.visitUuid}:${ring.createdAt}`;
      const previousRingKey = latestRingRef.current;
      const isInitialValue = previousRingKey === null;
      const ringCreatedAtMs = Date.parse(ring.createdAt);
      const isRecentRing =
        Number.isFinite(ringCreatedAtMs) &&
        Date.now() - ringCreatedAtMs <= LATEST_RING_VISIBLE_MS;

      if (previousRingKey === ringKey) {
        return;
      }

      latestRingRef.current = ringKey;

      if (isInitialValue && !isRecentRing) {
        setLatestRing(null);
        return;
      }

      setLatestRing({
        visitUuid: ring.visitUuid,
        createdAt: ring.createdAt,
      });

      if (!isInitialValue) {
        try {
          const didPlay = await playSound("doorbell.mp3");
          setIsSoundReady(isAudioUnlocked());
          if (!didPlay) {
            setSoundWarning(
              "Som bloqueado pelo navegador. Toque em Ativar som.",
            );
          } else {
            setSoundWarning(null);
          }
        } catch (error) {
          console.error("❌ Erro ao tocar alerta em tempo real:", error);
          setSoundWarning("Som bloqueado pelo navegador. Toque em Ativar som.");
        }
      }
    });

    return () => unsubscribe();
  }, [user.address.addressUuid]);

  const installApp = async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        setShowInstallBanner(false);
      } else {
        // Usuário recusou, ocultar banner por um tempo
        setShowInstallBanner(false);
        localStorage.setItem("pwa-install-dismissed", Date.now().toString());
      }

      deferredPromptRef.current = null;
      return;
    }

    setShowInstallHelp(true);
  };

  const applyPWAUpdate = () => {
    const waitingWorker = pwaUpdateRegistration?.waiting;

    if (!waitingWorker) {
      window.location.reload();
      return;
    }

    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Voice call functions - DESABILITADO (usando voice-call-firebase agora)
  const acceptVoiceCall = async () => {
    if (!incomingVoiceCall) return;

    try {
      setShowVoiceCallDialog(false);

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

  const enableResidentSound = async () => {
    try {
      const cfg = getSoundConfig();
      const unlocked = await unlockAudio(cfg.file);
      setIsSoundReady(unlocked);
      await refreshPermissionStatus();

      if (!unlocked) {
        setSoundWarning("Som bloqueado pelo navegador. Tente tocar novamente.");
        return;
      }

      const didPlay = await playSound("doorbell.mp3");
      setSoundWarning(didPlay ? null : "Não foi possível tocar o som.");
    } catch (error) {
      console.error("❌ Erro ao testar som da campainha:", error);
      setSoundWarning("Não foi possível tocar o som.");
    }
  };

  const ignoreCurrentRing = () => {
    stopSound();
    setLatestRing(null);
    setSoundWarning(null);
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;

    await configureNotifications({ requestPermission: true });
    await refreshPermissionStatus();
  };

  const getPermissionBadgeClass = (
    state: BrowserPermissionState | "ready" | "blocked",
  ) => {
    if (state === "granted" || state === "ready") {
      return "border-green-200 bg-green-50 text-green-800";
    }

    if (state === "denied" || state === "blocked") {
      return "border-red-200 bg-red-50 text-red-800";
    }

    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  };

  const getPermissionLabel = (
    state: BrowserPermissionState | "ready" | "blocked",
  ) => {
    if (state === "granted" || state === "ready") return "Liberado";
    if (state === "denied" || state === "blocked") return "Bloqueado";
    if (state === "prompt" || state === "default") return "Pendente";
    if (state === "unsupported") return "Não suportado";
    return "Indisponível";
  };

  const permissionRows: PermissionRow[] = [
    {
      icon: "🔊",
      title: "Som",
      state: isSoundReady ? "ready" : ("blocked" as const),
      description:
        soundWarning || "Necessário para tocar a campainha com a aba aberta.",
      action: !isSoundReady ? (
        <Button onClick={enableResidentSound} size="sm">
          Ativar som
        </Button>
      ) : null,
    },
    {
      icon: "🔔",
      title: "Notificações",
      state: permissionStatus.notifications,
      description: "Necessárias para avisar quando o app estiver em segundo plano.",
      action:
        permissionStatus.notifications !== "granted" &&
        permissionStatus.notifications !== "unsupported" ? (
          <Button onClick={requestNotificationPermission} size="sm">
            Ativar
          </Button>
        ) : null,
    },
    {
      icon: "📍",
      title: "Localização",
      state: permissionStatus.location,
      description: "Usada para validar a proximidade do visitante.",
      action: null,
    },
    {
      icon: "🎙️",
      title: "Microfone",
      state: permissionStatus.microphone,
      description: "Usado na chamada de voz.",
      action: null,
    },
    {
      icon: "📷",
      title: "Câmera",
      state: permissionStatus.camera,
      description: "Usada quando a chamada com vídeo é iniciada.",
      action: null,
    },
  ];

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid =
    typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent);
  const isChrome =
    typeof navigator !== "undefined" &&
    /Chrome|CriOS/i.test(navigator.userAgent) &&
    !/Edg|OPR|Firefox/i.test(navigator.userAgent);
  const isEdge =
    typeof navigator !== "undefined" && /Edg/i.test(navigator.userAgent);
  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|CriOS|Chromium|Edg|OPR|Firefox/i.test(navigator.userAgent);

  const installHelpTitle = isIOS
    ? "Instalar no iPhone"
    : isAndroid
      ? "Instalar no Android"
      : "Instalar no computador";

  const installHelpSteps = isIOS
    ? [
        "Abra esta página no Safari.",
        "Toque em Compartilhar.",
        "Escolha Adicionar à Tela de Início.",
        "Confirme em Adicionar.",
      ]
    : isAndroid
      ? [
          "Abra esta página no Chrome.",
          "Toque no menu de três pontos.",
          "Escolha Instalar app ou Adicionar à tela inicial.",
          "Confirme a instalação.",
        ]
      : isChrome
        ? [
            "No Chrome, abra o menu de três pontos.",
            "Entre em Salvar e compartilhar.",
            "Escolha Instalar página como app.",
            "Confirme a instalação.",
          ]
        : isEdge
          ? [
              "No Edge, abra o menu de três pontos.",
              "Entre em Aplicativos.",
              "Escolha Instalar este site como aplicativo.",
              "Confirme a instalação.",
            ]
          : isSafari
            ? [
                "No Safari, abra Arquivo no menu superior.",
                "Escolha Adicionar ao Dock.",
                "Confirme o nome do app.",
                "Abra pela Dock quando precisar atender.",
              ]
            : [
                "Abra o menu principal do navegador.",
                "Procure por Instalar app, Aplicativos ou Adicionar à tela inicial.",
                "Se essa opção não existir, use Chrome ou Edge para instalar o app.",
              ];

  const setupItems = [
    {
      label: "App instalado",
      ready: isInstalled,
      detail: isInstalled
        ? "Abrindo como aplicativo."
        : isIOS
          ? "No iPhone, instale pela tela inicial."
          : "Instale para abrir rápido e manter permissões.",
    },
    {
      label: "Notificações",
      ready: notificationsConfigured,
      detail: notificationsConfigured
        ? "Push configurado para este aparelho."
        : isAutoConfiguring
          ? "Aguardando permissão do navegador."
          : subscriptionError || "Ative para receber chamadas.",
    },
    {
      label: "Som",
      ready: isSoundReady,
      detail: isSoundReady
        ? "Campainha liberada neste navegador."
        : "Toque uma vez para liberar o som.",
    },
  ];

  const readyCount = setupItems.filter((item) => item.ready).length;
  const setupComplete = readyCount === setupItems.length;

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950 sm:text-3xl">
              Painel de Atendimento
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {user.name} · {isOnline ? "online" : "offline"}
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="sm:w-auto">
            Sair
          </Button>
        </div>

        <Card className="mb-6 border-blue-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Preparação do aparelho
                </p>
                <h2 className="mt-1 text-xl font-semibold text-gray-950">
                  {setupComplete
                    ? "Este aparelho está pronto para atender."
                    : "Instale e libere alertas neste aparelho."}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-600">
                  Para o morador, o melhor uso é como app instalado: abre mais
                  rápido, mantém o painel acessível e recebe notificações quando
                  o navegador está em segundo plano.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {setupItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-md border p-3 ${
                      item.ready
                        ? "border-green-200 bg-green-50 text-green-900"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      {item.ready ? "OK" : "Pendente"} · {item.label}
                    </p>
                    <p className="mt-1 text-xs">{item.detail}</p>
                  </div>
                ))}
              </div>

              {!isInstalled && !deferredPromptRef.current && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  {isIOS
                    ? "No iPhone, a instalação fica no botão Compartilhar do Safari."
                    : isAndroid
                      ? "No Android, a instalação fica no menu de três pontos do Chrome."
                      : isChrome
                        ? "No Chrome, a instalação fica em Menu > Salvar e compartilhar > Instalar página como app."
                        : "A instalação depende do navegador. Abra o guia abaixo para ver o caminho."}
                </div>
              )}
            </div>

            <div className="flex min-w-full flex-col gap-2 lg:min-w-56">
              {!isInstalled && (
                <Button onClick={installApp} className="w-full">
                  {deferredPromptRef.current ? "Instalar app" : "Como instalar"}
                </Button>
              )}
              {!isSoundReady && (
                <Button onClick={enableResidentSound} variant="outline">
                  Ativar som
                </Button>
              )}
              {permissionStatus.notifications !== "granted" &&
                permissionStatus.notifications !== "unsupported" && (
                  <Button onClick={requestNotificationPermission} variant="outline">
                    Ativar notificações
                  </Button>
                )}
              {pwaUpdateAvailable && (
                <Button
                  onClick={applyPWAUpdate}
                  className="bg-blue-700 hover:bg-blue-800"
                >
                  Atualizar app
                </Button>
              )}
              {showInstallBanner && !isInstalled && (
                <Button
                  onClick={dismissInstallBanner}
                  variant="ghost"
                  className="text-gray-600"
                >
                  Lembrar depois
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="mb-6 p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Permissões</h2>
              <p className="text-sm text-gray-600">
                Status do navegador para campainha, chamada e notificações.
              </p>
            </div>
            <Button onClick={refreshPermissionStatus} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {permissionRows.map((item) => (
              <div
                key={item.title}
                className={`rounded-lg border p-3 ${getPermissionBadgeClass(item.state)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {item.icon} {item.title}: {getPermissionLabel(item.state)}
                    </p>
                    <p className="mt-1 text-xs">{item.description}</p>
                  </div>
                  {item.action}
                </div>
              </div>
            ))}
          </div>
        </Card>

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
              {user.address.complement && <p>{user.address.complement}</p>}
              <p>{user.address.neighborhood}</p>
              <p>
                {user.address.city}, {user.address.state}
              </p>
              <p>CEP: {user.address.zipCode}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              onClick={() =>
                openDoorbellPrintPage({
                  addressUuid: user.address.addressUuid,
                  address: user.address,
                })
              }
              variant="outline"
            >
              🖨️ Placa para imprimir
            </Button>
            <Button
              onClick={() =>
                window.open(`/v/${user.address.addressUuid}`, "_blank")
              }
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              🔔 Abrir minha campainha
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="text-red-600 hover:bg-red-50"
            >
              🚪 Sair
            </Button>
          </div>
        </Card>

        {latestRing && (
          <Card className="mb-6 border-yellow-300 bg-yellow-50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="text-3xl">🔔</div>
                <div>
                  <h2 className="text-xl font-semibold text-yellow-900">
                    Campainha tocada
                  </h2>
                  <p className="text-sm text-yellow-800">
                    Um visitante tocou a campainha agora.
                  </p>
                  <p className="mt-1 text-xs text-yellow-700">
                    {new Date(latestRing.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button
                onClick={ignoreCurrentRing}
                variant="outline"
                className="border-yellow-400 bg-white text-yellow-900 hover:bg-yellow-100"
              >
                🔕 Ignorar
              </Button>
            </div>
            <div className="mt-4 rounded-md border border-yellow-300 bg-white p-4">
              <VoiceCallFirebase
                role="resident"
                addressUuid={user.address.addressUuid}
                visitorCoords={null}
                distance={null}
                embedded
              />
            </div>
          </Card>
        )}

        {/* Available Calls */}
        <AvailableCalls
          addressUuid={user.address.addressUuid}
          onCallAccepted={(visitId: string) => {}}
        />

        {/* WebRTC Voice Call Component */}
        {!latestRing && (
          <VoiceCallFirebase
            role="resident"
            addressUuid={user.address.addressUuid}
            visitorCoords={null}
            distance={null}
          />
        )}

        {/* Voice Call Dialog */}
        <Dialog open={showInstallHelp} onOpenChange={setShowInstallHelp}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{installHelpTitle}</DialogTitle>
              <DialogDescription>
                Se o botão nativo de instalação não apareceu, use o caminho do
                navegador.
              </DialogDescription>
            </DialogHeader>

            <ol className="space-y-3 text-sm text-gray-700">
              {installHelpSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <DialogFooter>
              <Button onClick={() => setShowInstallHelp(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
