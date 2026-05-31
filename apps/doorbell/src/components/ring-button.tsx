"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ApiService from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type Coordinates,
  formatDistance,
  getHighAccuracyLocation,
  getCurrentLocation,
} from "@/lib/utils/latlong";
import { getLocationInstructions } from "@/lib/utils/location-instructions";
import { MAX_DISTANCE } from "@/lib/utils/location-validation";

type Props = {
  visit: {
    uuid: string;
    isExpired?: boolean;
  };
  visitorCoords?: Coordinates | null;
  distance?: number | null;
  onRequestLocation?: () => Promise<{
    success: boolean;
    coords?: Coordinates;
    error?: string;
  }>;
};

export default function RingButton({
  visit,
  visitorCoords,
  distance,
  onRequestLocation,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<null | boolean>(null);
  const [msg, setMsg] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  // Revalida a localização no momento do toque para evitar coordenadas antigas.
  const processRingBell = async () => {
    try {
      setSubmitting(true);
      setOk(null);
      setMsg("Obtendo localização precisa...");

      // Optional: vibrate device for instant feedback
      if (navigator?.vibrate) navigator.vibrate(20);

      const preciseResult = await getHighAccuracyLocation(2, 15);
      const ringCoords = preciseResult.coords;
      setMsg(`Localização obtida (±${preciseResult.accuracy.toFixed(0)}m)`);

      // Ring the bell using API Service
      const result = await ApiService.ringBell(visit.uuid, {
        lat: ringCoords.lat,
        lon: ringCoords.lon,
        acc: preciseResult.accuracy,
      });

      if (!result.ok) {
        throw new Error(result.error || "Erro ao tocar a campainha");
      }

      setOk(true);
      setMsg("✅ Campainha tocada com sucesso!");

      // Vibrar novamente para confirmar sucesso
      if (navigator?.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      // Iniciar countdown de 60 segundos para poder tocar novamente
      setCountdown(60);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setOk(null);
            setMsg("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      setOk(false);
      setMsg(e?.message || "Falha ao tocar a campainha");
    } finally {
      setSubmitting(false);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setIsRequestingLocation(true);

      // Verificar se geolocalização está disponível
      if (!navigator.geolocation) {
        throw new Error("Geolocalização não suportada neste navegador");
      }

      // Verificar permissões primeiro (se suportado)
      if ("permissions" in navigator) {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });

        if (permission.state === "denied") {
          // Mostrar instruções específicas para reativar
          setShowLocationDialog(false);
          setOk(false);
          setMsg(
            "🔒 Permissão negada anteriormente. Siga as instruções abaixo para reativar:",
          );

          // Mostrar instruções detalhadas
          setTimeout(() => {
            const instructions = getLocationInstructions();
            alert(
              `🔒 PERMISSÃO DE LOCALIZAÇÃO NEGADA\n\n${instructions}\n\nApós seguir essas instruções, recarregue a página e tente novamente.`,
            );
          }, 500);

          return;
        }
      }

      // Usar a função do componente pai se disponível
      if (onRequestLocation) {
        const result = await onRequestLocation();

        if (result.success) {
          setShowLocationDialog(false);

          // Aguardar um momento e então tocar a campainha diretamente
          setTimeout(async () => {
            await processRingBell();
          }, 300);
          return;
        } else {
          throw new Error(result.error || "Erro ao obter localização");
        }
      }

      // Fallback: tentar obter localização diretamente
      const coords = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      setShowLocationDialog(false);
      setOk(null);
      setMsg("✅ Localização permitida! Tente tocar a campainha novamente.");

      // Aguardar um momento para mostrar a mensagem e recarregar para atualizar o estado
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      setOk(false);
      setShowLocationDialog(false);

      // Mensagens de erro mais específicas
      let errorMessage = error.message;
      if (
        error.message.includes("denied") ||
        error.message.includes("User denied")
      ) {
        errorMessage =
          "🔒 Permissão negada. Siga as instruções que aparecerão para reativar.";

        // Mostrar instruções após um momento
        setTimeout(() => {
          const instructions = getLocationInstructions();
          alert(
            `🔒 PERMISSÃO DE LOCALIZAÇÃO NEGADA\n\n${instructions}\n\nApós seguir essas instruções, recarregue a página e tente novamente.`,
          );
        }, 1000);
      } else if (error.message.includes("timeout")) {
        errorMessage =
          "⏰ Timeout ao obter localização. Verifique se o GPS está ativado.";
      } else if (error.message.includes("unavailable")) {
        errorMessage =
          "📍 Localização indisponível. Verifique sua conexão e GPS.";
      }

      setMsg(errorMessage);
    } finally {
      setIsRequestingLocation(false);
    }
  };

  async function onRing() {
    if (submitting) return;

    // Verificar se há localização disponível
    if (!visitorCoords) {
      // Sempre mostrar o modal explicativo primeiro
      setShowLocationDialog(true);
      return;
    }

    // Verificar distância antes de tocar
    if (
      distance !== null &&
      distance !== undefined &&
      distance > MAX_DISTANCE
    ) {
      setOk(false);
      setMsg(
        `🚫 Muito longe! Você está a ${formatDistance(distance)} do endereço. Máximo permitido: ${MAX_DISTANCE}m`,
      );
      return;
    }

    await processRingBell();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        size="lg"
        className="h-14 w-full text-lg"
        onClick={onRing}
        disabled={submitting || visit.isExpired || countdown > 0}
      >
        {visit.isExpired
          ? "⏰ TEMPO EXPIRADO"
          : submitting
            ? "🔔 Tocando..."
            : countdown > 0
              ? `⏳ Aguarde ${countdown}s`
              : ok === true
                ? "🔔 TOCAR NOVAMENTE"
                : "🔔 TOCAR CAMPAINHA"}
      </Button>

      {ok === true && (
        <div className="text-center space-y-2">
          <p className="text-sm text-green-600 font-medium">{msg}</p>
          <div className="text-xs text-green-500 space-y-1">
            <p>Enviamos uma notificação no celular do morador</p>
            {countdown > 0 && (
              <p className="text-blue-500 font-medium">
                Você pode tocar novamente em {countdown}s
              </p>
            )}
          </div>
        </div>
      )}
      {ok === false && (
        <div className="text-center">
          <p className="text-sm text-red-600 font-medium">❌ {msg}</p>
          <p className="text-xs text-red-400 mt-1">
            Tente novamente em alguns segundos
          </p>
        </div>
      )}

      {/* Dialog para solicitar permissão de localização */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📍 Permissão de Localização Necessária</DialogTitle>
            <DialogDescription>
              Para tocar a campainha, precisamos verificar se você está próximo
              ao endereço (máximo 50 metros). Após permitir, a campainha será
              tocada automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl">🛡️</div>
              <div className="text-sm text-blue-800">
                <p className="font-medium">
                  Sua localização é usada apenas para:
                </p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Verificar proximidade com o endereço</li>
                  <li>Prevenir uso indevido da campainha</li>
                  <li>Não é armazenada ou compartilhada</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl">⚠️</div>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Próximo passo:</p>
                <p>
                  O navegador irá solicitar permissão para acessar sua
                  localização. Clique em &quot;Permitir&quot; quando aparecer o
                  popup.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLocationDialog(false)}
              disabled={isRequestingLocation}
            >
              ❌ Cancelar
            </Button>
            <Button
              onClick={requestLocationPermission}
              disabled={isRequestingLocation}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRequestingLocation ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Solicitando...
                </>
              ) : (
                <>📍 Permitir Localização</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
