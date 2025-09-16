import { NextRequest, NextResponse } from "next/server";
import { DoorbellService } from "@/lib/services/doorbell-service";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;
    const visitIdNumber = parseInt(visitId, 10);

    if (isNaN(visitIdNumber)) {
      return NextResponse.json(
        { error: "ID da visita inválido" },
        { status: 400 }
      );
    }

    console.log("API Visit: Getting visit data for ID:", visitIdNumber);

    const visit = await DoorbellService.findVisitById(visitIdNumber);

    if (!visit) {
      return NextResponse.json(
        { error: "Visita não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      visit,
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
