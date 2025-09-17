import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthUserFromRequest } from "@/lib/auth-helpers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    console.log("👤 === API USER PROFILE INICIADA ===");

    // Obter dados do usuário da sessão NextAuth
    const authUser = await getAuthUserFromRequest(req);

    if (!authUser) {
      console.log("❌ Token inválido ou ausente");
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    console.log(`✅ Usuário autenticado:`, {
      userId: authUser.userId,
      addressId: authUser.addressId,
      cpf: authUser.cpf,
    });

    const prisma = new PrismaClient();

    try {
      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        include: {
          address: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Usuário não encontrado" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          cpf: user.cpf,
          address: user.address,
        },
        metadata: {
          requestUserId: authUser.userId,
          requestAddressId: authUser.addressId,
          requestCpf: authUser.cpf,
          timestamp: new Date().toISOString(),
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error: any) {
    console.error("Erro na API de perfil:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
