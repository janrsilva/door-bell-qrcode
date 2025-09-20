import { NextRequest, NextResponse } from "next/server";

// Store temporário para subscriptions de visitantes (em memória)
// Em produção, usar Redis ou DB com TTL
const visitorSubscriptions = new Map<
  string,
  {
    subscription: any;
    timestamp: number;
  }
>();

// Cleanup automático de subscriptions antigas (5 minutos)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  for (const [visitId, data] of visitorSubscriptions.entries()) {
    if (data.timestamp < fiveMinutesAgo) {
      visitorSubscriptions.delete(visitId);
      console.log(`🗑️ Visitor subscription expirada: ${visitId}`);
    }
  }
}, 60000); // Cleanup a cada minuto

export async function POST(req: NextRequest) {
  try {
    const { visitId, subscription } = await req.json();

    if (!visitId || !subscription) {
      return NextResponse.json(
        { error: "Missing visitId or subscription" },
        { status: 400 }
      );
    }

    console.log("📱 Registrando visitor subscription:", visitId);

    // Armazenar subscription temporária do visitante
    visitorSubscriptions.set(visitId, {
      subscription: subscription,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Visitor subscription registered",
      visitId: visitId,
    });
  } catch (error: any) {
    console.error("❌ Erro ao registrar visitor subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET para obter subscription de um visitante (usado pelo webrtc-signal)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const visitId = searchParams.get("visitId");

  if (!visitId) {
    return NextResponse.json(
      { error: "Missing visitId parameter" },
      { status: 400 }
    );
  }

  const visitorData = visitorSubscriptions.get(visitId);

  if (!visitorData) {
    return NextResponse.json(
      { error: "Visitor subscription not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    subscription: visitorData.subscription,
  });
}
