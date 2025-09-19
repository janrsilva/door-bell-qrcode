import { NextRequest, NextResponse } from "next/server";
import {
  saveSubscription,
  getActiveSubscriptions,
} from "@/lib/services/subscription-service";
import { getAuthSession } from "@/lib/auth-helpers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    console.log("🔐 === SUBSCRIPTION REQUEST ===");

    // Obter dados do usuário da sessão NextAuth
    const session = await getAuthSession();

    if (!session?.user) {
      console.log("❌ Usuário não autenticado");
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    console.log(`✅ Usuário autenticado:`, {
      userId: session.user.id,
      addressId: session.user.addressId,
      cpf: session.user.cpf,
    });

    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Subscription inválida" },
        { status: 400 }
      );
    }

    // Salvar subscription no banco com limpeza automática
    const savedSubscription = await saveSubscription(
      session.user.id,
      session.user.addressId,
      subscription
    );

    console.log("✅ Push subscription salva no banco:", {
      id: savedSubscription.id,
      endpoint: subscription.endpoint.substring(0, 50) + "...",
      addressId: session.user.addressId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: savedSubscription.id,
      message: "Subscription salva com sucesso",
    });
  } catch (error: any) {
    console.error("❌ Erro ao salvar subscription:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Buscar subscriptions do banco para o usuário
    const subscriptions = await getActiveSubscriptions(session.user.addressId);

    return NextResponse.json({
      success: true,
      total: subscriptions.length,
      subscriptions: subscriptions.map((sub, index) => ({
        id: index + 1,
        addressId: session.user.addressId,
        endpoint: sub.endpoint.substring(0, 50) + "...",
        isActive: true,
      })),
      message: `${subscriptions.length} subscriptions encontradas para seu endereço`,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar subscriptions:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
