import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import { readFileSync } from "fs";
import { join } from "path";
import { QRCodeService } from "./qr-service";

export interface PDFOptions {
  userId: number;
  houseNumber?: string;
  userName?: string;
}

export interface PDFResult {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
}

export class PDFService {
  /**
   * Generate PDF for doorbell QR code
   */
  static async generateDoorbellPDF(options: PDFOptions): Promise<PDFResult> {
    try {
      console.log("PDFService: Generating PDF for user:", options.userId);

      // Generate QR code for PDF (higher resolution)
      const qrResult = await QRCodeService.generateQRForPDF(
        options.userId,
        options.houseNumber
      );

      if (!qrResult.success || !qrResult.qrCodeDataUrl) {
        return {
          success: false,
          error: qrResult.error || "Erro ao gerar QR code",
        };
      }

      // Load Handlebars template
      const templatePath = join(
        process.cwd(),
        "src/lib/templates/doorbell-pdf.hbs"
      );
      const templateSource = readFileSync(templatePath, "utf8");
      const template = Handlebars.compile(templateSource);

      // Prepare template data
      const templateData = {
        qrCodeDataUrl: qrResult.qrCodeDataUrl,
        houseNumber: options.houseNumber,
        userName: options.userName,
        userId: options.userId,
      };

      // Generate HTML from template
      const html = template(templateData);

      console.log("PDFService: HTML generated, starting PDF generation...");

      // Launch Puppeteer
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

      console.log("PDFService: PDF generated successfully");

      return {
        success: true,
        pdfBuffer,
      };
    } catch (error: any) {
      console.error("PDFService: Error generating PDF:", error);
      return {
        success: false,
        error: error.message || "Erro ao gerar PDF",
      };
    }
  }

  /**
   * Generate PDF and return as base64 string
   */
  static async generateDoorbellPDFBase64(options: PDFOptions): Promise<{
    success: boolean;
    pdfBase64?: string;
    error?: string;
  }> {
    try {
      const result = await this.generateDoorbellPDF(options);

      if (!result.success || !result.pdfBuffer) {
        return {
          success: false,
          error: result.error,
        };
      }

      const pdfBase64 = result.pdfBuffer.toString("base64");

      return {
        success: true,
        pdfBase64,
      };
    } catch (error: any) {
      console.error("PDFService: Error generating PDF base64:", error);
      return {
        success: false,
        error: error.message || "Erro ao gerar PDF",
      };
    }
  }
}
