import { useEffect, useRef } from "react";

interface UseCallingSoundProps {
  isCalling: boolean;
  isConnected: boolean;
  soundFile?: string;
}

export function useCallingSound({
  isCalling,
  isConnected,
  soundFile = "calling-ring.mp3",
}: UseCallingSoundProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Se não está chamando ou já está conectado, parar o som
    if (!isCalling || isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }

    // Se está chamando e não está conectado, iniciar o som
    const playCallingSound = () => {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(`/sounds/${soundFile}`);
          audioRef.current.preload = "auto";
          audioRef.current.volume = 0.7; // Volume moderado para não incomodar
        }

        // Tocar o som
        audioRef.current.play().catch((error) => {
          console.warn("Erro ao reproduzir som de chamada:", error);
        });
      } catch (error) {
        console.warn("Erro ao criar áudio de chamada:", error);
      }
    };

    // Tocar imediatamente
    playCallingSound();

    // Configurar para tocar repetidamente a cada 3 segundos
    intervalRef.current = setInterval(playCallingSound, 3000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isCalling, isConnected, soundFile]);

  // Cleanup quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    stopSound: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    },
  };
}
