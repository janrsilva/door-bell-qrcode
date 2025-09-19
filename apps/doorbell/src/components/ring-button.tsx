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

type Props = {
  visit: {
    uuid: string;
    isExpired?: boolean;
  };
  visitorCoords?: Coordinates | null;
  distance?: number | null;
};

export default function RingButton({ visit, visitorCoords, distance }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<null | boolean>(null);
  const [msg, setMsg] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

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
          throw new Error(
            "Permissão de localização foi negada. Ative nas configurações do navegador."
          );
        }
      }

      // Tentar obter localização (isso vai disparar o prompt de permissão se necessário)
      const coords = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      setShowLocationDialog(false);
      setOk(null);
      setMsg("✅ Localização permitida! Tente tocar a campainha novamente.");

      // Aguardar um momento para mostrar a mensagem
      setTimeout(() => {
        setMsg("");
      }, 3000);
    } catch (error: any) {
      setOk(false);

      // Mensagens de erro mais específicas
      let errorMessage = error.message;
      if (error.message.includes("denied")) {
        errorMessage =
          "Permissão negada. Ative a localização nas configurações do navegador.";
      } else if (error.message.includes("timeout")) {
        errorMessage =
          "Timeout ao obter localização. Verifique se o GPS está ativado.";
      } else if (error.message.includes("unavailable")) {
        errorMessage = "Localização indisponível. Verifique sua conexão e GPS.";
      }

      setMsg(`Erro: ${errorMessage}`);
      setShowLocationDialog(false);
    } finally {
      setIsRequestingLocation(false);
    }
  };

  async function onRing() {
    if (submitting) return;

    // Verificar se há localização disponível
    if (!visitorCoords) {
      setShowLocationDialog(true);
      return;
    }

    // Verificar distância antes de tocar
    if (distance !== null && distance !== undefined && distance > 50) {
      setOk(false);
      setMsg(
        `🚫 Muito longe! Você está a ${formatDistance(distance)} do endereço. Máximo permitido: 50m`
      );
      return;
    }

    setSubmitting(true);
    setOk(null);
    setMsg("");

    try {
      // Optional: vibrate device for instant feedback
      if (navigator?.vibrate) navigator.vibrate(20);

      // Obter localização de alta precisão no momento do toque
      let coords: { lat?: number; lon?: number; acc?: number } = {};

      try {
        setMsg("Obtendo localização precisa...");

        // Tentar obter localização de alta precisão
        const preciseResult = await getHighAccuracyLocation(2, 15); // 2 tentativas, 15m precisão

        coords = {
          lat: preciseResult.coords.lat,
          lon: preciseResult.coords.lon,
          acc: preciseResult.accuracy,
        };

        setMsg(`Localização obtida (±${preciseResult.accuracy.toFixed(0)}m)`);

        // Aguardar um momento para mostrar a mensagem
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        // Fallback: usar coordenadas do LocationTracker se disponíveis
        if (visitorCoords) {
          coords = {
            lat: visitorCoords.lat,
            lon: visitorCoords.lon,
            acc: 20, // Assumir precisão moderada
          };
        }
      }

      // Ring the bell using API Service
      const result = await ApiService.ringBell(visit.uuid, coords);

      if (!result.ok) {
        throw new Error(result.error || "Erro ao tocar a campainha");
      }

      setOk(true);
      setMsg("✅ Campainha tocada com sucesso! O morador foi notificado.");

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
                : "🔔 TOCAR CAMPAINHA AGORA"}
      </Button>

      {ok === true && (
        <div className="text-center space-y-2">
          <p className="text-sm text-green-600 font-medium">✅ {msg}</p>
          <div className="text-xs text-green-500 space-y-1">
            <p>📱 O morador recebeu uma notificação push</p>
            <p>🔔 O telefone dele tocou automaticamente</p>
            <p>⏰ Aguarde a resposta do morador</p>
            {countdown > 0 && (
              <p className="text-blue-500 font-medium">
                ⏳ Pode tocar novamente em {countdown}s
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
              ao endereço (máximo 50 metros).
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
                  localização. Clique em "Permitir" quando aparecer o popup.
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
