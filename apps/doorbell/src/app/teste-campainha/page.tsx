"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { withAuth } from "@/components/hoc/withAuth";
import ApiService from "@/lib/api";

function TesteCampainhaPage() {
  const [isRinging, setIsRinging] = useState(false);
  const [message, setMessage] = useState("");
  const [subscriptionsCount, setSubscriptionsCount] = useState(0);

  // Verificar subscriptions ativas ao carregar
  useEffect(() => {
    checkSubscriptions();
  }, []);

  const debugSubscriptions = async () => {
    try {
      console.log("🔍 Debugando subscriptions...");

      const result = await ApiService.debugSubscriptions();

      if (result.ok) {
        const data = result.data;
        console.log("📊 Debug subscriptions:", data);

        let report = `🔍 DEBUG SUBSCRIPTIONS:\n\n`;
        report += `📊 Total: ${data.total}\n\n`;

        if (data.total === 0) {
          report += `❌ NENHUMA SUBSCRIPTION ENCONTRADA!\n`;
          report += `🔧 Configure notificações no PWA primeiro.`;
        } else {
          report += `📋 Por Endereço:\n`;
          for (const [addressId, subs] of Object.entries(data.byAddress)) {
            report += `  🏠 AddressId ${addressId}: ${(subs as any[]).length} dispositivos\n`;
          }

          report += `\n🎯 João Silva deve ter AddressId = 2\n`;

          if (data.byAddress["2"]) {
            report += `✅ Encontrado ${data.byAddress["2"].length} dispositivos para AddressId 2`;
          } else {
            report += `❌ NENHUM dispositivo para AddressId 2!`;
          }
        }

        alert(report);
      } else {
        alert(`❌ Erro ao buscar subscriptions: ${result.error}`);
      }
    } catch (error: any) {
      console.error("❌ Erro no debug:", error);
      alert(`❌ Erro: ${error.message}`);
    }
  };

  const checkSubscriptions = async () => {
    try {
      const response = await fetch("/api/notifications/subscribe");
      const data = await response.json();
      setSubscriptionsCount(data.total || 0);
      console.log("📊 Subscriptions ativas:", data.total);
    } catch (error) {
      console.error("Erro ao verificar subscriptions:", error);
    }
  };

  const ringBell = async () => {
    if (isRinging) return;

    setIsRinging(true);
    setMessage("");

    try {
      console.log("🔔 Tocando campainha...");

      // Usar UUID real da visita do João Silva (address_id = 2)
      const testVisitUuid = "c8e574ae-8b8b-45b6-8034-3a3d67032b39";

      console.log("🎯 Usando UUID real da visita:", testVisitUuid);
      console.log("🏠 Este UUID pertence ao address_id = 2 (João Silva)");

      const coords = {
        lat: -23.5505,
        lon: -46.6333,
        acc: 10,
      };

      const result = await ApiService.ringBell(testVisitUuid, coords);

      if (result.ok) {
        setMessage("✅ Campainha tocada! Push notification enviada.");
        console.log("✅ Campainha tocada com sucesso:", result.data);

        // Atualizar count de subscriptions
        await checkSubscriptions();
      } else {
        setMessage("❌ Erro: " + result.error);
        console.error("❌ Erro ao tocar campainha:", result);
      }
    } catch (error: any) {
      setMessage("❌ Erro na requisição: " + error.message);
      console.error("❌ Erro na requisição:", error);
    } finally {
      setIsRinging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-8">
          <div className="text-6xl mb-4">🚪</div>
          <h1 className="text-2xl font-bold text-gray-800">
            Teste da Campainha
          </h1>
          <p className="text-gray-600 mt-2">
            Simular um visitante tocando a campainha
          </p>
        </div>

        {/* Instruções */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>📋 Como Testar:</strong>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>
                Abra <code>/atendimento</code> em outra aba/dispositivo
              </li>
              <li>Configure as notificações no PWA</li>
              <li>Volte aqui e clique em "Tocar Campainha"</li>
              <li>Veja se o PWA recebe a notificação!</li>
            </ol>
          </div>
        </Card>

        {/* Botão Principal */}
        <div className="space-y-4">
          <Button
            onClick={ringBell}
            disabled={isRinging}
            size="lg"
            className="w-full h-16 text-xl bg-red-600 hover:bg-red-700"
          >
            {isRinging ? "🔄 Tocando..." : "🔔 TOCAR CAMPAINHA"}
          </Button>

          {message && (
            <Card className="p-4">
              <p className="text-sm">{message}</p>
            </Card>
          )}
        </div>

        {/* Debug */}
        <div className="space-y-2">
          <Button
            onClick={debugSubscriptions}
            variant="outline"
            size="sm"
            className="w-full"
          >
            🔍 Debug Subscriptions
          </Button>
        </div>

        {/* Links Úteis */}
        <div className="space-y-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => window.open("/atendimento", "_blank")}
          >
            📱 Abrir PWA (Central de Chamadas)
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              window.open("/api/notifications/subscribe", "_blank")
            }
          >
            🔍 Ver Subscriptions Ativas
          </Button>
        </div>

        {/* Status */}
        <Card className="p-4 bg-gray-50">
          <div className="text-xs text-gray-600">
            <strong>Status do Sistema:</strong>
            <ul className="mt-1 space-y-1">
              <li>
                • PWA: <code>/atendimento</code>
              </li>
              <li>
                • API Ring: <code>/api/ring</code>
              </li>
              <li>
                • Subscriptions: <code>/api/notifications/subscribe</code>
              </li>
              <li
                className={
                  subscriptionsCount > 0 ? "text-green-600" : "text-red-600"
                }
              >
                • Dispositivos conectados: <strong>{subscriptionsCount}</strong>
              </li>
            </ul>
          </div>
        </Card>

        {subscriptionsCount === 0 && (
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="text-sm text-yellow-800">
              <strong>⚠️ Nenhum dispositivo conectado!</strong>
              <p className="mt-2">
                Abra <code>/atendimento</code> e configure as notificações
                primeiro.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// Exportar página protegida - só usuários autenticados podem testar
export default withAuth(TesteCampainhaPage, {
  redirectTo: "/auth/login",
});
