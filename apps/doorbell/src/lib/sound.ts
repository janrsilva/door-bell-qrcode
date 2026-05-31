type SoundConfig = {
  enabled: boolean;
  file: string; // ex: 'doorbell.mp3'
};

const KEY = "custom-notification-sound";
const DOORBELL_VOLUME = 0.8;

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
let repeatTimeouts: ReturnType<typeof setTimeout>[] = [];
let repeatAudioEls: HTMLAudioElement[] = [];

export async function unlockAudio(initialFile?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isUnlocked) return true; // já desbloqueado

  audioEl = new Audio(
    initialFile ? `/sounds/${initialFile}` : "/sounds/doorbell.mp3",
  );
  audioEl.preload = "auto";

  // Tocar e pausar rapidamente para "inicializar" o contexto
  audioEl.volume = 0.0001;
  try {
    await audioEl.play();
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.volume = DOORBELL_VOLUME;
    isUnlocked = true;
    return true;
  } catch (err) {
    console.warn("⚠️ Falha ao desbloquear áudio:", err);
    // Se falhar, o usuário precisa interagir novamente
    return false;
  }
}

export async function playSound(file?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const cfg = getSoundConfig();
  if (!cfg.enabled) {
    return false;
  }

  // Só tocar se a aba estiver visível (foreground)
  if (document.visibilityState !== "visible") {
    return false;
  }

  const chosen = file || cfg.file || "doorbell.mp3";
  const src = `/sounds/${chosen}`;

  try {
    stopSound();

    if (!audioEl || !isUnlocked) {
      const unlocked = await unlockAudio(chosen);
      if (!unlocked) return false;
    }

    if (!audioEl) {
      audioEl = new Audio(src);
    } else {
      audioEl.src = src;
    }

    audioEl.preload = "auto";
    audioEl.volume = DOORBELL_VOLUME;

    await audioEl.play();

    // Padrão de campainha: 3 toques
    for (let i = 0; i < 2; i++) {
      const timeout = setTimeout(
        async () => {
          try {
            const repeatAudio = new Audio(src);
            repeatAudioEls.push(repeatAudio);
            repeatAudio.volume = DOORBELL_VOLUME;
            await repeatAudio.play();
          } catch (e) {}
        },
        (i + 1) * 1000,
      ); // A cada 1 segundo
      repeatTimeouts.push(timeout);
    }

    return true;
  } catch (err) {
    console.warn(
      "⚠️ Falha ao tocar áudio customizado (provável bloqueio de autoplay):",
      err,
    );
    return false;
  }
}

export function stopSound() {
  repeatTimeouts.forEach((timeout) => clearTimeout(timeout));
  repeatTimeouts = [];

  repeatAudioEls.forEach((audio) => {
    audio.pause();
    audio.currentTime = 0;
  });
  repeatAudioEls = [];

  if (audioEl) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
}

export function isAudioUnlocked(): boolean {
  return isUnlocked;
}
