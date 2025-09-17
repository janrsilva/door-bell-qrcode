import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionsStore } from "@/lib/services/subscription-service";
import { getAuthSession } from "@/lib/auth-helpers";

export const runtime = "nodejs";

const subscriptions = getSubscriptionsStore();

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

    // Gerar ID único para a subscription
    const subscriptionId = `addr_${session.user.addressId}_${Date.now()}`;

    // Salvar subscription (em produção, salvar no banco)
    subscriptions.set(subscriptionId, {
      subscription,
      addressId: session.user.addressId,
      userId: session.user.id,
      addressUuid: session.user.addressUuid,
      cpf: session.user.cpf,
      createdAt: new Date(),
      isActive: true,
    });

    console.log("✅ Push subscription salva:", {
      id: subscriptionId,
      endpoint: subscription.endpoint.substring(0, 50) + "...",
      addressId: session.user.addressId,
      userId: session.user.id,
      addressUuid: session.user.addressUuid,
    });

    console.log("📊 Total de subscriptions ativas:", subscriptions.size);

    return NextResponse.json({
      success: true,
      subscriptionId,
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

    const result = [];
    let total = 0;

    for (const [id, data] of subscriptions.entries()) {
      if (data.isActive && data.addressId === session.user.addressId) {
        result.push({
          id,
          addressId: data.addressId,
          createdAt: data.createdAt,
          isActive: data.isActive,
          endpoint: data.subscription.endpoint.substring(0, 50) + "...",
        });
        total++;
      }
    }

    return NextResponse.json({
      success: true,
      total,
      subscriptions: result,
      message: `${total} subscriptions encontradas para seu endereço`,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar subscriptions:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
