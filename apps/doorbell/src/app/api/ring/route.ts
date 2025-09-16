import { NextRequest, NextResponse } from "next/server";
import { SimpleDoorbellService } from "@/lib/services/simple-doorbell-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { visitUuid, coords } = await req.json();

    if (!visitUuid) {
      return NextResponse.json(
        { error: "visitUuid é obrigatório" },
        { status: 400 }
      );
    }

    console.log("API Ring: Doorbell rung for visit:", visitUuid);

    // Ring the bell using SimpleDoorbellService
    const result = await SimpleDoorbellService.ringBell(visitUuid);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao tocar a campainha" },
        { status: 400 }
      );
    }

    // TODO: rate limit, captcha, ephemeral token, geo validation, etc.
    // Simulate notification to resident (queue/push). Here we just log.
    // In production, publish to a queue (SQS, Redis, etc) for resident app.

    // Ex.: await publishRing({ coords, ua: req.headers.get("user-agent") })

    console.log("Doorbell ring:", {
      visitUuid,
      coords,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Campainha tocada com sucesso",
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("API Ring: Error:", e);
    return NextResponse.json(
      { error: e?.message || "Erro inesperado" },
      { status: 500 }
    );
  }
}
