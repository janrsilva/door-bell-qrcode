import { NextRequest, NextResponse } from "next/server";
import { getActiveSubscriptions } from "@/lib/services/subscription-service";
import { PrismaClient } from "@prisma/client";
import { DOORBELL_VISIT_EXPIRY_TIME_MS } from "@/lib/constants";
import {
  checkLocationProximity,
  isValidCoordinates,
  type Coordinates,
} from "@/lib/utils/latlong";
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

console.log("🔑 VAPID Keys configuradas:");
console.log("  - Public:", vapidPublicKey.substring(0, 20) + "...");
console.log("  - Private:", vapidPrivateKey.substring(0, 20) + "...");

webpush.setVapidDetails(
  "mailto:seu-email@exemplo.com",
  vapidPublicKey,
  vapidPrivateKey
);

// Subscriptions são gerenciadas pelo subscription-service

export async function POST(req: NextRequest) {
  // Definir variáveis no escopo principal
  let targetAddressId: number | null = null;
  let subscriptions: any[] = [];

  try {
    const { visitUuid, coords } = await req.json();

    console.log("🔔 === API RING INICIADA ===");
    console.log("📋 Dados recebidos:", { visitUuid, coords });

    if (!visitUuid) {
      return NextResponse.json(
        { error: "visitUuid é obrigatório" },
        { status: 400 }
      );
    }

    console.log("✅ visitUuid válido:", visitUuid);

    // Para teste, permitir visitUuid que começam com "test-"
    const isTestRing = visitUuid.startsWith("test-");

    if (!isTestRing) {
      // Validar visita real usando Prisma diretamente na API
      const prisma = new PrismaClient();

      try {
        const visit = await prisma.doorbellVisit.findUnique({
          where: { uuid: visitUuid },
        });

        if (!visit) {
          return NextResponse.json(
            { error: "Visita não encontrada" },
            { status: 404 }
          );
        }

        // Verificar se a visita expirou
        const now = new Date();
        const expiredAt = new Date(
          visit.createdAt.getTime() + DOORBELL_VISIT_EXPIRY_TIME_MS
        );

        if (now > expiredAt) {
          return NextResponse.json(
            {
              error:
                "Esta visita expirou. Por favor, escaneie o QR Code novamente.",
            },
            { status: 400 }
          );
        }

        console.log("✅ Visita validada:", visitUuid);
      } finally {
        await prisma.$disconnect();
      }
    } else {
      console.log("🧪 Toque de teste detectado:", visitUuid);
    }

    // VERIFICAÇÃO DE PROXIMIDADE
    console.log("📍 === VERIFICANDO LOCALIZAÇÃO ===");

    if (coords && coords.lat && coords.lon && isValidCoordinates(coords)) {
      console.log("📍 Coordenadas do visitante recebidas:", coords);

      // Buscar coordenadas do endereço
      const prisma = new PrismaClient();

      try {
        const visit = await prisma.doorbellVisit.findUnique({
          where: { uuid: visitUuid },
          include: { address: true },
        });

        if (visit?.address.latitude && visit?.address.longitude) {
          const addressCoords: Coordinates = {
            lat: visit.address.latitude,
            lon: visit.address.longitude,
          };

          const visitorCoords: Coordinates = {
            lat: coords.lat,
            lon: coords.lon,
          };

          const locationResult = checkLocationProximity(
            addressCoords,
            visitorCoords
          );

          console.log("📏 Verificação de proximidade:", {
            addressCoords,
            visitorCoords,
            distance: locationResult.distance,
            isWithinRange: locationResult.isWithinRange,
            maxDistance: locationResult.maxDistance,
          });

          if (!locationResult.isWithinRange) {
            return NextResponse.json(
              {
                error: `Muito longe! Você está a ${locationResult.distance}m do endereço. Máximo permitido: ${locationResult.maxDistance}m`,
                distance: locationResult.distance,
                maxDistance: locationResult.maxDistance,
              },
              { status: 400 }
            );
          }

          console.log(
            `✅ Localização válida: ${locationResult.distance}m (dentro do limite de ${locationResult.maxDistance}m)`
          );
        } else {
          console.log(
            "⚠️ Endereço sem coordenadas cadastradas - pulando verificação de proximidade"
          );
        }
      } finally {
        await prisma.$disconnect();
      }
    } else {
      console.log(
        "⚠️ Coordenadas do visitante não fornecidas - pulando verificação de proximidade"
      );
    }

    console.log("✅ === VALIDAÇÃO CONCLUÍDA ===");
    console.log("🔔 Campainha tocada para visit:", visitUuid);

    // ENVIAR PUSH NOTIFICATIONS PARA O PWA DO MORADOR
    console.log("📡 === INICIANDO SISTEMA DE PUSH NOTIFICATIONS ===");
    try {
      // Buscar o endereço da visita para filtrar subscriptions

      if (!isTestRing) {
        // Para visitas reais, buscar o addressId da visita
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient();

        try {
          const visit = await prisma.doorbellVisit.findUnique({
            where: { uuid: visitUuid },
            include: { address: true },
          });

          if (visit) {
            targetAddressId = visit.addressId;
            console.log(`📍 Visita encontrada - AddressId: ${targetAddressId}`);
            console.log(
              `🏠 Endereço: ${visit.address.street}, ${visit.address.number}`
            );
          } else {
            console.log(
              "❌ Visita não encontrada no banco para UUID:",
              visitUuid
            );
          }
        } finally {
          await prisma.$disconnect();
        }
      } else {
        // Para testes, usar addressId 1 por padrão
        targetAddressId = 1;
        console.log("🧪 Teste - usando addressId padrão: 1");
      }

      // Buscar subscriptions ativas para o endereço específico
      subscriptions = await getActiveSubscriptions(
        targetAddressId || undefined
      );

      console.log(
        `📡 Enviando push para ${subscriptions.length} dispositivos (addressId: ${targetAddressId})...`
      );

      if (subscriptions.length === 0) {
        console.log("⚠️ NENHUMA SUBSCRIPTION ENCONTRADA!");
        console.log("🔍 Debug subscriptions store:");

        // Debug: listar todas as subscriptions
        const allSubscriptions = await getActiveSubscriptions();
        console.log(
          `📊 Total de subscriptions no sistema: ${allSubscriptions.length}`
        );

        if (allSubscriptions.length > 0) {
          console.log("📋 Subscriptions disponíveis:");
          // Usar o store diretamente para debug
          const subscriptionsStore = (global as any).subscriptionsStore;
          if (subscriptionsStore) {
            for (const [id, data] of subscriptionsStore.entries()) {
              console.log(
                `  - ID: ${id}, AddressId: ${data.addressId}, Active: ${data.isActive}`
              );
            }
          }
        }
      }

      if (subscriptions.length > 0) {
        console.log(
          `📡 === PREPARANDO ENVIO PARA ${subscriptions.length} DISPOSITIVOS ===`
        );
        console.log("🎯 Target AddressId:", targetAddressId);

        const payload = JSON.stringify({
          title: "🔔 Campainha Tocando!",
          body: "Alguém está na sua porta",
          visitId: visitUuid,
          timestamp: Date.now(),
          coords: coords,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          sound: "/sounds/doorbell.mp3", // Som personalizado da campainha
          vibrate: [1000, 500, 1000, 500, 1000],
          requireInteraction: true,
          actions: [
            { action: "answer", title: "📞 Atender" },
            { action: "ignore", title: "🔇 Ignorar" },
          ],
        });

        // Enviar para todos os dispositivos
        const pushPromises = subscriptions.map(async (subscription: any) => {
          try {
            await webpush.sendNotification(subscription, payload);
            console.log(
              "✅ Push enviado para:",
              subscription.endpoint.substring(0, 30) + "..."
            );
            return { success: true, endpoint: subscription.endpoint };
          } catch (error: any) {
            console.error("❌ Erro ao enviar push para dispositivo:", error);

            // Se subscription expirou (410), marcar como inativa
            if (error.statusCode === 410) {
              console.log(
                "🗑️ Subscription expirada - marcando como inativa:",
                subscription.endpoint.substring(0, 30) + "..."
              );
              try {
                const { PrismaClient } = await import("@prisma/client");
                const prisma = new PrismaClient();
                await prisma.pushSubscription.updateMany({
                  where: { endpoint: subscription.endpoint },
                  data: { isActive: false },
                });
                await prisma.$disconnect();
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
        });

        const results = await Promise.allSettled(pushPromises);
        const successful = results.filter(
          (r) => r.status === "fulfilled" && r.value.success
        ).length;

        console.log(`📊 === RESULTADO PUSH NOTIFICATIONS ===`);
        console.log(
          `✅ Enviadas com sucesso: ${successful}/${subscriptions.length}`
        );

        if (successful === 0) {
          console.log("❌ NENHUMA NOTIFICAÇÃO FOI ENVIADA COM SUCESSO!");
          console.log("🔍 Verifique se as VAPID keys estão corretas");
          console.log("🔍 Verifique se o Service Worker está funcionando");
        }
      } else {
        console.log("⚠️ === NENHUMA SUBSCRIPTION ATIVA ENCONTRADA ===");
        console.log("🔍 Motivos possíveis:");
        console.log("  - Usuário não configurou notificações");
        console.log("  - AddressId não bate com as subscriptions");
        console.log("  - Subscriptions expiraram ou foram removidas");
      }
    } catch (pushError) {
      console.error("❌ Erro no sistema de push notifications:", pushError);
      // Não falhar a requisição por causa disso
    }

    console.log("Doorbell ring:", {
      visitUuid,
      coords,
      timestamp: new Date().toISOString(),
    });

    console.log("🎉 === API RING FINALIZADA COM SUCESSO ===");

    return NextResponse.json({
      success: true,
      message: "Campainha tocada com sucesso",
      timestamp: new Date().toISOString(),
      debug: {
        visitUuid,
        targetAddressId,
        subscriptionsFound: subscriptions?.length || 0,
      },
    });
  } catch (e: any) {
    console.error("API Ring: Error:", e);
    return NextResponse.json(
      { error: e?.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}
