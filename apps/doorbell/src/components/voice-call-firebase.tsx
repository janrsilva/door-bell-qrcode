"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref, update } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFirebaseRealtimeDatabase } from "@/lib/firebase-client";
import { useDoorbellWebRTC } from "@/hooks/useDoorbellWebRTC";
import { type Coordinates } from "@/lib/utils/latlong";

interface VisitSnapshot {
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
  onCallVisit?: string | null;
  visits?: Record<string, VisitSnapshot>;
}

interface Props {
  role: "visitor" | "resident";
  visitUuid?: string;
  addressUuid?: string;
  visit?: {
    uuid: string;
    address: {
      addressUuid: string;
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
    visitUuid,
    addressUuid,
    visit,
    visitorCoords,
    distance,
    onCallStart,
    onRequestLocation,
  } = props;

  const [currentVisitId, setCurrentVisitId] = useState<string | null>(
    role === "visitor" ? (visitUuid ?? null) : null
  );
  const currentVisitIdRef = useRef<string | null>(currentVisitId);
  const processedCandidatesRef = useRef<Set<string>>(new Set());
  const appliedAnswerRef = useRef<string | null>(null);

  useEffect(() => {
    currentVisitIdRef.current = currentVisitId;
  }, [currentVisitId]);

  useEffect(() => {
    if (role === "visitor") {
      setCurrentVisitId(visitUuid ?? null);
    }
  }, [role, visitUuid]);

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
    [role]
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
    enableLocalVideo,
    toggleMute,
    createOffer,
    acceptOffer,
    applyAnswer,
    applyIceCandidate,
    setError,
    reset,
  } = useDoorbellWebRTC((candidate) => {
    const visitId = currentVisitIdRef.current;
    if (!visitId) return;
    void postIceCandidate(visitId, candidate);
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const [callState, setCallState] = useState<
    "idle" | "calling" | "ringing" | "connected" | "ended"
  >("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false);

  const [visitData, setVisitData] = useState<VisitSnapshot | null>(null);
  // Resident: listen for onCallVisit changes on the address node
  useEffect(() => {
    if (role !== "resident" || !addressUuid) {
      return;
    }

    const db = getFirebaseRealtimeDatabase();
    const addressRef = ref(db, `addresses/${addressUuid}`);

    const unsubscribe = onValue(addressRef, (snapshot) => {
      const data = (snapshot.val() ?? null) as AddressSnapshot | null;

      const onCallVisitId = data?.onCallVisit ?? null;
      if (onCallVisitId && onCallVisitId !== currentVisitIdRef.current) {
        processedCandidatesRef.current.clear();
        appliedAnswerRef.current = null;
        setCurrentVisitId(onCallVisitId);
        setCallState("ringing");
        setStatusMessage("📞 Visitante chamando");
      }

      if (!onCallVisitId && role === "resident") {
        setCurrentVisitId(null);
        processedCandidatesRef.current.clear();
        appliedAnswerRef.current = null;
        if (callState !== "idle") {
          setCallState("idle");
        }
      }
    });

    return () => unsubscribe();
  }, [role, addressUuid, callState]);

  // Listen to visit node for offer/answer updates
  useEffect(() => {
    if (!currentVisitId) {
      setVisitData(null);
      return;
    }

    const db = getFirebaseRealtimeDatabase();
    const visitRef = ref(db, `visits/${currentVisitId}`);

    const unsubscribe = onValue(visitRef, (snapshot) => {
      const data = (snapshot.val() ?? null) as VisitSnapshot | null;
      setVisitData(data);
    });

    return () => unsubscribe();
  }, [currentVisitId]);

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

      applyIceCandidate(candidate).catch((error) => {
        console.error("❌ Erro ao aplicar ICE candidate:", error);
      });
    });
  }, [visitData?.iceCandidates, applyIceCandidate, role]);

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
    const id = currentVisitIdRef.current;
    if (!id) {
      throw new Error("Nenhuma visita ativa");
    }
    return id;
  }, []);

  const postOffer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      const id = ensureVisitId();
      try {
        setIsBusy(true);
        setStatusMessage("Enviando offer...");
        const response = await fetch(`/api/doorbell/${id}/offer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sdp: offer.sdp }),
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
    [ensureVisitId, setError]
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
    [ensureVisitId, setError]
  );

  const handleStartCall = useCallback(async () => {
    if (role !== "visitor") return;

    if (!currentVisitIdRef.current) {
      throw new Error("visitId não definido");
    }

    if (!visitorCoords && onRequestLocation) {
      const result = await onRequestLocation();
      if (!result.success) {
        setError("Localização necessária para iniciar chamada");
        return;
      }
    }

    if (distance !== null && distance > 50) {
      setError("Você está muito longe do endereço (máximo 50m)");
      return;
    }

    try {
      setStatusMessage(null);
      setError(null);
      setStatusMessage("Preparando chamada...");
      setCallState("calling");

      await ensureLocalStream({ withVideo: true });
      const offer = await createOffer({ withLocalVideo: true });

      processedCandidatesRef.current.clear();
      appliedAnswerRef.current = null;

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
    onRequestLocation,
    visitorCoords,
    distance,
    ensureLocalStream,
    createOffer,
    postOffer,
    setError,
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

      await ensureLocalStream({ withVideo: false });
      const answer = await acceptOffer(incomingOffer, {
        withLocalVideo: false,
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

  const effectiveAddressUuid = useMemo(() => {
    if (role === "visitor") {
      return visit?.address?.addressUuid ?? null;
    }
    return addressUuid ?? null;
  }, [role, visit?.address?.addressUuid, addressUuid]);

  const handleEndCall = useCallback(async () => {
    const visitId = currentVisitIdRef.current;

    setCallState("ended");
    setStatusMessage("Chamada encerrada");
    setIsWaitingForAnswer(false);
    processedCandidatesRef.current.clear();
    appliedAnswerRef.current = null;
    reset();

    if (!visitId) {
      return;
    }

    try {
      const db = getFirebaseRealtimeDatabase();
      const timestamp = new Date().toISOString();

      await update(ref(db, `visits/${visitId}`), {
        status: "ended",
        updatedAt: timestamp,
      });

      if (effectiveAddressUuid) {
        await update(
          ref(db, `addresses/${effectiveAddressUuid}/visits/${visitId}`),
          {
            status: "ended",
            updatedAt: timestamp,
          }
        );

        await update(ref(db, `addresses/${effectiveAddressUuid}`), {
          onCallVisit: null,
        });
      }
    } catch (error) {
      console.error("❌ Falha ao atualizar status da chamada:", error);
    }

    setCallState("idle");
    setCurrentVisitId(role === "visitor" ? currentVisitIdRef.current : null);
  }, [reset, role, effectiveAddressUuid, setCurrentVisitId]);

  const handleEnableCamera = useCallback(async () => {
    try {
      await enableLocalVideo();
      setStatusMessage("Câmera ativada");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao ativar câmera";
      setError(message);
      setStatusMessage(`❌ ${message}`);
    }
  }, [enableLocalVideo, setError]);

  const infoCards = useMemo(
    () => [
      { label: "Peer", value: connectionState },
      { label: "ICE", value: iceState },
      {
        label: "Gathering",
        value: iceGatheringState,
      },
    ],
    [connectionState, iceState, iceGatheringState]
  );

  const callAllowed =
    role === "visitor"
      ? visitorCoords !== null && (distance === null || distance <= 50)
      : Boolean(currentVisitId);

  const renderStreams = hasLocalStream || hasRemoteStream;

  return (
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

      {renderStreams && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Você</p>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="aspect-video w-full rounded bg-black object-cover"
            />
            <p className="text-xs text-muted-foreground">
              {localVideoEnabled ? "Câmera ativa" : "Apenas áudio"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Visitante</p>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="aspect-video w-full rounded bg-black object-cover"
            />
            <p className="text-xs text-muted-foreground">
              {hasRemoteStream ? "Conectado" : "Aguardando"}
            </p>
          </div>
        </div>
      )}

      {role === "visitor" ? (
        <div className="space-y-3">
          <Button
            onClick={handleStartCall}
            disabled={!callAllowed || isBusy || isWaitingForAnswer}
            className="w-full"
          >
            {callState === "connected" ? "✅ Conectado" : "📞 Iniciar Chamada"}
          </Button>
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
                onClick={handleEnableCamera}
                variant="outline"
                size="sm"
                disabled={localVideoEnabled}
              >
                📹 {localVideoEnabled ? "Câmera ativa" : "Ativar câmera"}
              </Button>
              <Button onClick={handleEndCall} variant="destructive" size="sm">
                ❌ Encerrar
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Visita atual: {currentVisitId ? currentVisitId : "nenhuma"}
          </div>
          <Button
            onClick={handleAcceptCall}
            disabled={!incomingOffer || isBusy || callState === "connected"}
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
                onClick={handleEnableCamera}
                variant="outline"
                size="sm"
                disabled={localVideoEnabled}
              >
                📹 {localVideoEnabled ? "Câmera ativa" : "Ativar câmera"}
              </Button>
              <Button onClick={handleEndCall} variant="destructive" size="sm">
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
  );
}
