import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/auth-helpers";

export const runtime = "nodejs";

// Esta API deve ser automaticamente protegida
export async function GET(req: NextRequest) {
  console.log("🧪 === API TEST MIDDLEWARE ===");

  // Usar NextAuth
  const authUser = await getAuthUserFromRequest(req);

  if (!authUser) {
    console.log("❌ Usuário não autenticado");
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  console.log("✅ Usuário autenticado via NextAuth:", authUser);

  return NextResponse.json({
    success: true,
    message: "API test funcionando com NextAuth",
    middleware: {
      authHeader: !!req.headers.get("authorization"),
      userId: authUser.userId,
      addressId: authUser.addressId,
      addressUuid: authUser.addressUuid,
      cpf: authUser.cpf,
    },
    timestamp: new Date().toISOString(),
  });
}
