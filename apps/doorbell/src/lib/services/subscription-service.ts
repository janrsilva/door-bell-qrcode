import type { PushSubscription as PushSubscriptionModel } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function getActiveSubscriptions(
  addressId?: number,
): Promise<WebPushSubscription[]> {
  try {
    const where = {
      isActive: true,
      ...(addressId && { addressId }),
    };

    const dbSubscriptions = await prisma.pushSubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5, // Apenas os 5 mais recentes
    });

    // Converter para formato esperado pelas APIs existentes
    const result = dbSubscriptions.map((sub: PushSubscriptionModel) => ({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dhKey,
        auth: sub.authKey,
      },
    }));

    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar subscriptions do banco:", error);
    return [];
  }
}

export async function saveSubscription(
  userId: number,
  addressId: number,
  subscription: any,
) {
  try {
    // Extrair chaves da subscription
    const endpoint = subscription.endpoint;
    const p256dhKey = subscription.keys.p256dh;
    const authKey = subscription.keys.auth;

    // Verificar se já existe subscription com este endpoint
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      const updated = await prisma.pushSubscription.update({
        where: { endpoint },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
      });

      return updated;
    }

    // Antes de criar nova, limpar subscriptions antigas para manter apenas 5
    await cleanupOldSubscriptions(addressId);

    // Criar nova subscription
    const newSubscription = await prisma.pushSubscription.create({
      data: {
        userId,
        addressId,
        endpoint,
        p256dhKey,
        authKey,
        isActive: true,
      },
    });

    return newSubscription;
  } catch (error) {
    console.error("❌ Erro ao salvar subscription no banco:", error);
    throw error;
  }
}

export async function cleanupOldSubscriptions(addressId: number) {
  try {
    // Buscar todas as subscriptions do endereço ordenadas por data
    const allSubscriptions = await prisma.pushSubscription.findMany({
      where: { addressId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    // Se tiver mais de 5, marcar as mais antigas como inativas
    if (allSubscriptions.length >= 5) {
      const toDeactivate = allSubscriptions.slice(4); // Manter apenas os 4 mais recentes + 1 nova

      for (const sub of toDeactivate) {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      }
    }
  } catch (error) {
    console.error("❌ Erro na limpeza de subscriptions:", error);
  }
}
