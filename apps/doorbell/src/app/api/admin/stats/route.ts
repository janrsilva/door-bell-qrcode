import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthUserFromRequest } from "@/lib/auth-helpers";

export const runtime = "nodejs";

// 🔐 Esta API será AUTOMATICAMENTE PROTEGIDA pelo middleware
// Não está na lista unprotectedApiRoutes, então exige autenticação

export async function GET(req: NextRequest) {
  try {
    // Obter dados do usuário da sessão NextAuth
    const authUser = await getAuthUserFromRequest(req);

    if (!authUser) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const prisma = new PrismaClient();

    try {
      // Buscar estatísticas do sistema
      const stats = await Promise.all([
        prisma.user.count(),
        prisma.address.count(),
        prisma.doorbellVisit.count(),
        prisma.doorbellVisit.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            address: {
              select: {
                street: true,
                number: true,
                city: true,
              },
            },
          },
        }),
      ]);

      const [totalUsers, totalAddresses, totalVisits, recentVisits] = stats;

      return NextResponse.json({
        success: true,
        stats: {
          totalUsers,
          totalAddresses,
          totalVisits,
          totalRings: totalVisits, // Por enquanto, considerar todas as visitas como "rings"
          ringRate: "100.0", // Simplificado para o exemplo
        },
        recentVisits: recentVisits.map((visit) => ({
          id: visit.id,
          uuid: visit.uuid,
          createdAt: visit.createdAt,
          address: visit.address,
        })),
        metadata: {
          requestUserId: authUser.userId,
          requestAddressId: authUser.addressId,
          requestCpf: authUser.cpf,
          timestamp: new Date().toISOString(),
          note: "🔐 Esta API foi automaticamente protegida pelo middleware!",
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error: any) {
    console.error("Erro na API de stats:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
