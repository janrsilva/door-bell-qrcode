"use client";

import { cn } from "@/lib/utils";
import {
  LucideMic,
  LucideMicOff,
  LucideX,
  LucideVideo,
  LucideVideoOff,
} from "lucide-react";
import { useRef, useEffect } from "react";
import { AddressData, useAddress } from "@/contexts/AddressContext";
import AddressBlock from "./AdressBlock";

interface FullscreenVideoProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoEnabled: boolean;
  isMuted: boolean;
  role: "visitor" | "resident";
  callState: string;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onEndCall?: () => void;
}

export function FullscreenVideo({
  localStream,
  remoteStream,
  localVideoEnabled,
  isMuted,
  role,
  callState,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: FullscreenVideoProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoCornerRef = useRef<HTMLVideoElement>(null);
  const remoteVideoCornerRef = useRef<HTMLVideoElement>(null);
  const { addressData } = useAddress();

  // Lógica mais robusta: sempre tentar mostrar algo
  const showRemoteVideo = remoteStream && callState === "connected";
  const showLocalVideo = !showRemoteVideo && localStream;

  // Fallback: se conectado mas não há vídeo remoto, mostrar local
  const showFallbackLocal =
    callState === "connected" && !remoteStream && localStream;

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
  }, [localStream]);

  // Configurar vídeo remoto no canto
  useEffect(() => {
    if (remoteStream && remoteVideoCornerRef.current) {
      remoteVideoCornerRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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
  }: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
  }) => {
    return (
      <button
        className={cn(
          "w-16 h-16 bg-red-600 rounded-full hover:bg-red-700 transition-colors flex items-center justify-center",
          className,
        )}
        onClick={onClick}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden z-50">
      {addressData && (
        <div className="absolute top-1 left-1 right-1 z-30">
          <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
            <h1>
              <AddressBlock addressData={addressData as AddressData} />
            </h1>
          </div>
        </div>
      )}

      {/* Vídeo em tela cheia - sempre mostrar o que existe */}
      {showRemoteVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ backgroundColor: "black" }}
        />
      )}

      {showLocalVideo && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ backgroundColor: "black" }}
        />
      )}

      {/* Fallback: mostrar vídeo local se conectado mas sem vídeo remoto */}
      {showFallbackLocal && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ backgroundColor: "black" }}
        />
      )}

      {/* Vídeo menor no canto esquerdo inferior - ratio 9:16 para mobile */}
      <div className="absolute bottom-4 left-4 w-20 h-36 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-white/20 z-15">
        {/* Mostrar o vídeo oposto ao que está em tela cheia */}
        {showRemoteVideo && localStream && (
          <video
            ref={localVideoCornerRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {showLocalVideo && remoteStream && (
          <video
            ref={remoteVideoCornerRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Overlay com informações e controles */}
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

        <div className="flex items-center gap-2">
          {/* Controles de áudio e vídeo */}
          <div className="flex items-center gap-2">
            {onToggleMute && (
              <CircleButton
                className="bg-black/50 hover:bg-black/70 transition-colors"
                onClick={onToggleMute}
              >
                {isMuted ? <LucideMicOff /> : <LucideMic />}
              </CircleButton>
            )}

            {onToggleVideo && (
              <CircleButton
                className="bg-black/50 hover:bg-black/70 transition-colors"
                onClick={onToggleVideo}
              >
                {localVideoEnabled ? <LucideVideo /> : <LucideVideoOff />}
              </CircleButton>
            )}

            {/* Botão de encerrar/cancelar - muda baseado no estado */}
            {onEndCall && (
              <CircleButton onClick={onEndCall}>
                <LucideX
                  className="p-2 w-10 h-10"
                  aria-label="Encerrar chamada"
                />
              </CircleButton>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de conexão */}
      {callState !== "connected" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none z-5">
          <div className="text-center text-white">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm">
              {role === "visitor" ? "Chamando..." : "Aguardando atendimento..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
