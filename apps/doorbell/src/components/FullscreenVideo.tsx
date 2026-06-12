"use client";

import { cn } from "@/lib/utils";
import {
  LucideMic,
  LucideMicOff,
  LucidePhone,
  LucidePhoneOff,
  LucideRefreshCw,
  LucideVideo,
  LucideVideoOff,
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { AddressData, useAddress } from "@/contexts/AddressContext";
import AddressBlock from "./AdressBlock";

interface FullscreenVideoProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoEnabled: boolean;
  remoteVideoEnabled: boolean;
  remoteVideoAvailable?: boolean;
  isMuted: boolean;
  role: "visitor" | "resident";
  callState: string;
  connectionState?: string;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onSwitchCamera?: () => void;
  onEndCall?: () => void;
}

const callBackgroundStyle = {
  backgroundColor: "#05050a",
  backgroundImage:
    "radial-gradient(110% 82% at 76% 52%, rgba(128, 54, 65, 0.58) 0%, rgba(128, 54, 65, 0.24) 34%, rgba(128, 54, 65, 0) 58%), radial-gradient(120% 88% at 22% 68%, rgba(76, 92, 145, 0.62) 0%, rgba(76, 92, 145, 0.28) 38%, rgba(76, 92, 145, 0) 64%), linear-gradient(180deg, #05050a 0%, #090813 19%, #171526 39%, #34223a 58%, #596272 80%, #746f65 100%)",
};

function formatCallDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FullscreenVideo({
  localStream,
  remoteStream,
  localVideoEnabled,
  remoteVideoEnabled,
  remoteVideoAvailable = remoteVideoEnabled,
  isMuted,
  role,
  callState,
  connectionState = "unset",
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
  onEndCall,
}: FullscreenVideoProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoCornerRef = useRef<HTMLVideoElement>(null);
  const remoteVideoCornerRef = useRef<HTMLVideoElement>(null);
  const { addressData } = useAddress();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isConnected =
    callState === "connected" || connectionState === "connected";
  const isCallActive =
    callState === "calling" ||
    callState === "ringing" ||
    callState === "connected";
  const hasRemoteVideo =
    Boolean(remoteStream?.getVideoTracks().length) && remoteVideoEnabled;
  const hasLocalVideo =
    Boolean(localStream?.getVideoTracks().length) && localVideoEnabled;
  const showRemoteVideo =
    isConnected &&
    remoteVideoAvailable &&
    Boolean(remoteStream) &&
    hasRemoteVideo;
  const showLocalMain =
    !showRemoteVideo && Boolean(localStream) && hasLocalVideo;
  const showVoiceCall = isConnected && !showRemoteVideo;
  const showVideoSurface = showRemoteVideo || showLocalMain;
  const showAttentionStatus = showVideoSurface && !showRemoteVideo;
  const statusTitle = !isConnected
    ? role === "visitor"
      ? "Conectando chamada..."
      : "Conectando chamada..."
    : showRemoteVideo
      ? "Chamada conectada"
      : role === "visitor"
        ? "Chamada em áudio"
        : "Chamada em áudio";
  const statusDescription = !isConnected
    ? "Estabelecendo áudio. O vídeo pode ser ativado durante a chamada."
    : showRemoteVideo
      ? "Áudio e vídeo conectados."
      : role === "visitor"
        ? "Toque em vídeo se quiser ativar a câmera."
        : "Áudio conectado. O visitante pode ativar vídeo se quiser.";
  const callTimerText = isConnected
    ? formatCallDuration(elapsedSeconds)
    : callState === "ringing"
      ? "Chamando..."
      : "Conectando...";

  // Configurar stream local
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoEnabled]);

  // Configurar stream remoto
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    const remoteAudio = remoteAudioRef.current;
    if (!remoteAudio) return;

    remoteAudio.srcObject = remoteStream;

    if (remoteStream) {
      void remoteAudio.play().catch(() => {});
    }
  }, [remoteStream]);

  // Verificar se o srcObject foi definido corretamente
  useEffect(() => {
    if (
      remoteVideoRef.current &&
      remoteStream &&
      !remoteVideoRef.current.srcObject
    ) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, showRemoteVideo]);

  // Forçar atualização do srcObject quando o vídeo é renderizado
  useEffect(() => {
    if (showRemoteVideo && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [showRemoteVideo, remoteStream]);

  // Configurar vídeo local no canto
  useEffect(() => {
    if (localStream && localVideoCornerRef.current) {
      localVideoCornerRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoEnabled]);

  // Configurar vídeo remoto no canto
  useEffect(() => {
    if (remoteStream && remoteVideoCornerRef.current) {
      remoteVideoCornerRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoEnabled]);

  useEffect(() => {
    if (!isConnected) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(intervalId);
  }, [isConnected]);

  // Forçar configuração do vídeo local no canto quando o elemento é renderizado
  useEffect(() => {
    if (localVideoCornerRef.current && localStream) {
      localVideoCornerRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoEnabled, showRemoteVideo]); // showRemoteVideo indica quando o vídeo do canto é renderizado

  const ControlButton = ({
    children,
    onClick,
    className,
    ariaLabel,
    label,
    active,
    disabled,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
    ariaLabel: string;
    label: string;
    active?: boolean;
    disabled?: boolean;
  }) => {
    return (
      <button
        className={cn(
          "flex min-w-0 flex-col items-center gap-2 text-center text-[13px] font-medium leading-tight text-white/90 transition-colors hover:text-white",
          disabled && "cursor-not-allowed opacity-45 hover:text-white/90",
        )}
        onClick={onClick}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-black/55 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-colors",
            active && !disabled && "bg-white text-zinc-950",
            className,
          )}
        >
          {children}
        </span>
        <span className="block w-24 max-w-full text-balance">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white md:flex md:items-center md:justify-center">
      <div className="relative h-full w-full overflow-hidden bg-zinc-950 md:aspect-[9/16] md:h-[100dvh] md:w-auto md:max-h-[900px] md:shadow-2xl">
        <div className="absolute left-2 right-2 top-2 z-30 space-y-3 text-white">
          {addressData && (
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
              <h1>
                <AddressBlock addressData={addressData as AddressData} />
              </h1>
            </div>
          )}

          {isCallActive && (
            <div className="flex justify-center">
              <div className="inline-flex h-10 items-center gap-2 rounded-full bg-black/55 px-4 text-sm font-semibold tracking-normal shadow-lg ring-1 ring-white/15 backdrop-blur-md">
                <LucidePhone className="h-4 w-4" />
                <span>{callTimerText}</span>
              </div>
            </div>
          )}
        </div>

        <div className="absolute inset-0" style={callBackgroundStyle} />
        <div className="absolute inset-0 bg-black/10" />
        <audio ref={remoteAudioRef} autoPlay className="hidden" />

        {showRemoteVideo && (
          <div
            className="absolute inset-0 h-full w-full"
            style={callBackgroundStyle}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={callBackgroundStyle}
            />
          </div>
        )}

        {showLocalMain && (
          <div
            className="absolute inset-0 h-full w-full"
            style={callBackgroundStyle}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              style={callBackgroundStyle}
            />
          </div>
        )}

        {!showRemoteVideo && !showLocalMain && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-white">
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                {showVoiceCall ? (
                  <LucidePhone className="h-11 w-11 text-white" />
                ) : (
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
              </div>
              <p className="text-2xl font-semibold">{statusTitle}</p>
              <p className="mt-3 text-sm leading-6 text-white/70">
                {statusDescription}
              </p>
              <div className="mt-5 inline-flex items-center rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs text-white/75">
                {connectionState === "connected"
                  ? "Áudio conectado"
                  : "Negociando conexão segura"}
              </div>
            </div>
          </div>
        )}

        {showVideoSurface && (
          <div
            className="absolute bottom-56 left-4 z-15 h-36 w-20 overflow-hidden rounded-lg border-2 border-white/20 bg-black shadow-lg"
            style={callBackgroundStyle}
          >
            {showRemoteVideo && localStream && hasLocalVideo && (
              <video
                ref={localVideoCornerRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover scale-x-[-1]"
              />
            )}

            {showLocalMain && remoteStream && hasRemoteVideo && (
              <video
                ref={remoteVideoCornerRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            )}
            {((showRemoteVideo && !hasLocalVideo) ||
              (showLocalMain && !hasRemoteVideo)) && (
              <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white/60">
                <LucideVideoOff className="h-7 w-7" />
              </div>
            )}
          </div>
        )}

        {showAttentionStatus && (
          <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-20 flex -translate-y-1/2 justify-center px-1">
            <div className="max-w-sm rounded-lg border border-white/20 bg-black/70 px-4 py-3 text-center text-white shadow-2xl backdrop-blur-md">
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                {showVoiceCall ? (
                  <LucidePhone className="h-5 w-5" />
                ) : (
                  <LucideVideo className="h-5 w-5" />
                )}
              </div>
              <p className="text-lg font-semibold leading-tight">
                {statusTitle}
              </p>
              <p className="mt-1 text-sm leading-5 text-white/75">
                {statusDescription}
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center px-5 text-white">
          <div className="flex w-full max-w-sm flex-col items-center gap-6">
            {(isMuted || !localVideoEnabled) && (
              <div className="flex min-h-7 flex-wrap items-center justify-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium shadow-lg backdrop-blur-md">
                {isMuted && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Mudo
                  </span>
                )}
                {!localVideoEnabled && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Sem câmera
                  </span>
                )}
              </div>
            )}

            <div className="grid w-full grid-cols-3 items-start justify-items-center gap-x-3">
              {onToggleVideo && (
                <ControlButton
                  active={localVideoEnabled}
                  onClick={onToggleVideo}
                  ariaLabel={
                    localVideoEnabled ? "Desativar vídeo" : "Ativar vídeo"
                  }
                  label={localVideoEnabled ? "Vídeo" : "Ativar vídeo"}
                >
                  {localVideoEnabled ? (
                    <LucideVideo className="h-7 w-7" />
                  ) : (
                    <LucideVideoOff className="h-7 w-7" />
                  )}
                </ControlButton>
              )}

              {onToggleMute && (
                <ControlButton
                  active={isMuted}
                  onClick={onToggleMute}
                  ariaLabel={
                    isMuted ? "Ativar microfone" : "Desativar microfone"
                  }
                  label={isMuted ? "Ativar som" : "Silenciar"}
                >
                  {isMuted ? (
                    <LucideMicOff className="h-7 w-7" />
                  ) : (
                    <LucideMic className="h-7 w-7" />
                  )}
                </ControlButton>
              )}

              {onSwitchCamera && (
                <ControlButton
                  onClick={onSwitchCamera}
                  ariaLabel="Trocar câmera"
                  label="Trocar câmera"
                  disabled={!localVideoEnabled}
                >
                  <LucideRefreshCw className="h-7 w-7" />
                </ControlButton>
              )}
            </div>

            {onEndCall && (
              <button
                className="flex h-[74px] w-[74px] items-center justify-center rounded-full border border-red-400/50 bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700"
                onClick={onEndCall}
                aria-label="Encerrar chamada"
              >
                <LucidePhoneOff className="h-9 w-9" />
              </button>
            )}
          </div>
        </div>

        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 pointer-events-none z-5" />
        )}
      </div>
    </div>
  );
}
