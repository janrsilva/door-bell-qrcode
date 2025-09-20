type SoundConfig = {
  enabled: boolean;
  file: string; // ex: 'doorbell.mp3'
};

const KEY = "custom-notification-sound";

export function getSoundConfig(): SoundConfig {
  if (typeof window === "undefined")
    return { enabled: false, file: "doorbell.mp3" };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { enabled: true, file: "doorbell.mp3" }; // Habilitado por padrão
  } catch {
    return { enabled: true, file: "doorbell.mp3" };
  }
}

export function setSoundConfig(cfg: SoundConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

/**
 * Importante: o navegador só permite tocar áudio sem bloqueio
 * se já houve interação do usuário (clique, toque, etc).
 * Chame `unlockAudio()` num botão de "Ativar som".
 */
let audioEl: HTMLAudioElement | null = null;
let isUnlocked = false;

export function unlockAudio(initialFile?: string) {
  if (typeof window === "undefined") return;
  if (isUnlocked) return; // já desbloqueado

  console.log("🔓 Desbloqueando áudio para notificações...");

  audioEl = new Audio(
    initialFile ? `/sounds/${initialFile}` : "/sounds/doorbell.mp3"
  );
  audioEl.preload = "auto";

  // Tocar e pausar rapidamente para "inicializar" o contexto
  audioEl.volume = 0.0001;
  audioEl
    .play()
    .then(() => {
      audioEl?.pause();
      if (audioEl) {
        audioEl.currentTime = 0;
        audioEl.volume = 1;
      }
      isUnlocked = true;
      console.log("✅ Áudio desbloqueado com sucesso");
    })
    .catch((err) => {
      console.warn("⚠️ Falha ao desbloquear áudio:", err);
      // Se falhar, o usuário precisa interagir novamente
    });
}

export async function playSound(file?: string) {
  if (typeof window === "undefined") return;

  const cfg = getSoundConfig();
  if (!cfg.enabled) {
    console.log("🔇 Som customizado desabilitado");
    return;
  }

  // Só tocar se a aba estiver visível (foreground)
  if (document.visibilityState !== "visible") {
    console.log("👁️ Aba não visível - não tocando som customizado");
    return;
  }

  const chosen = file || cfg.file || "doorbell.mp3";
  const src = `/sounds/${chosen}`;

  try {
    console.log(`🔔 Tocando som customizado: ${chosen}`);

    if (!audioEl || !isUnlocked) {
      console.log("🔓 Áudio não desbloqueado - tentando desbloquear...");
      unlockAudio(chosen);
      // Aguardar um pouco para o desbloqueio
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!audioEl) {
      audioEl = new Audio(src);
    } else {
      audioEl.src = src;
    }

    audioEl.preload = "auto";
    audioEl.volume = 1.0;

    await audioEl.play();
    console.log(`🎵 Som customizado reproduzido: ${chosen}`);

    // Padrão de campainha: 3 toques
    for (let i = 0; i < 2; i++) {
      setTimeout(
        async () => {
          try {
            const repeatAudio = new Audio(src);
            repeatAudio.volume = 1.0;
            await repeatAudio.play();
            console.log(`🔔 Toque da campainha ${i + 2}/3`);
          } catch (e) {
            console.log(`Erro no toque ${i + 2}:`, e);
          }
        },
        (i + 1) * 1000
      ); // A cada 1 segundo
    }
  } catch (err) {
    console.warn(
      "⚠️ Falha ao tocar áudio customizado (provável bloqueio de autoplay):",
      err
    );
  }
}

export function isAudioUnlocked(): boolean {
  return isUnlocked;
}
