import { PrismaClient } from "@prisma/client";

// Singleton do Prisma Client para evitar múltiplas conexões
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getActiveSubscriptions(addressId?: number) {
  console.log(`🔍 getActiveSubscriptions chamada com addressId: ${addressId}`);

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

    console.log(`📊 Total subscriptions no banco: ${dbSubscriptions.length}`);

    // Converter para formato esperado pelas APIs existentes
    const result = dbSubscriptions.map((sub) => ({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dhKey,
        auth: sub.authKey,
      },
    }));

    console.log(`📊 Resultado final: ${result.length} subscriptions ativas`);

    for (const [index, sub] of dbSubscriptions.entries()) {
      console.log(
        `✅ Subscription ${index + 1}: AddressId ${sub.addressId}, Endpoint: ${sub.endpoint.substring(0, 50)}...`
      );
    }

    return result;
  } catch (error) {
    console.error("❌ Erro ao buscar subscriptions do banco:", error);
    return [];
  }
}

export async function saveSubscription(
  userId: number,
  addressId: number,
  subscription: any
) {
  console.log(
    `💾 Salvando subscription no banco para userId: ${userId}, addressId: ${addressId}`
  );

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
      console.log("✅ Subscription já existe no banco - atualizando...");

      const updated = await prisma.pushSubscription.update({
        where: { endpoint },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Subscription atualizada: ID ${updated.id}`);
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

    console.log(`✅ Nova subscription criada: ID ${newSubscription.id}`);
    return newSubscription;
  } catch (error) {
    console.error("❌ Erro ao salvar subscription no banco:", error);
    throw error;
  }
}

export async function cleanupOldSubscriptions(addressId: number) {
  console.log(`🧹 Limpando subscriptions antigas para addressId: ${addressId}`);

  try {
    // Buscar todas as subscriptions do endereço ordenadas por data
    const allSubscriptions = await prisma.pushSubscription.findMany({
      where: { addressId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    console.log(
      `📊 Total de subscriptions ativas para addressId ${addressId}: ${allSubscriptions.length}`
    );

    // Se tiver mais de 5, marcar as mais antigas como inativas
    if (allSubscriptions.length >= 5) {
      const toDeactivate = allSubscriptions.slice(4); // Manter apenas os 4 mais recentes + 1 nova

      console.log(
        `🗑️ Desativando ${toDeactivate.length} subscriptions antigas`
      );

      for (const sub of toDeactivate) {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });

        console.log(
          `❌ Subscription desativada: ID ${sub.id}, Endpoint: ${sub.endpoint.substring(0, 30)}...`
        );
      }
    }

    console.log(
      `✅ Limpeza concluída - máximo 5 subscriptions ativas mantidas`
    );
  } catch (error) {
    console.error("❌ Erro na limpeza de subscriptions:", error);
  }
}
