import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Usar mesmo singleton do subscription-service
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("🔍 === DEBUG SUBSCRIPTIONS (BANCO) ===");

    try {
      const allSubscriptions = await prisma.pushSubscription.findMany({
        include: {
          user: {
            select: { name: true, cpf: true },
          },
          address: {
            select: { street: true, number: true, addressUuid: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      console.log(
        `📊 Total subscriptions no banco: ${allSubscriptions.length}`
      );

      // Formatar dados para debug
      const formattedSubs = allSubscriptions.map((sub) => ({
        id: sub.id,
        addressId: sub.addressId,
        userId: sub.userId,
        userName: sub.user.name,
        userCpf: sub.user.cpf,
        addressInfo: `${sub.address.street}, ${sub.address.number}`,
        addressUuid: sub.address.addressUuid,
        isActive: sub.isActive,
        createdAt: sub.createdAt,
        endpoint: sub.endpoint.substring(0, 50) + "...",
      }));

      // Agrupar por addressId
      const byAddress = formattedSubs.reduce(
        (acc, sub) => {
          if (!acc[sub.addressId]) {
            acc[sub.addressId] = [];
          }
          acc[sub.addressId].push(sub);
          return acc;
        },
        {} as Record<string, any[]>
      );

      // Estatísticas por endereço
      const stats = Object.entries(byAddress).map(([addressId, subs]) => ({
        addressId: parseInt(addressId),
        total: subs.length,
        active: subs.filter((s) => s.isActive).length,
        latest: subs[0]?.createdAt,
      }));

      console.log("📋 Subscriptions por endereço:", stats);

      return NextResponse.json({
        success: true,
        total: allSubscriptions.length,
        active: allSubscriptions.filter((s) => s.isActive).length,
        subscriptions: formattedSubs,
        byAddress,
        stats,
        debug: {
          source: "database",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (dbError) {
      console.error("❌ Erro na query do banco:", dbError);
      throw dbError;
    }
  } catch (error: any) {
    console.error("❌ Erro no debug de subscriptions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
