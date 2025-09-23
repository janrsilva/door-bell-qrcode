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
    "VAPID keys não configuradas! Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no .env.local",
  );
}

webpush.setVapidDetails(
  "mailto:seu-email@exemplo.com",
  vapidPublicKey,
  vapidPrivateKey,
);

// Subscriptions são gerenciadas pelo subscription-service

export async function POST(req: NextRequest) {
  // Definir variáveis no escopo principal
  let targetAddressId: number | null = null;
  let subscriptions: any[] = [];

  try {
    const { visitUuid, coords } = await req.json();

    if (!visitUuid) {
      return NextResponse.json(
        { error: "visitUuid é obrigatório" },
        { status: 400 },
      );
    }

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
            { status: 404 },
          );
        }

        // Verificar se a visita expirou
        const now = new Date();
        const expiredAt = new Date(
          visit.createdAt.getTime() + DOORBELL_VISIT_EXPIRY_TIME_MS,
        );

        if (now > expiredAt) {
          return NextResponse.json(
            {
              error:
                "Esta visita expirou. Por favor, escaneie o QR Code novamente.",
            },
            { status: 400 },
          );
        }
      } finally {
        await prisma.$disconnect();
      }
    } else {
    }

    // VERIFICAÇÃO DE PROXIMIDADE

    if (coords && coords.lat && coords.lon && isValidCoordinates(coords)) {
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
            visitorCoords,
          );

          if (!locationResult.isWithinRange) {
            return NextResponse.json(
              {
                error: `Muito longe! Você está a ${locationResult.distance}m do endereço. Máximo permitido: ${locationResult.maxDistance}m`,
                distance: locationResult.distance,
                maxDistance: locationResult.maxDistance,
              },
              { status: 400 },
            );
          }
        }
      } finally {
        await prisma.$disconnect();
      }
    }

    // ENVIAR PUSH NOTIFICATIONS PARA O PWA DO MORADOR
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
          }
        } finally {
          await prisma.$disconnect();
        }
      } else {
        // Para testes, usar addressId 1 por padrão
        targetAddressId = 1;
      }

      // Buscar subscriptions ativas para o endereço específico
      subscriptions = await getActiveSubscriptions(
        targetAddressId || undefined,
      );

      if (subscriptions.length > 0) {
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
            return { success: true, endpoint: subscription.endpoint };
          } catch (error: any) {
            console.error("❌ Erro ao enviar push para dispositivo:", error);

            // Se subscription expirou (410), marcar como inativa
            if (error.statusCode === 410) {
              try {
                const { PrismaClient } = await import("@prisma/client");
                const prisma = new PrismaClient();
                await prisma.pushSubscription.updateMany({
                  where: { endpoint: subscription.endpoint },
                  data: { isActive: false },
                });
                await prisma.$disconnect();
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
      }
    } catch (pushError) {
      console.error("❌ Erro no sistema de push notifications:", pushError);
      // Não falhar a requisição por causa disso
    }

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
      { status: 500 },
    );
  }
}
