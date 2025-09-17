"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ApiService from "@/lib/api";

type Props = {
  visit: {
    uuid: string;
    isExpired?: boolean;
  };
};

export default function RingButton({ visit }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<null | boolean>(null);
  const [msg, setMsg] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(0);

  async function onRing() {
    if (submitting) return;
    setSubmitting(true);
    setOk(null);
    setMsg("");

    try {
      // Optional: vibrate device for instant feedback
      if (navigator?.vibrate) navigator.vibrate(20);

      // (MVP) collect light geolocation for backend (non-blocking)
      let coords: { lat?: number; lon?: number; acc?: number } = {};
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: false,
            maximumAge: 10_000,
            timeout: 2_000,
          })
        );
        coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
        };
      } catch {
        // continue without geo (MVP): backend handles it
      }

      // Ring the bell using API Service
      const result = await ApiService.ringBell(visit.uuid, coords);

      if (!result.ok) {
        console.error("❌ Erro na API ring:", result);
        throw new Error(result.error || "Erro ao tocar a campainha");
      }

      console.log("✅ Campainha tocada com sucesso:", result.data);

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
    </div>
  );
}
