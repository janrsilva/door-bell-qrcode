import { NextRequest, NextResponse } from "next/server";
import { SimpleDoorbellService } from "@/lib/services/simple-doorbell-service";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;


    const result = await SimpleDoorbellService.getVisit(visitId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Visita não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      visit: result.visit,
      expiredAt: result.expiredAt,
      isExpired: result.isExpired,
    });
  } catch (error: any) {
    console.error("Erro ao buscar visita:", error);
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
