import { NextRequest, NextResponse } from "next/server";
import { QRCodeService } from "@/lib/services/qr-service";
import puppeteer from "puppeteer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const addressUuid = searchParams.get("addressUuid");
    const houseNumber = searchParams.get("houseNumber");
    const userName = searchParams.get("userName");

    if (!addressUuid) {
      return NextResponse.json(
        { error: "addressUuid é obrigatório" },
        { status: 400 }
      );
    }

    console.log(
      "API PDF: Generating PDF for address:",
      addressUuid,
      "house:",
      houseNumber
    );

    // Generate QR code for PDF (higher resolution)
    const qrResult = await QRCodeService.generateQRForPDF(
      addressUuid,
      houseNumber || undefined
    );

    if (!qrResult.qrCodeDataURL) {
      return NextResponse.json(
        { error: "Erro ao gerar QR code" },
        { status: 500 }
      );
    }

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Campainha Eletrônica</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 40px;
            margin: 0;
            background: white;
        }
        .header {
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #000;
        }
        .header h3 {
            font-size: 24px;
            font-weight: normal;
            margin-bottom: 40px;
            color: #333;
        }
        .qr-container {
            margin: 40px auto;
            padding: 30px;
            background: #f9f9f9;
            border-radius: 12px;
            border: 2px solid #ddd;
            max-width: 500px;
        }
        .qr-code {
            max-width: 400px;
            height: auto;
            display: block;
            margin: 0 auto;
        }
        .instructions {
            background: #f0f8ff;
            border-left: 4px solid #2563eb;
            padding: 20px;
            margin: 30px 0;
            text-align: left;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        .instructions p {
            font-size: 16px;
            line-height: 1.6;
            color: #1e40af;
            margin: 0;
        }
        .house-number {
            font-size: 20px;
            font-weight: bold;
            margin-top: 15px;
            color: #2563eb;
        }
        .footer {
            margin-top: 40px;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>CAMPAINHA</h1>
        <h3>ELETRÔNICA</h3>
    </div>

    <div class="qr-container">
        <img src="${
          qrResult.qrCodeDataURL
        }" alt="QR Code da Campainha" class="qr-code" />
        ${
          houseNumber
            ? `<div class="house-number">Casa ${houseNumber}</div>`
            : ""
        }
    </div>

    <div class="instructions">
        <p>
            Essa é uma campainha eletrônica que toca no telefone do morador,
            leia o código para entrar em contato. Ao fazer isso, você concorda
            com os termos de uso da plataforma.
        </p>
    </div>

    <div class="footer">
        <p><strong>Sistema de Campainha Eletrônica</strong><br>
        Escaneie o QR Code acima para tocar a campainha</p>
    </div>
</body>
</html>`;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // Set content and wait for images to load
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
      displayHeaderFooter: false,
    });

    await browser.close();

    console.log("API PDF: PDF generated successfully");

    // Return PDF buffer
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="campainha-${
          houseNumber || addressUuid
        }.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar PDF:", error);

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
