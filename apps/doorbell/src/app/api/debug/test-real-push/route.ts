import { NextRequest, NextResponse } from "next/server";
import { getActiveSubscriptions } from "@/lib/services/subscription-service";
import webpush from "web-push";

export const runtime = "nodejs";

// Configurar VAPID keys (mesmo da API ring)
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  throw new Error(
    "VAPID keys não configuradas! Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no .env.local"
  );
}

webpush.setVapidDetails(
  "mailto:seu-email@exemplo.com",
  vapidPublicKey,
  vapidPrivateKey
);

export async function POST(req: NextRequest) {
  try {
    const { addressId } = await req.json();

    console.log("🧪 === TESTE REAL PUSH NOTIFICATION ===");
    console.log("🎯 Target AddressId:", addressId || "ALL");

    // Buscar subscriptions para o endereço específico
    const subscriptions = await getActiveSubscriptions(addressId);

    console.log(`📡 Subscriptions encontradas: ${subscriptions.length}`);

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Nenhuma subscription encontrada para este endereço",
        addressId,
      });
    }

    // Payload idêntico ao da API ring
    const payload = JSON.stringify({
      title: "🧪 TESTE REAL - Campainha!",
      body: "Teste de notificação real (não simulada)",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      sound: "/sounds/doorbell.mp3", // Som da campainha
      tag: "test-real-ring",
      vibrate: [1000, 500, 1000, 500, 1000],
      requireInteraction: true,
      actions: [
        { action: "answer", title: "📞 Atender" },
        { action: "ignore", title: "🔇 Ignorar" },
      ],
    });

    console.log("📤 Payload:", payload);

    // Enviar para todas as subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription: any, index: number) => {
        try {
          console.log(
            `📡 [${index + 1}] Enviando para:`,
            subscription.endpoint.substring(0, 50) + "..."
          );

          const result = await webpush.sendNotification(subscription, payload);
          console.log(`✅ [${index + 1}] Enviado com sucesso:`, result);

          return { success: true, index: index + 1 };
        } catch (error: any) {
          console.error(`❌ [${index + 1}] Erro:`, error);
          return { success: false, error: error.message, index: index + 1 };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).success
    ).length;

    console.log(`📊 === RESULTADO TESTE REAL ===`);
    console.log(`✅ Sucessos: ${successful}/${subscriptions.length}`);

    return NextResponse.json({
      success: true,
      message: "Teste real de push notification concluído",
      stats: {
        subscriptionsFound: subscriptions.length,
        successful,
        failed: subscriptions.length - successful,
      },
      results: results.map((r) => ({
        status: r.status,
        value: r.status === "fulfilled" ? r.value : null,
        reason: r.status === "rejected" ? r.reason : null,
      })),
    });
  } catch (error: any) {
    console.error("❌ Erro no teste real push:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
