import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getActiveSubscriptions } from "@/lib/services/subscription-service";

// Configurar VAPID keys
console.log("🔑 === CONFIGURANDO VAPID KEYS ===");
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

console.log(
  "🔑 VAPID Public Key:",
  vapidPublicKey ? vapidPublicKey.substring(0, 20) + "..." : "UNDEFINED"
);
console.log(
  "🔑 VAPID Private Key:",
  vapidPrivateKey ? vapidPrivateKey.substring(0, 20) + "..." : "UNDEFINED"
);

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error("❌ VAPID keys não encontradas!");
  throw new Error("VAPID keys não configuradas!");
}

console.log("🔑 Configurando webpush.setVapidDetails...");
webpush.setVapidDetails(
  "mailto:your-email@domain.com",
  vapidPublicKey,
  vapidPrivateKey
);
console.log("✅ VAPID configurado com sucesso");

export async function POST(req: NextRequest) {
  try {
    console.log("🚀 === INÍCIO ENDPOINT VOICE-CALL-NOTIFY ===");

    const requestBody = await req.json();
    console.log("📥 Body recebido:", JSON.stringify(requestBody, null, 2));

    const { visitId, offer } = requestBody;

    if (!visitId || !offer) {
      console.log("❌ Dados inválidos - visitId ou offer ausentes");
      return NextResponse.json(
        { error: "Missing visitId or offer" },
        { status: 400 }
      );
    }

    console.log("📞 === NOTIFICANDO CHAMADA DE VOZ ===");
    console.log("🎯 Visit ID:", visitId);
    console.log("📋 Offer type:", offer.type);
    console.log("📋 Offer SDP length:", offer.sdp ? offer.sdp.length : "N/A");

    // Buscar a visita para obter o addressId
    console.log("🔍 Importando Prisma...");
    const { prisma } = await import("@/lib/db");
    console.log("✅ Prisma importado com sucesso");

    console.log("🔍 Buscando visita no banco...");
    const visit = await prisma.doorbellVisit.findUnique({
      where: { uuid: visitId },
      include: {
        address: true,
      },
    });

    console.log(
      "📊 Resultado da busca:",
      visit
        ? {
            id: visit.id,
            uuid: visit.uuid,
            addressId: visit.addressId,
            hasAddress: !!visit.address,
          }
        : "null"
    );

    if (!visit || !visit.address) {
      console.log("❌ Visita não encontrada ou sem endereço");
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const targetAddressId = visit.addressId;
    console.log("🏠 Target AddressId:", targetAddressId);

    // Buscar subscriptions para este endereço
    console.log(`🔍 Buscando subscriptions para addressId: ${targetAddressId}`);
    const subscriptions = await getActiveSubscriptions(targetAddressId);

    console.log(`📊 Subscriptions encontradas: ${subscriptions.length}`);

    if (subscriptions.length === 0) {
      console.log("❌ Nenhuma subscription encontrada para este endereço");

      // Debug: tentar buscar todas as subscriptions
      const allSubscriptions = await getActiveSubscriptions();
      console.log(
        `🔍 Total de subscriptions no sistema: ${allSubscriptions.length}`
      );

      return NextResponse.json({
        success: false,
        error: "No subscriptions found for this address",
      });
    }

    console.log(
      `📡 Enviando notificação de chamada para ${subscriptions.length} dispositivos...`
    );

    // Log das subscriptions encontradas
    subscriptions.forEach((sub, index) => {
      console.log(
        `📋 Subscription ${index + 1}: ${sub.endpoint.substring(0, 50)}...`
      );
    });

    // Payload específico para chamada de voz - incluindo dados de sinalização WebRTC
    console.log("📦 Criando payload da notificação...");
    const payloadObject = {
      title: "📞 Chamada de Voz Recebida",
      body: "Um visitante quer falar com você",
      visitId: visitId,
      timestamp: Date.now(),
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      sound: "/sounds/doorbell.mp3",
      tag: "voice-call",
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      requireInteraction: true,
      type: "voice_call", // Tipo específico para chamadas
      // Dados de sinalização WebRTC
      webrtc: {
        type: "offer",
        sdp: offer,
        visitId: visitId,
        from: "visitor",
      },
      actions: [
        { action: "answer_call", title: "📞 Atender Chamada" },
        { action: "ignore_call", title: "❌ Ignorar" },
      ],
    };

    const payload = JSON.stringify(payloadObject);
    console.log("📦 Payload criado - tamanho:", payload.length, "bytes");
    console.log(
      "📦 Payload preview:",
      JSON.stringify(payloadObject, null, 2).substring(0, 200) + "..."
    );

    // Enviar para todos os dispositivos
    const pushPromises = subscriptions.map(
      async (subscription: any, index: number) => {
        try {
          console.log(
            `📤 Tentando enviar notificação ${index + 1}/${subscriptions.length} para:`,
            subscription.endpoint.substring(0, 50) + "..."
          );
          console.log(`📋 Payload size: ${payload.length} bytes`);

          await webpush.sendNotification(subscription, payload);
          console.log(
            "✅ Notificação de chamada enviada para:",
            subscription.endpoint.substring(0, 30) + "..."
          );
          return { success: true, endpoint: subscription.endpoint };
        } catch (error: any) {
          console.error(
            `❌ Erro ao enviar notificação de chamada ${index + 1}:`,
            error.message
          );
          console.error(`❌ Status code:`, error.statusCode);
          console.error(`❌ Detalhes do erro:`, error);

          // Se subscription expirou (410), marcar como inativa
          if (error.statusCode === 410) {
            console.log(
              "🗑️ Subscription expirada - marcando como inativa:",
              subscription.endpoint.substring(0, 30) + "..."
            );
            try {
              await prisma.pushSubscription.updateMany({
                where: { endpoint: subscription.endpoint },
                data: { isActive: false },
              });
              console.log("✅ Subscription marcada como inativa");
            } catch (dbError) {
              console.error(
                "❌ Erro ao marcar subscription como inativa:",
                dbError
              );
            }
          }

          return {
            success: false,
            error: error.message,
            endpoint: subscription.endpoint,
            statusCode: error.statusCode,
          };
        }
      }
    );

    console.log("⏳ Aguardando resultado das notificações...");
    const results = await Promise.allSettled(pushPromises);
    console.log("📊 Resultados recebidos:", results.length);

    // Log detalhado de cada resultado
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log(`📊 Resultado ${index + 1}:`, result.value);
      } else {
        console.log(`❌ Falha ${index + 1}:`, result.reason);
      }
    });

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    const failed = results.filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success)
    ).length;

    console.log(`📊 === RESULTADO NOTIFICAÇÃO CHAMADA ===`);
    console.log(
      `✅ Enviadas com sucesso: ${successful}/${subscriptions.length}`
    );
    console.log(`❌ Falharam: ${failed}/${subscriptions.length}`);

    return NextResponse.json({
      success: true,
      message: `Voice call notification sent to ${successful} devices`,
      details: {
        visitId,
        addressId: targetAddressId,
        devicesNotified: successful,
        totalDevices: subscriptions.length,
      },
    });
  } catch (error: any) {
    console.error("❌ === ERRO GERAL NO ENDPOINT ===");
    console.error("❌ Tipo do erro:", typeof error);
    console.error("❌ Nome do erro:", error.name);
    console.error("❌ Mensagem do erro:", error.message);
    console.error("❌ Stack trace:", error.stack);
    console.error("❌ Erro completo:", error);

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
