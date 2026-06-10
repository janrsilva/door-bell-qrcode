"use client";

import { cn } from "@/lib/utils";
import {
  LucideMic,
  LucideMicOff,
  LucidePhone,
  LucideVolume2,
  LucideX,
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
  onEndCall?: () => void;
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
  onEndCall,
}: FullscreenVideoProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoCornerRef = useRef<HTMLVideoElement>(null);
  const remoteVideoCornerRef = useRef<HTMLVideoElement>(null);
  const { addressData } = useAddress();
  const [showVolumeHint, setShowVolumeHint] = useState(false);

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
      : "Conectando vídeo do visitante..."
    : showRemoteVideo
      ? "Chamada conectada"
      : role === "visitor"
        ? "Morador atendeu sem vídeo"
        : "Chamada conectada sem vídeo";
  const statusDescription = !isConnected
    ? "Estabelecendo áudio e vídeo. Isso pode levar alguns segundos."
    : showRemoteVideo
      ? "Áudio e vídeo conectados."
      : role === "visitor"
        ? "Você está em chamada de voz. Sua câmera continua ativa para você."
        : "Áudio conectado. Aguardando vídeo remoto ficar disponível.";

  // Configurar stream local
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Configurar stream remoto
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.volume = 1;
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
      remoteVideoRef.current.volume = 1;
    }
  }, [remoteStream, showRemoteVideo]);

  // Forçar atualização do srcObject quando o vídeo é renderizado
  useEffect(() => {
    if (showRemoteVideo && remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.volume = 1;
    }
  }, [showRemoteVideo, remoteStream]);

  // Configurar vídeo local no canto
  useEffect(() => {
    if (localStream && localVideoCornerRef.current) {
      localVideoCornerRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Configurar vídeo remoto no canto
  useEffect(() => {
    if (remoteStream && remoteVideoCornerRef.current) {
      remoteVideoCornerRef.current.srcObject = remoteStream;
      remoteVideoCornerRef.current.volume = 1;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!isCallActive) {
      setShowVolumeHint(false);
      return;
    }

    setShowVolumeHint(true);
    const timeoutId = window.setTimeout(() => {
      setShowVolumeHint(false);
    }, 10000);

    return () => window.clearTimeout(timeoutId);
  }, [isCallActive]);

  // Forçar configuração do vídeo local no canto quando o elemento é renderizado
  useEffect(() => {
    if (localVideoCornerRef.current && localStream) {
      localVideoCornerRef.current.srcObject = localStream;
    }
  }, [localStream, showRemoteVideo]); // showRemoteVideo indica quando o vídeo do canto é renderizado

  const CircleButton = ({
    children,
    onClick,
    className,
    ariaLabel,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
    ariaLabel: string;
  }) => {
    return (
      <button
        className={cn(
          "w-16 h-16 bg-red-600 rounded-full hover:bg-red-700 transition-colors flex items-center justify-center",
          className,
        )}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white md:flex md:items-center md:justify-center">
      <div className="relative h-full w-full overflow-hidden bg-zinc-950 md:aspect-[9/16] md:h-[100dvh] md:w-auto md:max-h-[900px] md:shadow-2xl">
        {addressData && (
          <div className="absolute top-2 left-2 right-2 z-30">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
              <h1>
                <AddressBlock addressData={addressData as AddressData} />
              </h1>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f2937_0,#09090b_48%,#000_100%)]" />

        {showRemoteVideo && (
          <div className="absolute inset-0 w-full h-full">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ backgroundColor: "black" }}
            />
          </div>
        )}

        {showLocalMain && (
          <div className="absolute inset-0 w-full h-full">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              style={{ backgroundColor: "black" }}
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

        <div className="absolute bottom-4 left-4 w-20 h-36 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-white/20 z-15">
          {showRemoteVideo && localStream && hasLocalVideo && (
            <video
              ref={localVideoCornerRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          )}

          {showLocalMain && remoteStream && hasRemoteVideo && (
            <video
              ref={remoteVideoCornerRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          {((showRemoteVideo && !hasLocalVideo) ||
            (showLocalMain && !hasRemoteVideo) ||
            (!showRemoteVideo && !showLocalMain)) && (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-white/60">
              <LucideVideoOff className="h-7 w-7" />
            </div>
          )}
        </div>

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

        {showVolumeHint && (
          <div className="pointer-events-none absolute bottom-28 left-4 right-4 z-30 flex justify-center px-1">
            <div className="flex max-w-sm items-center gap-3 rounded-lg border border-white/20 bg-black/75 px-4 py-3 text-left text-white shadow-2xl backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <LucideVolume2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">
                  Som baixo na chamada?
                </p>
                <p className="mt-1 text-xs leading-5 text-white/75">
                  Use os botões laterais do celular para aumentar o volume da
                  chamada.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white z-25">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {isMuted && (
                <>
                  <div
                    className={`w-2 h-2 rounded-full ${isMuted ? "bg-red-500" : "bg-green-500"}`}
                  />
                  <span className="text-xs">{isMuted ? "Mudo" : ""}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!localVideoEnabled && (
                <>
                  <div className={`w-2 h-2 rounded-full bg-red-500`} />

                  <span className="text-xs">
                    {localVideoEnabled ? "" : "Sem câmera"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 z-50">
            {/* Controles de áudio e vídeo */}
            <div className="flex items-center gap-2">
              {onToggleMute && (
                <CircleButton
                  className="bg-black/80 hover:bg-black/90 transition-colors border border-white/30 shadow-lg"
                  onClick={onToggleMute}
                  ariaLabel={
                    isMuted ? "Ativar microfone" : "Desativar microfone"
                  }
                >
                  {isMuted ? (
                    <LucideMicOff className="text-white" />
                  ) : (
                    <LucideMic className="text-white" />
                  )}
                </CircleButton>
              )}

              {onToggleVideo && (
                <CircleButton
                  className="bg-black/80 hover:bg-black/90 transition-colors border border-white/30 shadow-lg"
                  onClick={onToggleVideo}
                  ariaLabel={
                    localVideoEnabled ? "Desativar vídeo" : "Ativar vídeo"
                  }
                >
                  {localVideoEnabled ? (
                    <LucideVideo className="text-white" />
                  ) : (
                    <LucideVideoOff className="text-white" />
                  )}
                </CircleButton>
              )}

              {/* Botão de encerrar/cancelar - muda baseado no estado */}
              {onEndCall && (
                <CircleButton
                  className="bg-red-600 hover:bg-red-700 border border-red-400/50 shadow-lg"
                  onClick={onEndCall}
                  ariaLabel="Encerrar chamada"
                >
                  <LucideX
                    className="p-2 w-10 h-10 text-white"
                    aria-label="Encerrar chamada"
                  />
                </CircleButton>
              )}
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 pointer-events-none z-5" />
        )}
      </div>
    </div>
  );
}
