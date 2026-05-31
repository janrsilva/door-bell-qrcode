import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ApiService from "@/lib/api";

export function useAutoSubscription() {
  const { data: session } = useSession();
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false); // Controlar execução única

  useEffect(() => {
    const autoConfigureSubscriptions = async () => {
      // Só executar se usuário estiver logado E ainda não executou nesta sessão
      if (!session?.user || hasRun) return;

      // Verificar se já configurou nesta sessão
      const sessionKey = `subscription_configured_${session.user.id}`;
      const alreadyConfigured = sessionStorage.getItem(sessionKey);

      if (alreadyConfigured) {
        setIsConfigured(true);
        setHasRun(true);
        return;
      }

      try {
        setHasRun(true); // Marcar como executado
        setIsConfiguring(true);
        setError(null);

        // Verificar se navegador suporta push notifications
        if (
          !("Notification" in window) ||
          !("serviceWorker" in navigator) ||
          !("PushManager" in window)
        ) {
          // throw new Error("Navegador não suporta push notifications");
          return;
        }

        // Verificar se já tem subscription existente
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription =
          await registration.pushManager.getSubscription();

        if (existingSubscription) {
          // Salvar subscription existente no servidor

          const result =
            await ApiService.subscribeNotifications(existingSubscription);

          if (!result.ok) {
            throw new Error(
              result.error || "Erro ao salvar subscription existente",
            );
          }

          // Marcar como configurado nesta sessão
          const sessionKey = `subscription_configured_${session.user.id}`;
          sessionStorage.setItem(sessionKey, "true");

          setIsConfigured(true);
          return;
        }

        // Solicitar permissão de notificação
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
          throw new Error(`Permissão de notificação ${permission}`);
        }

        // Verificar VAPID key
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("VAPID public key não configurada");
        }

        // Cancelar subscription anterior se existir
        if (existingSubscription) {
          await (existingSubscription as any).unsubscribe();
        }

        // Criar nova subscription
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });

        // Salvar subscription no servidor
        const result = await ApiService.subscribeNotifications(subscription);

        if (!result.ok) {
          throw new Error(result.error || "Erro ao salvar subscription");
        }

        // Marcar como configurado nesta sessão
        const sessionKey = `subscription_configured_${session.user.id}`;
        sessionStorage.setItem(sessionKey, "true");

        setIsConfigured(true);
      } catch (error: any) {
        console.error("❌ Erro na auto-configuração de subscriptions:", error);
        setError(error.message);
      } finally {
        setIsConfiguring(false);
      }
    };

    // Executar com delay para garantir que o componente terminou de carregar
    const timeoutId = setTimeout(autoConfigureSubscriptions, 500);

    return () => clearTimeout(timeoutId);
  }, [session]); // Depende apenas da sessão

  return {
    isConfiguring,
    isConfigured,
    error,
  };
}
