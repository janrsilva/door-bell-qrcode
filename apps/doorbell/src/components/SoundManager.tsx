"use client";

import { useEffect, useRef } from "react";
import { getSoundConfig, playSound, stopSound, unlockAudio } from "@/lib/sound";

const MAX_PUSH_SOUND_AGE_MS = 60 * 1000;

export function SoundManager() {
  const lastPlayedEventRef = useRef<string | null>(null);

  useEffect(() => {
    // Listener de mensagens do SW
    const onMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === "PLAY_CUSTOM_SOUND") {
        // Só tenta tocar se a aba estiver visível (foreground)
        if (document.visibilityState === "visible") {
          const eventKey = `${data.visitId || data.tag || "unknown"}:${
            data.timestamp || ""
          }`;
          const eventAge =
            typeof data.timestamp === "number"
              ? Date.now() - data.timestamp
              : 0;

          if (
            eventKey === lastPlayedEventRef.current ||
            eventAge > MAX_PUSH_SOUND_AGE_MS
          ) {
            return;
          }

          lastPlayedEventRef.current = eventKey;

          // Toca o som sugerido ou o configurado
          playSound(data.sound);
        }
      } else if (data.type === "IGNORE_RING") {
        stopSound();
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onMessage);
    }

    // Desbloqueio de áudio: se o usuário interagir, preparamos o player.
    const onFirstInteraction = () => {
      const cfg = getSoundConfig();
      void unlockAudio(cfg.file);
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };

    window.addEventListener("click", onFirstInteraction);
    window.addEventListener("keydown", onFirstInteraction);
    window.addEventListener("touchstart", onFirstInteraction);

    return () => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onMessage);
      }
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };
  }, []);

  return null; // Componente invisível - apenas lógica
}

export default SoundManager;
