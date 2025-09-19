import { NextRequest, NextResponse } from "next/server";
import { getActiveSubscriptions } from "@/lib/services/subscription-service";
import webpush from "web-push";

export const runtime = "nodejs";

// Configurar VAPID keys
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

export async function POST() {
  try {
    console.log("🔔 === RING DIRECT PARA JOÃO SILVA ===");

    // Tocar diretamente para addressId 2 (João Silva)
    const targetAddressId = 2;
    console.log("🎯 Target AddressId fixo:", targetAddressId);

    // Buscar subscriptions
    const subscriptions = await getActiveSubscriptions(targetAddressId);

    if (subscriptions.length === 0) {
      console.log("❌ NENHUMA SUBSCRIPTION PARA ADDRESSID 2!");

      // Debug todas as subscriptions
      const allSubs = await getActiveSubscriptions();
      console.log(`📊 Total no sistema: ${allSubs.length}`);

      return NextResponse.json({
        success: false,
        error: "Nenhuma subscription encontrada para AddressId 2",
        debug: {
          targetAddressId,
          subscriptionsFound: 0,
          totalInSystem: allSubs.length,
        },
      });
    }

    console.log(`📡 Enviando para ${subscriptions.length} dispositivos...`);

    // Payload simples
    const payload = JSON.stringify({
      title: "🔔 TESTE DIRETO - Campainha!",
      body: "Teste direto para AddressId 2 (João Silva)",
      icon: "/icons/icon-192x192.png",
      sound: "/sounds/doorbell.mp3", // Som da campainha
      tag: "direct-test",
      vibrate: [1000, 500, 1000, 500, 1000],
      requireInteraction: true,
    });

    // Enviar para todas as subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription: any, index: number) => {
        try {
          console.log(`📡 [${index + 1}] Enviando...`);

          await webpush.sendNotification(subscription, payload);
          console.log(`✅ [${index + 1}] Sucesso!`);

          return { success: true };
        } catch (error: any) {
          console.error(`❌ [${index + 1}] Erro:`, error.message);
          return { success: false, error: error.message };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).success
    ).length;

    console.log(`📊 === RESULTADO DIRETO ===`);
    console.log(`✅ Sucessos: ${successful}/${subscriptions.length}`);

    return NextResponse.json({
      success: true,
      message: "Teste direto concluído",
      stats: {
        targetAddressId,
        subscriptionsFound: subscriptions.length,
        successful,
        failed: subscriptions.length - successful,
      },
    });
  } catch (error: any) {
    console.error("❌ Erro no ring direct:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
