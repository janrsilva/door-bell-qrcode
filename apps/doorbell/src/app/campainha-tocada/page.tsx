import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function CampainhaTocadaPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-5 space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h1 className="text-2xl font-semibold text-green-600">
            Campainha Tocada!
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            A campainha foi tocada com sucesso. O morador foi notificado e pode
            entrar em contato com você.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full">
            <p className="text-green-800 text-sm">
              <strong>O que acontece agora?</strong>
            </p>
            <ul className="text-green-700 text-xs mt-2 space-y-1">
              <li>• O morador recebeu uma notificação no celular</li>
              <li>• Ele pode ver que alguém está no portão</li>
              <li>• Se necessário, ele pode iniciar uma conversa</li>
            </ul>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Obrigado por usar a campainha eletrônica!
          </p>
        </div>
      </Card>
    </main>
  );
}
