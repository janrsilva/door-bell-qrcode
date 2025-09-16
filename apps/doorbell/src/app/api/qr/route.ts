import { NextRequest, NextResponse } from "next/server";
import { QRCodeService } from "@/lib/services/qr-service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const addressUuid = searchParams.get("addressUuid");
    const houseNumber = searchParams.get("houseNumber");

    if (!addressUuid) {
      return NextResponse.json(
        { error: "addressUuid é obrigatório" },
        { status: 400 }
      );
    }

    console.log(
      "API QR: Generating QR code for address:",
      addressUuid,
      "house:",
      houseNumber
    );

    const result = await QRCodeService.generateDoorbellQR(
      addressUuid,
      houseNumber || undefined
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return QR code as image
    const base64Data = result.qrCodeDataUrl!.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar QR code:", error);

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
