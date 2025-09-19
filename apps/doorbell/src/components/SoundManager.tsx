"use client";

import { useEffect } from "react";
import { getSoundConfig, playSound, unlockAudio } from "@/lib/sound";

export function SoundManager() {
  useEffect(() => {
    console.log("🎵 SoundManager inicializado");

    // Listener de mensagens do SW
    const onMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === "PLAY_CUSTOM_SOUND") {
        console.log("📱 Mensagem do SW recebida:", data);

        // Só tenta tocar se a aba estiver visível (foreground)
        if (document.visibilityState === "visible") {
          console.log("👁️ Aba visível - tocando som customizado");
          // Toca o som sugerido ou o configurado
          playSound(data.sound);
        } else {
          console.log("👁️ Aba não visível - usando som padrão do sistema");
        }
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onMessage);
    }

    // "Desbloqueio" de áudio: se o usuário interagir, preparamos o player
    const onFirstInteraction = () => {
      console.log("🔓 Primeira interação detectada - desbloqueando áudio");
      const cfg = getSoundConfig();
      unlockAudio(cfg.file);
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
