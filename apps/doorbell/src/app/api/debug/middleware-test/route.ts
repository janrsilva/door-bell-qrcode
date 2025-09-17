import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-helpers";

export const runtime = "nodejs";

// Esta API será automaticamente protegida pelo middleware
export async function GET(req: NextRequest) {
  try {
    console.log("🔍 === TESTE DO MIDDLEWARE ===");

    // Usar NextAuth
    const authUser = await getAuthUserFromRequest(req);

    if (!authUser) {
      console.log("❌ Usuário não autenticado");
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    console.log("✅ Usuário autenticado via NextAuth:", authUser);

    return NextResponse.json({
      success: true,
      middleware: {
        authHeader: !!req.headers.get("authorization"),
        userId: authUser.userId,
        addressId: authUser.addressId,
        addressUuid: authUser.addressUuid,
        cpf: authUser.cpf,
      },
      message: "Middleware funcionando corretamente com NextAuth",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Erro no teste middleware:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
