import { NextRequest, NextResponse } from "next/server";
import {
  saveSubscription,
  getActiveSubscriptions,
  type WebPushSubscription,
} from "@/lib/services/subscription-service";
import { getAuthSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Obter dados do usuário da sessão NextAuth
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Subscription inválida" },
        { status: 400 },
      );
    }

    const sessionUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, addressId: true },
    });

    if (!sessionUser || sessionUser.addressId !== session.user.addressId) {
      return NextResponse.json(
        {
          error:
            "Sessão desatualizada. Entre novamente para ativar notificações.",
          code: "STALE_SESSION",
        },
        { status: 401 },
      );
    }

    // Salvar subscription no banco com limpeza automática
    const savedSubscription = await saveSubscription(
      sessionUser.id,
      sessionUser.addressId,
      subscription,
    );

    return NextResponse.json({
      success: true,
      subscriptionId: savedSubscription.id,
      message: "Subscription salva com sucesso",
    });
  } catch (error: any) {
    console.error("❌ Erro ao salvar subscription:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 },
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
      subscriptions: subscriptions.map(
        (sub: WebPushSubscription, index: number) => ({
          id: index + 1,
          addressId: session.user.addressId,
          endpoint: sub.endpoint.substring(0, 50) + "...",
          isActive: true,
        }),
      ),
      message: `${subscriptions.length} subscriptions encontradas para seu endereço`,
    });
  } catch (error: any) {
    console.error("❌ Erro ao buscar subscriptions:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
