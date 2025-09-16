"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { SimpleDoorbellService } from "@/lib/services/simple-doorbell-service";

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

      // Ring the bell using simplified service
      const result = await SimpleDoorbellService.ringBell(visit.uuid);

      if (!result.success) {
        throw new Error(result.error || "Erro ao tocar a campainha");
      }

      setOk(true);
      setMsg("Campainha tocada! Redirecionando...");

      // Redirect to success page
      setTimeout(() => {
        window.location.href = "/campainha-tocada";
      }, 1500);
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
        disabled={submitting || visit.isExpired}
      >
        {visit.isExpired
          ? "TEMPO EXPIRADO"
          : submitting
            ? "Tocando..."
            : "TOCAR CAMPANHA AGORA"}
      </Button>

      {ok === true && <p className="text-sm text-green-600">✅ {msg}</p>}
      {ok === false && <p className="text-sm text-red-600">❌ {msg}</p>}
    </div>
  );
}
