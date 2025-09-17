import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, QrCode, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface QRDownloadStepProps {
  userId?: number;
  addressUuid?: string;
  houseNumber?: string;
  onDownloadQR: () => void;
}

export default function QRDownloadStep({
  userId,
  addressUuid,
  houseNumber,
  onDownloadQR,
}: QRDownloadStepProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Load QR code when component mounts
  useEffect(() => {
    if (addressUuid) {
      setIsLoading(true);
      const params = new URLSearchParams({
        addressUuid: addressUuid,
      });
      if (houseNumber) {
        params.append("houseNumber", houseNumber);
      }

      const qrUrl = `/api/qr?${params.toString()}`;
      setQrCodeUrl(qrUrl);
      setIsLoading(false);
    }
  }, [addressUuid, houseNumber]);
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Cadastro Concluído!</h2>
        <p className="text-muted-foreground text-sm">
          Agora você pode baixar seu QR Code personalizado
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Seu QR Code da Campainha
          </CardTitle>
          <CardDescription>
            Este QR Code é único e personalizado para você. Cole-o em seu portão
            para que visitantes possam tocar a campainha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-center">
            {addressUuid ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  UUID do endereço: <strong>{addressUuid}</strong>
                  {houseNumber && (
                    <>
                      <br />
                      Número da casa: <strong>{houseNumber}</strong>
                    </>
                  )}
                </p>

                {isLoading ? (
                  <div className="w-48 h-48 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center border-2 border-gray-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : qrCodeUrl ? (
                  <div className="w-48 h-48 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center border-2 border-gray-200 p-4">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code da Campainha"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center border-2 border-gray-200">
                    <span className="text-gray-500 text-sm">
                      Erro ao carregar QR Code
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="w-48 h-48 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                  <QrCode className="w-16 h-16 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  QR Code será gerado aqui
                </p>
              </>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Como usar:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Baixe o QR Code</li>
              <li>• Imprima em papel resistente</li>
              <li>• Cole na parte externa do seu portão</li>
              <li>• Visitantes podem escanear para tocar a campainha</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onDownloadQR}
              className="flex-1"
              size="lg"
              disabled={!addressUuid}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            {qrCodeUrl && (
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = qrCodeUrl;
                  link.download = `qr-code-${houseNumber || addressUuid}.png`;
                  link.click();
                }}
                size="lg"
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Próximos passos:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Você receberá notificações quando alguém tocar a campainha</li>
          <li>• Pode configurar horários de funcionamento</li>
          <li>• Adicionar mensagens personalizadas</li>
        </ul>
      </div>
    </div>
  );
}
