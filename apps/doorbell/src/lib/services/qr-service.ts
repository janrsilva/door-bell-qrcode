import QRCode from "qrcode";

export class QRCodeService {
  static async generateQRCode(data: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        errorCorrectionLevel: "M",
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 256,
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      throw new Error("Falha ao gerar QR Code");
    }
  }

  static async generateQRCodeBuffer(data: string): Promise<Buffer> {
    try {
      const buffer = await QRCode.toBuffer(data, {
        errorCorrectionLevel: "M",
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 256,
      });

      return buffer;
    } catch (error) {
      console.error("Erro ao gerar QR Code buffer:", error);
      throw new Error("Falha ao gerar QR Code buffer");
    }
  }

  static async generateQRForPDF(
    addressUuid: string,
    houseNumber?: string
  ): Promise<{ qrCodeDataURL: string; visitUrl: string }> {
    try {
      // Gerar URL da visita
      const visitUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/v/${addressUuid}`;

      // Gerar QR Code com resolução alta para PDF
      const qrCodeDataURL = await QRCode.toDataURL(visitUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 512, // Resolução maior para PDF
      });

      return {
        qrCodeDataURL,
        visitUrl,
      };
    } catch (error) {
      console.error("Erro ao gerar QR Code para PDF:", error);
      throw new Error("Falha ao gerar QR Code para PDF");
    }
  }

  static async generateDoorbellQR(
    addressUuid: string,
    houseNumber?: string
  ): Promise<{
    success: boolean;
    qrCodeDataUrl?: string;
    visitUrl?: string;
    error?: string;
  }> {
    try {
      // Gerar URL da visita
      const visitUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/v/${addressUuid}`;

      // Gerar QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(visitUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 256,
      });

      return {
        success: true,
        qrCodeDataUrl,
        visitUrl,
      };
    } catch (error) {
      console.error("Erro ao gerar QR Code da campainha:", error);
      return {
        success: false,
        error: "Falha ao gerar QR Code",
      };
    }
  }
}
