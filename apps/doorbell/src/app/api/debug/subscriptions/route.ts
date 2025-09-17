import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionsStore } from "@/lib/services/subscription-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    console.log("🔍 === DEBUG SUBSCRIPTIONS ===");

    const subscriptionsStore = getSubscriptionsStore();
    const allSubscriptions: any[] = [];

    for (const [id, data] of subscriptionsStore.entries()) {
      allSubscriptions.push({
        id,
        addressId: data.addressId,
        userId: data.userId,
        addressUuid: data.addressUuid,
        isActive: data.isActive,
        createdAt: data.createdAt,
        endpoint: data.subscription.endpoint.substring(0, 50) + "...",
      });
    }

    console.log(`📊 Total subscriptions: ${allSubscriptions.length}`);

    // Agrupar por addressId
    const byAddress = allSubscriptions.reduce(
      (acc, sub) => {
        if (!acc[sub.addressId]) {
          acc[sub.addressId] = [];
        }
        acc[sub.addressId].push(sub);
        return acc;
      },
      {} as Record<number, any[]>
    );

    console.log("📋 Subscriptions por endereço:", byAddress);

    return NextResponse.json({
      success: true,
      total: allSubscriptions.length,
      subscriptions: allSubscriptions,
      byAddress,
      debug: {
        storeSize: subscriptionsStore.size,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("❌ Erro no debug de subscriptions:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

