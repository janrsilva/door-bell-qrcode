import { NextRequest, NextResponse } from "next/server";
import { DoorbellService } from "@/lib/services/doorbell-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { uuid } = await req.json();

    if (!uuid) {
      return NextResponse.json(
        { error: "UUID é obrigatório" },
        { status: 400 }
      );
    }

    console.log("API Create Visit: Creating visit for UUID:", uuid);

    const result = await DoorbellService.createVisit(uuid);

    if (!result.success || !result.visit) {
      return NextResponse.json(
        { error: result.error || "Erro ao criar visita" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      visitId: result.visit.id,
      message: "Visita criada com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao criar visita:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
