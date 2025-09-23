import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { getActiveSubscriptions } from "@/lib/services/subscription-service";

// Configurar VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails(
  "mailto:your-email@domain.com",
  vapidPublicKey,
  vapidPrivateKey,
);

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.json();

    const { visitId, signal, targetType } = requestBody;

    if (!visitId || !signal || !targetType) {
      return NextResponse.json(
        { error: "Missing visitId, signal, or targetType" },
        { status: 400 },
      );
    }

    let targetAddressId: number;

    if (targetType === "visitor") {
      // Para enviar para visitante, buscar subscription temporária
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const visitorResponse = await fetch(
        `${baseUrl}/api/visitor-subscribe?visitId=${visitId}`,
      );

      if (!visitorResponse.ok) {
        return NextResponse.json({
          success: false,
          error: "Visitor subscription not found",
        });
      }

      const visitorData = await visitorResponse.json();
      const subscriptions = [visitorData.subscription];

      // Payload para sinalização WebRTC (silencioso)
      const payload = JSON.stringify({
        title: "WebRTC Signal",
        body: `Signal: ${signal.type}`,
        visitId: visitId,
        timestamp: Date.now(),
        type: "webrtc_signal",
        webrtc: signal,
        silent: true,
      });

      // Enviar para visitante
      try {
        await webpush.sendNotification(subscriptions[0], payload);

        return NextResponse.json({
          success: true,
          message: "WebRTC signal sent to visitor",
          details: { visitId, signalType: signal.type },
        });
      } catch (error: any) {
        console.error("❌ Erro ao enviar para visitante:", error);
        return NextResponse.json({
          success: false,
          error: error.message,
        });
      }
    } else {
      // Para enviar para morador (resident)
      const { prisma } = await import("@/lib/db");

      const visit = await prisma.doorbellVisit.findUnique({
        where: { uuid: visitId },
        include: {
          address: true,
        },
      });

      if (!visit || !visit.address) {
        return NextResponse.json({ error: "Visit not found" }, { status: 404 });
      }

      targetAddressId = visit.addressId; // Corrigido: usar visit.addressId diretamente
    }

    // Buscar subscriptions para este endereço
    const subscriptions = await getActiveSubscriptions(targetAddressId);

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No subscriptions found for this address",
      });
    }

    // Payload para sinalização WebRTC (não mostra notificação, só envia dados)
    const payload = JSON.stringify({
      title: "WebRTC Signal", // Título interno
      body: `Signal: ${signal.type}`,
      visitId: visitId,
      timestamp: Date.now(),
      type: "webrtc_signal", // Tipo específico para sinalização
      webrtc: signal,
      silent: true, // Não mostrar notificação visual
    });

    // Enviar para todos os dispositivos
    const pushPromises = subscriptions.map(async (subscription: any) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return { success: true, endpoint: subscription.endpoint };
      } catch (error: any) {
        console.error("❌ Erro ao enviar sinal WebRTC:", error.message);
        console.error("❌ Status code:", error.statusCode);
        console.error("❌ Detalhes:", error);

        // Se subscription expirou (410), marcar como inativa
        if (error.statusCode === 410) {
          try {
            const { prisma } = await import("@/lib/db");
            await prisma.pushSubscription.updateMany({
              where: { endpoint: subscription.endpoint },
              data: { isActive: false },
            });
          } catch (dbError) {
            console.error(
              "❌ Erro ao marcar subscription como inativa:",
              dbError,
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
    });

    const results = await Promise.allSettled(pushPromises);
    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;

    return NextResponse.json({
      success: true,
      message: `WebRTC signal sent to ${successful} devices`,
      details: {
        visitId,
        signalType: signal.type,
        targetAddressId,
        devicesNotified: successful,
        totalDevices: subscriptions.length,
      },
    });
  } catch (error: any) {
    console.error("❌ === ERRO GERAL NO ENDPOINT WEBRTC-SIGNAL ===");
    console.error("❌ Tipo do erro:", typeof error);
    console.error("❌ Nome do erro:", error.name);
    console.error("❌ Mensagem do erro:", error.message);
    console.error("❌ Stack trace:", error.stack);
    console.error("❌ Erro completo:", error);

    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
