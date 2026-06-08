"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { Button } from "@/components/ui/button";
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
  visitorPreview?: { dataUrl: string; createdAt: string } | null;
  status?: "offer_created" | "answered" | "ended" | string;
  createdAt?: string;
  updatedAt?: string;
  addressUuid?: string;
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

function isAnswerableVisit(
  visit: VisitSnapshot | null | undefined,
): visit is VisitSnapshot & { uuid: string; webRtcOffer: { sdp: string; createdAt: string } } {
  return (
    Boolean(visit?.uuid) &&
    Boolean(visit?.webRtcOffer?.sdp) &&
    visit?.status !== "ended"
  );
}

function getRequestedVisitId() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  return params.get("call") || params.get("voiceCall");
}

function findLatestAnswerableVisit(
  visits: Record<string, VisitSnapshot> | undefined,
): VisitSnapshot | null {
  const answerableVisits = Object.entries(visits ?? {})
    .map(([visitId, visit]) => ({ ...visit, uuid: visit.uuid || visitId }))
    .filter(isAnswerableVisit);

  return answerableVisits.sort((a, b) => {
    const timeA = Date.parse(a.webRtcOffer?.createdAt || a.createdAt || "");
    const timeB = Date.parse(b.webRtcOffer?.createdAt || b.createdAt || "");
    return (Number.isFinite(timeB) ? timeB : 0) -
      (Number.isFinite(timeA) ? timeA : 0);
  })[0] ?? null;
}

function resolveResidentVisit(data: AddressSnapshot | null) {
  if (!data) return null;

  if (isAnswerableVisit(data.onCallVisit)) {
    return data.onCallVisit;
  }

  const requestedVisitId = getRequestedVisitId();
  if (requestedVisitId) {
    const requestedVisit = data.visits?.[requestedVisitId];

    if (isAnswerableVisit(requestedVisit)) {
      return { ...requestedVisit, uuid: requestedVisit.uuid || requestedVisitId };
    }
  }

  return findLatestAnswerableVisit(data.visits);
}

async function captureVideoPreview(
  stream: MediaStream,
): Promise<string | null> {
  const [videoTrack] = stream.getVideoTracks();
  if (!videoTrack) return null;

  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  try {
    await video.play();
    await new Promise<void>((resolve) => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        resolve();
        return;
      }

      video.onloadeddata = () => resolve();
    });

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = Math.max((video.videoWidth - size) / 2, 0);
    const sy = Math.max((video.videoHeight - size) / 2, 0);

    context.drawImage(video, sx, sy, size, size, 0, 0, 160, 160);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch (error) {
    console.warn("Não foi possível capturar preview do visitante", error);
    return null;
  } finally {
    video.srcObject = null;
  }
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
  disabled?: boolean;
  embedded?: boolean;
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
    disabled = false,
    embedded = false,
    onCallStart,
    onRequestLocation,
  } = props;

  const processedCandidatesRef = useRef<Set<string>>(new Set());
  const appliedAnswerRef = useRef<string | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const activeVisitIdRef = useRef<string | null>(null);
  const activeOfferRef = useRef<string | null>(null);

  const postIceCandidate = useCallback(
    async (visitId: string, candidate: RTCIceCandidate) => {
      if (!candidate.candidate) return;

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
    const visitId =
      role === "visitor" ? startVisitUuid : activeVisitIdRef.current;
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

      // Limpar todos os refs e estados
      processedCandidatesRef.current.clear();
      appliedAnswerRef.current = null;
      pendingIceCandidatesRef.current = [];
      endedProcessedRef.current = true;
      activeVisitIdRef.current = null;
      activeOfferRef.current = null;

      // Resetar WebRTC e estado da chamada
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
      const onCallVisit = resolveResidentVisit(data);
      const onCallVisitId = onCallVisit?.uuid;
      const onCallOfferId = onCallVisit?.webRtcOffer
        ? `${onCallVisitId}:${onCallVisit.webRtcOffer.createdAt}`
        : null;

      if (onCallVisitId) {
        if (activeOfferRef.current !== onCallOfferId) {
          reset();
          processedCandidatesRef.current.clear();
          appliedAnswerRef.current = null;
          pendingIceCandidatesRef.current = [];
          endedProcessedRef.current = false;
          activeVisitIdRef.current = onCallVisitId;
          activeOfferRef.current = onCallOfferId;
        }

        setVisitData(onCallVisit);
        if (onCallVisit.status !== "answered") {
          setCallState("ringing");
          setStatusMessage("📞 Visitante chamando");
        }
      }

      // Se uma chamada ativa sumiu do Firebase, encerrar automaticamente
      if (!onCallVisitId && activeVisitIdRef.current) {
        void cleanupCall(false, "Chamada encerrada pelo outro lado");
      }
    });

    return () => unsubscribe();
  }, [role, addressUuid, cleanupCall, callState, reset]);

  useEffect(() => {
    const status = visitData?.status;
    if (!status) {
      endedProcessedRef.current = false;
      return;
    }

    // Só processar se for visitor e estiver esperando answer
    if (role === "visitor" && !isWaitingForAnswer) {
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
  }, [visitData?.status, cleanupCall, role, isWaitingForAnswer]);

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

      // Para visitor, só atualizar visitData se não estiver no meio de uma chamada
      if (
        role === "visitor" &&
        callState === "calling" &&
        !isWaitingForAnswer
      ) {
        return;
      }

      setVisitData(data);
    });

    return () => unsubscribe();
  }, [startVisitUuid, addressUuid, role, callState, isWaitingForAnswer]);

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
  }, [role, startVisitUuid, addressUuid, cleanupCall]);

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
        const candidatesToApply = [...pendingIceCandidatesRef.current];
        pendingIceCandidatesRef.current = [];
        candidatesToApply.forEach((candidate) => {
          applyIceCandidate(candidate).catch((error) => {
            console.error("❌ Erro ao aplicar ICE candidate pendente:", error);
          });
        });
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
  }, [
    role,
    visitData,
    isWaitingForAnswer,
    applyAnswer,
    applyIceCandidate,
    setError,
  ]);

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

    // Não processar ICE candidates se a chamada foi encerrada
    if (callState === "ended" || callState === "idle") {
      return;
    }

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

      // O visitante só pode aplicar candidates remotos depois de aplicar a
      // answer. Antes disso, o RTCPeerConnection ainda não tem remoteDescription.
      if (role === "visitor" && !appliedAnswerRef.current) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      // Se não há peer connection ativa, armazenar para aplicar depois
      if (connectionState === "unset") {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      applyIceCandidate(candidate).catch((error) => {
        console.error("❌ Erro ao aplicar ICE candidate:", error);
      });
    });
  }, [
    visitData?.iceCandidates,
    applyIceCandidate,
    role,
    connectionState,
    callState,
  ]);

  // Apply pending ICE candidates when peer connection becomes available
  useEffect(() => {
    if (
      connectionState !== "unset" &&
      pendingIceCandidatesRef.current.length > 0 &&
      callState !== "ended" &&
      callState !== "idle" &&
      (role !== "visitor" || Boolean(appliedAnswerRef.current))
    ) {
      const candidatesToApply = [...pendingIceCandidatesRef.current];
      pendingIceCandidatesRef.current = [];

      candidatesToApply.forEach((candidate) => {
        applyIceCandidate(candidate).catch((error) => {
          console.error("❌ Erro ao aplicar ICE candidate pendente:", error);
        });
      });
    }
  }, [connectionState, applyIceCandidate, callState, role]);

  useEffect(() => {
    if (connectionState === "connected" && callState !== "connected") {
      setCallState("connected");
    }

    if (
      ["failed", "closed"].includes(connectionState) &&
      callState === "connected"
    ) {
      void cleanupCall(true, "Chamada finalizada");
    }
  }, [connectionState, callState, cleanupCall]);

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
    async (
      offer: RTCSessionDescriptionInit,
      coords: Coordinates,
      visitorPreviewDataUrl?: string | null,
    ) => {
      const id = ensureVisitId();
      try {
        setIsBusy(true);
        setStatusMessage("Enviando offer...");

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
            visitorPreviewDataUrl,
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

    // SEMPRE solicitar localização do navegador ao clicar em CHAMADA
    let currentCoords: Coordinates | null = null;
    if (onRequestLocation) {
      setStatusMessage("📍 Obtendo localização...");
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
      reset();

      // Limpar estados antes de iniciar
      processedCandidatesRef.current.clear();
      appliedAnswerRef.current = null;
      pendingIceCandidatesRef.current = [];
      endedProcessedRef.current = false;
      activeVisitIdRef.current = startVisitUuid;
      activeOfferRef.current = null;

      const stream = await ensureLocalStream({ withVideo: true });
      const visitorPreviewDataUrl = await captureVideoPreview(stream);
      const offer = await createOffer({
        receiveAudio: true,
        receiveVideo: true,
        withLocalVideo: true,
      });

      const sent = await postOffer(offer, currentCoords, visitorPreviewDataUrl);
      if (sent) {
        // Aguardar um pouco para garantir que o Firebase foi atualizado
        await new Promise((resolve) => setTimeout(resolve, 100));

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
    onRequestLocation,
    setError,
    reset,
    ensureLocalStream,
    createOffer,
    postOffer,
    onCallStart,
  ]);

  const handleAcceptCall = useCallback(async (withVideo: boolean) => {
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
      activeVisitIdRef.current = visitData?.uuid ?? null;

      await ensureLocalStream({ withVideo });
      const answer = await acceptOffer(incomingOffer, {
        receiveAudio: true,
        receiveVideo: true,
        withLocalVideo: withVideo,
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
    visitData?.uuid,
  ]);

  const handleRejectCall = useCallback(async () => {
    if (role !== "resident" || !visitData?.uuid) return;

    await cleanupCall(true, "Chamada recusada");
  }, [role, visitData?.uuid, cleanupCall]);

  const callAllowed =
    !disabled &&
    (role === "visitor"
      ? visitorCoords !== null &&
        (distance === null || distance <= MAX_DISTANCE)
      : Boolean(visitData?.uuid));

  const isActiveVisitorCall =
    role === "visitor" &&
    (callState === "calling" ||
      callState === "ringing" ||
      callState === "connected");
  const renderStreams = hasLocalStream || hasRemoteStream;
  const showFullscreenVideo =
    isActiveVisitorCall || (renderStreams && callState !== "idle");

  return (
    <div className="relative">
      {showFullscreenVideo ? (
        <FullscreenVideo
          localStream={localStream}
          remoteStream={remoteStream}
          localVideoEnabled={localVideoEnabled}
          remoteVideoEnabled={remoteVideoEnabled}
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
                  : "📞 CHAMADA"}
            </Button>
          )}
          <div
            className={
              embedded
                ? "space-y-4"
                : "rounded-lg border bg-card p-4 text-card-foreground shadow-sm space-y-4"
            }
          >
            {!embedded && (
              <div className="flex items-center gap-3">
                <div className="text-2xl">📞</div>
                <div>
                  <h3 className="font-semibold">
                    {role === "visitor" ? "Chamada" : "Atendimento"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {role === "visitor"
                      ? "Fale diretamente com o morador"
                      : "Atenda chamadas dos visitantes"}
                  </p>
                </div>
              </div>
            )}

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
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xl">
                    {visitData?.visitorPreview?.dataUrl ? (
                      <img
                        src={visitData.visitorPreview.dataUrl}
                        alt="Prévia do visitante"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>📞</span>
                    )}
                  </div>
                  <div className="min-w-0 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      {incomingOffer ? "Visitante chamando" : "Sem chamada"}
                    </p>
                    <p className="truncate">
                      Visita atual:{" "}
                      {visitData?.uuid ? visitData.uuid : "nenhuma"}
                    </p>
                  </div>
                </div>
                {incomingOffer ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      onClick={() => handleAcceptCall(false)}
                      disabled={isBusy || callState === "connected"}
                      className="w-full"
                    >
                      ✅ Atender
                    </Button>
                    <Button
                      onClick={() => handleAcceptCall(true)}
                      disabled={isBusy || callState === "connected"}
                      className="w-full"
                      variant="outline"
                    >
                      📹 Atender com vídeo
                    </Button>
                    <Button
                      onClick={handleRejectCall}
                      disabled={isBusy || callState === "connected"}
                      className="w-full"
                      variant="destructive"
                    >
                      Recusar
                    </Button>
                  </div>
                ) : (
                  <Button disabled className="w-full">
                    Aguardando chamada
                  </Button>
                )}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
