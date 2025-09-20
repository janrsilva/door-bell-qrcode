"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { webRTCService, type CallState } from "@/lib/services/webrtc-service";
import { type Coordinates } from "@/lib/utils/latlong";
import { getSimpleLocationInstructions } from "@/lib/utils/location-instructions";

interface VoiceCallProps {
  visit: {
    uuid: string;
    isExpired?: boolean;
  };
  visitorCoords?: Coordinates | null;
  distance?: number | null;
  onCallStart?: () => void;
  onRequestLocation?: () => Promise<{
    success: boolean;
    coords?: Coordinates;
    error?: string;
  }>;
}

export default function VoiceCall({
  visit,
  visitorCoords,
  distance,
  onCallStart,
  onRequestLocation,
}: VoiceCallProps) {
  const [callState, setCallState] = useState<CallState>({
    status: "idle",
    isInitiator: false,
    isMuted: false,
    isSpeakerOn: true,
  });
  const [showVolumeWarning, setShowVolumeWarning] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [isCheckingVolume, setIsCheckingVolume] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle remote stream
  const handleRemoteStream = (stream: MediaStream | null) => {
    if (remoteAudioRef.current && stream) {
      remoteAudioRef.current.srcObject = stream;
      remoteAudioRef.current.play().catch(console.error);
    }
  };

  // Check volume before starting call
  const checkVolumeLevel = async (): Promise<boolean> => {
    try {
      setIsCheckingVolume(true);

      // Request microphone access temporarily to check volume
      const tempStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(tempStream);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      return new Promise((resolve) => {
        let samples = 0;
        let maxVolume = 0;

        const checkInterval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }

          const average = sum / bufferLength;
          maxVolume = Math.max(maxVolume, average);
          samples++;

          if (samples >= 10) {
            // 1 second of samples
            clearInterval(checkInterval);
            audioContext.close();
            tempStream.getTracks().forEach((track) => track.stop());

            const isLowVolume = maxVolume < 15; // Threshold for low volume
            resolve(isLowVolume);
          }
        }, 100);
      });
    } catch (error) {
      console.error("Error checking volume:", error);
      return false; // Assume volume is OK if we can't check
    } finally {
      setIsCheckingVolume(false);
    }
  };

  // Start voice call
  const startCall = async () => {
    console.log("🚀 === INÍCIO STARTCALL (FRONTEND) ===");
    console.log("📍 visitorCoords:", visitorCoords);
    console.log("📏 distance:", distance);
    console.log("🏠 visit.uuid:", visit.uuid);

    // Check location first
    if (!visitorCoords) {
      console.log(
        "❌ Sem coordenadas do visitante - mostrando modal de localização"
      );
      setShowLocationDialog(true);
      return;
    }

    // Check distance
    if (distance !== null && distance !== undefined && distance > 50) {
      console.log(`❌ Muito longe! Distância: ${distance}m`);
      alert(
        `🚫 Muito longe! Você está a ${distance}m do endereço. Máximo permitido: 50m`
      );
      return;
    }

    try {
      console.log("🔊 Pulando verificação de volume para teste...");
      // TODO: Reativar verificação de volume depois
      // const isLowVolume = await checkVolumeLevel();
      // if (isLowVolume) {
      //   setShowVolumeWarning(true);
      //   return;
      // }

      console.log("🔔 Disparando callback onCallStart...");
      // Trigger doorbell ring first
      if (onCallStart) {
        onCallStart();
        console.log("✅ onCallStart executado");
      } else {
        console.log("⚠️ onCallStart não definido");
      }

      console.log("📞 Iniciando WebRTC call...");
      console.log("🔧 webRTCService:", webRTCService);
      console.log("🔧 setCallState:", typeof setCallState);
      console.log("🔧 handleRemoteStream:", typeof handleRemoteStream);

      // Start WebRTC call
      await webRTCService.initializeCall(
        visit.uuid,
        setCallState,
        handleRemoteStream
      );
      console.log("✅ WebRTC call inicializada com sucesso");
    } catch (error) {
      console.error("❌ === ERRO NO STARTCALL (FRONTEND) ===");
      console.error("❌ Tipo do erro:", typeof error);
      console.error(
        "❌ Nome do erro:",
        error instanceof Error ? error.name : "N/A"
      );
      console.error(
        "❌ Mensagem:",
        error instanceof Error ? error.message : String(error)
      );
      console.error("❌ Stack:", error instanceof Error ? error.stack : "N/A");
      console.error("❌ Erro completo:", error);

      setCallState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to start call",
      }));
    }
  };

  // End call
  const endCall = () => {
    webRTCService.endCall();
  };

  // Toggle mute
  const toggleMute = () => {
    webRTCService.toggleMute();
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    webRTCService.setSpeakerMode(!callState.isSpeakerOn);
  };

  // Proceed with low volume
  const proceedWithLowVolume = async () => {
    setShowVolumeWarning(false);

    try {
      // Trigger doorbell ring first
      if (onCallStart) {
        onCallStart();
      }

      // Start WebRTC call
      await webRTCService.initializeCall(
        visit.uuid,
        setCallState,
        handleRemoteStream
      );
    } catch (error) {
      console.error("Error starting call:", error);
      setCallState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Failed to start call",
      }));
    }
  };

  // Register visitor subscription for receiving WebRTC signals
  useEffect(() => {
    const registerVisitorSubscription = async () => {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();

          if (subscription) {
            // Registrar subscription temporária para este visitId
            await fetch("/api/visitor-subscribe", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                visitId: visit.uuid,
                subscription: subscription,
              }),
            });

            console.log("✅ Visitor subscription registrada para", visit.uuid);
          }
        } catch (error) {
          console.warn("Could not register visitor subscription:", error);
        }
      }
    };

    registerVisitorSubscription();

    // Cleanup on unmount only (not on status change)
    return () => {
      console.log("🧹 Cleanup executado - status atual:", callState.status);
      if (callState.status !== "idle" && callState.status !== "ended") {
        console.log("🛑 Encerrando chamada no cleanup");
        webRTCService.endCall();
      } else {
        console.log("✅ Não precisa encerrar - status:", callState.status);
      }
    };
  }, [visit.uuid]); // Removido callState.status das dependências!

  // Render call interface based on state
  const renderCallInterface = () => {
    switch (callState.status) {
      case "calling":
        return (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="text-center space-y-3">
              <div className="text-2xl">📞</div>
              <h3 className="font-semibold text-blue-900">Chamando...</h3>
              <p className="text-sm text-blue-700">
                Aguardando o morador atender a chamada
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={endCall}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  ❌ Encerrar
                </Button>
              </div>
            </div>
          </Card>
        );

      case "connected":
        return (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-center space-y-3">
              <div className="text-2xl">🎙️</div>
              <h3 className="font-semibold text-green-900">
                Em chamada{" "}
                {callState.duration
                  ? `- ${formatDuration(callState.duration)}`
                  : ""}
              </h3>
              <p className="text-sm text-green-700">
                Você está conectado com o morador
              </p>

              {/* Call controls */}
              <div className="flex justify-center gap-2">
                <Button
                  onClick={toggleMute}
                  variant={callState.isMuted ? "destructive" : "outline"}
                  size="sm"
                  className={
                    callState.isMuted ? "bg-red-600 hover:bg-red-700" : ""
                  }
                >
                  {callState.isMuted ? "🔇 Mutado" : "🎤 Mic"}
                </Button>

                <Button
                  onClick={toggleSpeaker}
                  variant={callState.isSpeakerOn ? "default" : "outline"}
                  size="sm"
                  className={
                    callState.isSpeakerOn ? "bg-blue-600 hover:bg-blue-700" : ""
                  }
                >
                  {callState.isSpeakerOn ? "🔊 Alto-falante" : "🔇 Fone"}
                </Button>

                <Button
                  onClick={endCall}
                  variant="destructive"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  📞 Desligar
                </Button>
              </div>
            </div>
          </Card>
        );

      case "ended":
        return (
          <Card className="p-4 bg-gray-50 border-gray-200">
            <div className="text-center space-y-2">
              <div className="text-2xl">📞</div>
              <h3 className="font-semibold text-gray-900">Chamada encerrada</h3>
              <p className="text-sm text-gray-600">A chamada foi finalizada</p>
            </div>
          </Card>
        );

      case "error":
        return (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="text-center space-y-2">
              <div className="text-2xl">❌</div>
              <h3 className="font-semibold text-red-900">Erro na chamada</h3>
              <p className="text-sm text-red-700">
                {callState.error || "Ocorreu um erro durante a chamada"}
              </p>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Voice Call Button */}
      {callState.status === "idle" && (
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full text-lg border-green-200 bg-green-50 hover:bg-green-100 text-green-800"
          onClick={startCall}
          disabled={visit.isExpired || isCheckingVolume}
        >
          {visit.isExpired
            ? "⏰ TEMPO EXPIRADO"
            : isCheckingVolume
              ? "🔊 Verificando volume..."
              : "📞 CHAMADA DE VOZ"}
        </Button>
      )}

      {/* Call Interface */}
      {callState.status !== "idle" && renderCallInterface()}

      {/* Remote Audio Element */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />

      {/* Volume Warning Dialog */}
      <Dialog open={showVolumeWarning} onOpenChange={setShowVolumeWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🔊 Volume Baixo Detectado</DialogTitle>
            <DialogDescription>
              Detectamos que o volume do seu dispositivo está baixo. Para uma
              melhor experiência na chamada, recomendamos aumentar o volume.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl">⚠️</div>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Recomendações:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Aumente o volume do dispositivo</li>
                  <li>Certifique-se que não está no modo silencioso</li>
                  <li>Use fones de ouvido para melhor qualidade</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowVolumeWarning(false)}
            >
              ❌ Cancelar
            </Button>
            <Button
              onClick={proceedWithLowVolume}
              className="bg-green-600 hover:bg-green-700"
            >
              📞 Continuar mesmo assim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Permission Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📍 Localização Necessária</DialogTitle>
            <DialogDescription>
              Para fazer uma chamada de voz, precisamos verificar se você está
              próximo ao endereço (máximo 50 metros). Após permitir, você poderá
              tentar a chamada novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl">🛡️</div>
              <div className="text-sm text-blue-800">
                <p className="font-medium">A localização é usada para:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Verificar proximidade com o endereço</li>
                  <li>Prevenir uso indevido da chamada</li>
                  <li>Não é armazenada ou compartilhada</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl">⚠️</div>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Já negou a localização antes?</p>
                <p>
                  Se você já negou a permissão, será necessário reativar
                  manualmente nas configurações do navegador.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLocationDialog(false)}
            >
              ❌ Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!onRequestLocation) {
                  setShowLocationDialog(false);
                  return;
                }

                const result = await onRequestLocation();

                if (result.success) {
                  setShowLocationDialog(false);
                  // Localização obtida, mas não chamar startCall recursivamente
                  // O componente pai já atualizou visitorCoords e distance

                  // Mostrar feedback positivo
                  setCallState((prev) => ({
                    ...prev,
                    status: "idle", // Manter idle para permitir nova tentativa
                  }));

                  // Usuário pode tentar clicar no botão novamente agora
                } else {
                  setShowLocationDialog(false);

                  if (result.error === "permission_denied") {
                    // Mostrar instruções para reativar
                    const instructions = getSimpleLocationInstructions();
                    alert(instructions);
                  } else {
                    setCallState((prev) => ({
                      ...prev,
                      status: "error",
                      error: result.error || "Erro ao obter localização",
                    }));
                  }
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              📍 Permitir Localização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
