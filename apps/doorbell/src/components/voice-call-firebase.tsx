"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFirebaseRealtimeDatabase } from "@/lib/firebase-client";
import { useDoorbellWebRTC } from "@/hooks/useDoorbellWebRTC";
import { useCallingSound } from "@/hooks/useCallingSound";
import { FullscreenVideo } from "@/components/FullscreenVideo";
import { type Coordinates } from "@/lib/utils/latlong";
import { useAddress } from "@/contexts/AddressContext";
import {
  MAX_DISTANCE,
  validateLocationFrontend,
} from "@/lib/utils/location-validation";

interface VisitSnapshot {
  uuid?: string;
  webRtcOffer?: { sdp: string; createdAt: string } | null;
  webRtcAnswer?: { sdp: string; createdAt: string } | null;
  status?: "offer_created" | "answered" | "ended" | string;
  iceCandidates?: Record<
    string,
    {
      candidate: string;
      sdpMLineIndex?: number | null;
      sdpMid?: string | null;
      from?: "visitor" | "resident";
      createdAt: string;
    }
  >;
}

interface AddressSnapshot {
  onCallVisit?: VisitSnapshot | null;
  visits?: Record<string, VisitSnapshot>;
}

interface Props {
  role: "visitor" | "resident";
  startVisitUuid?: string;
  addressUuid?: string;
  visit?: {
    uuid: string;
    address: {
      addressUuid: string;
      latitude?: number;
      longitude?: number;
    };
  };
  visitorCoords: Coordinates | null;
  distance: number | null;
  onCallStart?: () => Promise<void>;
  onRequestLocation?: () => Promise<{
    success: boolean;
    coords?: Coordinates;
    error?: string;
  }>;
}

export default function VoiceCallFirebase(props: Props) {
  const {
    role,
    addressUuid,
    startVisitUuid,
    visit,
    visitorCoords,
    distance,
    onCallStart,
    onRequestLocation,
  } = props;

  const processedCandidatesRef = useRef<Set<string>>(new Set());
  const appliedAnswerRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const postIceCandidate = useCallback(
    async (visitId: string, candidate: RTCIceCandidate) => {
      try {
        await fetch(`/api/doorbell/${visitId}/ice-candidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate: candidate.candidate,
            sdpMLineIndex: candidate.sdpMLineIndex ?? null,
            sdpMid: candidate.sdpMid ?? null,
            from: role,
          }),
        });
      } catch (error) {
        console.error("❌ Falha ao enviar ICE candidate:", error);
      }
    },
    [role],
  );

  const {
    connectionState,
    iceState,
    iceGatheringState,
    localStream,
    remoteStream,
    localVideoEnabled,
    remoteVideoEnabled,
    hasLocalStream,
    hasRemoteStream,
    isMuted,
    ensureLocalStream,
    toggleMute,
    toggleVideo,
    createOffer,
    acceptOffer,
    applyAnswer,
    applyIceCandidate,
    setError,
    reset,
  } = useDoorbellWebRTC((candidate) => {
    const visitId = startVisitUuid;
    if (!visitId) return;
    void postIceCandidate(visitId, candidate);
  });

  // Removido: localVideoRef e remoteVideoRef - agora gerenciados pelo FullscreenVideo

  const [callState, setCallState] = useState<
    "idle" | "calling" | "ringing" | "connected" | "ended"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);

  const [visitData, setVisitData] = useState<VisitSnapshot | null>(null);
  const { addressData } = useAddress();
  const endedProcessedRef = useRef(false);

  // Hook para reproduzir som de chamada (apenas para visitor)
  useCallingSound({
    isCalling:
      role === "visitor" &&
      (callState === "calling" || callState === "ringing"),
    isConnected: callState === "connected",
    soundFile: "calling-ring.mp3",
  });

  const cleanupCall = useCallback(
    async (updateFirebase: boolean, message: string) => {
      setStatusMessage(message);
      setIsWaitingForAnswer(false);
      processedCandidatesRef.current.clear();
      appliedAnswerRef.current = null;
      pendingIceCandidatesRef.current = [];
      endedProcessedRef.current = true;
      reset();
      setCallState("idle");

      if (updateFirebase) {
        // Determinar o visitId correto baseado no role
        const visitId = role === "visitor" ? startVisitUuid : visitData?.uuid;

        if (visitId) {
          try {
            const response = await fetch(`/api/doorbell/${visitId}/end`, {
              method: "POST",
            });

            if (!response.ok) {
              const payload = await response.json().catch(() => ({}));
              console.error("❌ Falha ao encerrar chamada via API:", payload);
            }
          } catch (error) {
            console.error("❌ Falha ao encerrar chamada via API:", error);
          }
        } else {
          console.warn(
            "⚠️ [CLEANUP] Nenhum visitId encontrado para encerrar chamada",
          );
        }
      }

      if (role === "resident") {
        setVisitData(null);
      }
    },
    [reset, role, startVisitUuid, visitData?.uuid],
  );

  const handleEndCall = useCallback(async () => {
    await cleanupCall(true, "Chamada encerrada");
  }, [cleanupCall]);

  useEffect(() => {
    if (role !== "resident" || !addressUuid) {
      return;
    }

    const db = getFirebaseRealtimeDatabase();
    const addressRef = ref(db, `addresses/${addressUuid}`);

    const unsubscribe = onValue(addressRef, (snapshot) => {
      const data = (snapshot.val() ?? null) as AddressSnapshot | null;
      const onCallVisit = data?.onCallVisit;
      const onCallVisitId = onCallVisit?.uuid;

      if (onCallVisitId) {
        processedCandidatesRef.current.clear();
        appliedAnswerRef.current = null;
        endedProcessedRef.current = false;
        setVisitData(onCallVisit);
        setCallState("ringing");
        setStatusMessage("📞 Visitante chamando");
      }

      // Se onCallVisit for null/undefined, encerrar automaticamente
      if (!onCallVisitId) {
        void cleanupCall(false, "Chamada encerrada pelo outro lado");
      }
    });

    return () => unsubscribe();
  }, [role, addressUuid, cleanupCall]);

  useEffect(() => {
    const status = visitData?.status;
    if (!status) {
      endedProcessedRef.current = false;
      return;
    }

    if (status === "ended") {
      if (!endedProcessedRef.current) {
        endedProcessedRef.current = true;
        void cleanupCall(false, "Chamada encerrada pelo outro lado");
      }
    } else {
      endedProcessedRef.current = false;
    }
  }, [visitData?.status, cleanupCall]);

  // Listen to visit node for offer/answer updates
  useEffect(() => {
    if (!startVisitUuid) {
      setVisitData(null);
      return;
    }

    const db = getFirebaseRealtimeDatabase();
    const onCallVisitRef = ref(db, `addresses/${addressUuid}/onCallVisit`);

    const unsubscribe = onValue(onCallVisitRef, (snapshot) => {
      const data = (snapshot.val() ?? null) as VisitSnapshot | null;
      setVisitData(data);
    });

    return () => unsubscribe();
  }, [startVisitUuid]);

  // Monitor visit status for visitor to detect when call is ended
  useEffect(() => {
    if (role !== "visitor" || !startVisitUuid) {
      return;
    }

    const db = getFirebaseRealtimeDatabase();
    const visitRef = ref(
      db,
      `addresses/${addressUuid}/visits/${startVisitUuid}`,
    );

    const unsubscribe = onValue(visitRef, (snapshot) => {
      const visitData = (snapshot.val() ?? null) as any;

      if (visitData?.status === "ended") {
        void cleanupCall(false, "Chamada encerrada pelo outro lado");
      }
    });

    return () => unsubscribe();
  }, [role, startVisitUuid, cleanupCall]);

  // Apply remote answer automatically for visitor
  useEffect(() => {
    if (role !== "visitor" || !visitData || !visitData.webRtcAnswer?.sdp) {
      return;
    }

    if (!isWaitingForAnswer) {
      return;
    }

    const serialized = visitData.webRtcAnswer.sdp;
    if (appliedAnswerRef.current === serialized) {
      return;
    }

    const answer: RTCSessionDescriptionInit = {
      type: "answer",
      sdp: serialized,
    };

    applyAnswer(answer)
      .then(() => {
        appliedAnswerRef.current = serialized;
        setIsWaitingForAnswer(false);
        setCallState("connected");
        setStatusMessage("✅ Chamada conectada");
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Erro ao aplicar answer";
        setError(message);
        setStatusMessage(`❌ ${message}`);
        setIsWaitingForAnswer(false);
      });
  }, [role, visitData, isWaitingForAnswer, applyAnswer, setError]);

  // Resident: cache incoming offer from visitData
  const incomingOffer = useMemo(() => {
    if (!visitData?.webRtcOffer?.sdp) return null;
    return {
      type: "offer" as const,
      sdp: visitData.webRtcOffer.sdp,
    } satisfies RTCSessionDescriptionInit;
  }, [visitData?.webRtcOffer?.sdp]);

  // Apply remote ICE candidates when they appear
  useEffect(() => {
    if (!visitData?.iceCandidates) return;

    Object.entries(visitData.iceCandidates).forEach(([key, payload]) => {
      if (processedCandidatesRef.current.has(key)) {
        return;
      }

      processedCandidatesRef.current.add(key);

      if (payload.from === role) {
        return; // ignore local candidates echoed back
      }

      if (!payload.candidate) {
        return;
      }

      const candidate: RTCIceCandidateInit = {
        candidate: payload.candidate,
        sdpMLineIndex: payload.sdpMLineIndex ?? undefined,
        sdpMid: payload.sdpMid ?? undefined,
      };

      // Se não há peer connection ativa, armazenar para aplicar depois
      if (connectionState === "unset") {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      applyIceCandidate(candidate).catch((error) => {
        console.error("❌ Erro ao aplicar ICE candidate:", error);
      });
    });
  }, [visitData?.iceCandidates, applyIceCandidate, role, connectionState]);

  // Apply pending ICE candidates when peer connection becomes available
  useEffect(() => {
    if (
      connectionState !== "unset" &&
      pendingIceCandidatesRef.current.length > 0
    ) {
      const candidatesToApply = [...pendingIceCandidatesRef.current];
      pendingIceCandidatesRef.current = [];

      candidatesToApply.forEach((candidate) => {
        applyIceCandidate(candidate).catch((error) => {
          console.error("❌ Erro ao aplicar ICE candidate pendente:", error);
        });
      });
    }
  }, [connectionState, applyIceCandidate]);

  useEffect(() => {
    if (connectionState === "connected" && callState !== "connected") {
      setCallState("connected");
    }

    if (
      ["disconnected", "failed", "closed"].includes(connectionState) &&
      callState === "connected"
    ) {
      setCallState("ended");
      setStatusMessage("Chamada finalizada");
    }
  }, [connectionState, callState]);

  const ensureVisitId = useCallback((): string => {
    // Para visitor, usa startVisitUuid
    if (role === "visitor") {
      const id = startVisitUuid;
      if (!id) {
        throw new Error("Nenhuma visita ativa");
      }
      return id;
    }

    // Para resident, usa o visitId da visita ativa detectada
    if (role === "resident") {
      const id = visitData?.uuid;
      if (!id) {
        throw new Error("Nenhuma visita ativa para aceitar");
      }
      return id;
    }

    throw new Error("Role não reconhecido");
  }, [role, startVisitUuid, visitData?.uuid]);

  const postOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const id = ensureVisitId();
      try {
        setIsBusy(true);
        setStatusMessage("Enviando offer...");

        // Obter localização atual do visitante
        let coords = visitorCoords;
        if (!coords && onRequestLocation) {
          const locationResult = await onRequestLocation();
          if (!locationResult.success || !locationResult.coords) {
            throw new Error("Localização necessária para iniciar chamada");
          }
          coords = locationResult.coords;
        }

        if (!coords) {
          throw new Error("Coordenadas não disponíveis");
        }

        const response = await fetch(`/api/doorbell/${id}/offer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sdp: offer.sdp,
            coords: coords,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || "Falha ao salvar offer");
        }

        setStatusMessage("✅ Offer enviada, aguardando resposta");
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao enviar offer";
        setError(message);
        setStatusMessage(`❌ ${message}`);
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [ensureVisitId, setError],
  );

  const postAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      const id = ensureVisitId();
      try {
        setIsBusy(true);
        setStatusMessage("Enviando answer...");
        const response = await fetch(`/api/doorbell/${id}/answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sdp: answer.sdp }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || "Falha ao salvar answer");
        }

        setStatusMessage("✅ Answer enviada");
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erro ao enviar answer";
        setError(message);
        setStatusMessage(`❌ ${message}`);
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [ensureVisitId, setError],
  );

  const handleStartCall = useCallback(async () => {
    if (role !== "visitor") return;

    if (!startVisitUuid) {
      throw new Error("visitId não definido");
    }

    // Obter coordenadas do visitante
    let currentCoords = visitorCoords;
    if (!currentCoords && onRequestLocation) {
      const result = await onRequestLocation();
      if (!result.success || !result.coords) {
        setError("Localização necessária para iniciar chamada");
        return;
      }
      currentCoords = result.coords;
    }

    if (!currentCoords) {
      setError("Coordenadas não disponíveis");
      return;
    }

    // Validar proximidade com o endereço
    if (visit?.address?.latitude && visit?.address?.longitude) {
      const addressCoords = {
        lat: visit.address.latitude,
        lon: visit.address.longitude,
      };

      const isValidLocation = validateLocationFrontend(
        currentCoords,
        addressCoords,
      );

      if (!isValidLocation) {
        setError(`Você está muito longe do endereço (máximo ${MAX_DISTANCE}m)`);
        return;
      }
    }

    try {
      setStatusMessage(null);
      setError(null);
      setStatusMessage("Preparando chamada...");
      setCallState("calling");

      await ensureLocalStream({ withVideo: true });
      const offer = await createOffer({
        receiveAudio: true,
        receiveVideo: true,
        withLocalVideo: true,
      });

      processedCandidatesRef.current.clear();
      appliedAnswerRef.current = null;
      pendingIceCandidatesRef.current = [];
      endedProcessedRef.current = false;

      const sent = await postOffer(offer);
      if (sent) {
        setIsWaitingForAnswer(true);
        setStatusMessage("Offer enviada. Aguardando answer do morador...");
        if (onCallStart) {
          await onCallStart();
        }
      } else {
        setCallState("idle");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao iniciar chamada";
      setError(message);
      setStatusMessage(`❌ ${message}`);
      setCallState("idle");
    }
  }, [
    role,
    startVisitUuid,
    visit,
    visitorCoords,
    onRequestLocation,
    setError,
    ensureLocalStream,
    createOffer,
    postOffer,
    onCallStart,
  ]);

  const handleAcceptCall = useCallback(async () => {
    if (role !== "resident") return;
    if (!incomingOffer) {
      setError("Offer ainda não disponível");
      return;
    }

    try {
      setStatusMessage(null);
      setIsBusy(true);
      setStatusMessage("Aceitando chamada...");

      processedCandidatesRef.current.clear();
      appliedAnswerRef.current = null;
      pendingIceCandidatesRef.current = [];
      endedProcessedRef.current = false;

      await ensureLocalStream({ withVideo: true });
      const answer = await acceptOffer(incomingOffer, {
        receiveAudio: true,
        receiveVideo: true,
        withLocalVideo: true,
      });
      const sent = await postAnswer(answer);

      if (sent) {
        setCallState("connected");
        setStatusMessage("Chamada conectada");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao aceitar chamada";
      setError(message);
      setStatusMessage(`❌ ${message}`);
    } finally {
      setIsBusy(false);
    }
  }, [
    role,
    incomingOffer,
    ensureLocalStream,
    acceptOffer,
    postAnswer,
    setError,
  ]);

  const infoCards = useMemo(
    () => [
      { label: "Peer", value: connectionState },
      { label: "ICE", value: iceState },
      {
        label: "Gathering",
        value: iceGatheringState,
      },
    ],
    [connectionState, iceState, iceGatheringState],
  );

  const callAllowed =
    role === "visitor"
      ? visitorCoords !== null &&
        (distance === null || distance <= MAX_DISTANCE)
      : Boolean(visitData?.uuid);

  const renderStreams = hasLocalStream || hasRemoteStream;
  const showFullscreenVideo = renderStreams && callState !== "idle";

  // Dados para o card de informações
  const subtitle = "";

  return (
    <div className="relative">
      {showFullscreenVideo ? (
        <FullscreenVideo
          localStream={localStream}
          remoteStream={remoteStream}
          localVideoEnabled={localVideoEnabled}
          isMuted={isMuted}
          role={role}
          callState={callState}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {role === "visitor" && (
            <Button
              size="lg"
              className="h-14 w-full text-lg"
              onClick={handleStartCall}
              disabled={
                !callAllowed ||
                isBusy ||
                isWaitingForAnswer ||
                callState === "calling" ||
                callState === "ringing"
              }
            >
              {callState === "connected"
                ? "✅ Conectado"
                : callState === "calling" || callState === "ringing"
                  ? "📞 Chamando..."
                  : "📞 CHAMADA DE VOZ"}
            </Button>
          )}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📞</div>
              <div>
                <h3 className="font-semibold">
                  {role === "visitor" ? "Chamada de Voz" : "Atendimento"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {role === "visitor"
                    ? "Fale diretamente com o morador"
                    : "Atenda chamadas dos visitantes"}
                </p>
              </div>
            </div>

            {statusMessage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                {statusMessage}
              </div>
            )}

            {role === "visitor" ? (
              <div className="space-y-3">
                {/* Botão de cancelar chamada - aparece quando está chamando */}
                {(callState === "calling" || callState === "ringing") && (
                  <Button
                    onClick={handleEndCall}
                    variant="destructive"
                    className="w-full"
                  >
                    ❌ Cancelar Chamada
                  </Button>
                )}

                <div className="flex gap-2 justify-between text-xs text-muted-foreground">
                  {infoCards.map((item) => (
                    <span key={item.label}>
                      <strong>{item.label}:</strong> {item.value}
                    </span>
                  ))}
                </div>
                {callState === "connected" && (
                  <div className="flex gap-2">
                    <Button onClick={toggleMute} variant="outline" size="sm">
                      {isMuted ? "🔊" : "🔇"}
                    </Button>
                    <Button
                      onClick={handleEndCall}
                      variant="destructive"
                      size="sm"
                    >
                      ❌ Encerrar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Visita atual: {visitData?.uuid ? visitData.uuid : "nenhuma"}
                </div>
                <Button
                  onClick={handleAcceptCall}
                  disabled={
                    !incomingOffer || isBusy || callState === "connected"
                  }
                  className="w-full"
                >
                  {incomingOffer ? "✅ Atender" : "Aguardando chamada"}
                </Button>
                {callState === "connected" && (
                  <div className="flex gap-2">
                    <Button onClick={toggleMute} variant="outline" size="sm">
                      {isMuted ? "🔊" : "🔇"}
                    </Button>
                    <Button
                      onClick={handleEndCall}
                      variant="destructive"
                      size="sm"
                    >
                      ❌ Encerrar
                    </Button>
                  </div>
                )}
                <div className="flex gap-2 justify-between text-xs text-muted-foreground">
                  {infoCards.map((item) => (
                    <span key={item.label}>
                      <strong>{item.label}:</strong> {item.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
