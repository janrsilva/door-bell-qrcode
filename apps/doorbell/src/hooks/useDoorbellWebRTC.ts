import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export type ConnectionState = RTCPeerConnectionState | "unset";
export type IceState = RTCIceConnectionState | "unset";

type EnsureLocalStreamOptions = {
  withVideo: boolean;
};

type CreateOfferOptions = {
  receiveAudio?: boolean;
  receiveVideo?: boolean;
  withLocalVideo?: boolean;
};

type CreateAnswerOptions = {
  receiveAudio?: boolean;
  receiveVideo?: boolean;
  withLocalVideo?: boolean;
};

export interface DoorbellWebRTCState {
  connectionState: ConnectionState;
  iceState: IceState;
  iceGatheringState: RTCIceGatheringState;
  localDescription: RTCSessionDescriptionInit | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localVideoEnabled: boolean;
  remoteVideoEnabled: boolean;
  hasLocalStream: boolean;
  hasRemoteStream: boolean;
  isMuted: boolean;
  error: string | null;
}

export interface DoorbellWebRTCControls {
  ensureLocalStream(options: EnsureLocalStreamOptions): Promise<MediaStream>;
  enableLocalVideo(): Promise<void>;
  toggleMute(): void;
  toggleVideo(): Promise<void>;
  createOffer(options?: CreateOfferOptions): Promise<RTCSessionDescriptionInit>;
  acceptOffer(
    offer: RTCSessionDescriptionInit,
    options?: CreateAnswerOptions,
  ): Promise<RTCSessionDescriptionInit>;
  applyAnswer(answer: RTCSessionDescriptionInit): Promise<void>;
  sendIceCandidate(candidate: RTCIceCandidate, visitId: string): Promise<void>;
  applyIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
  setError(message: string | null): void;
  reset(): void;
}

export function useDoorbellWebRTC(
  onIceCandidateCallback?: (candidate: RTCIceCandidate) => void,
): DoorbellWebRTCState & DoorbellWebRTCControls {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("unset");
  const [iceState, setIceState] = useState<IceState>("unset");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [iceGatheringState, setIceGatheringState] =
    useState<RTCIceGatheringState>("new");
  const [localDescription, setLocalDescription] =
    useState<RTCSessionDescriptionInit | null>(null);

  const updateRemoteMediaElements = useCallback(
    (stream: MediaStream | null) => {
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    },
    [],
  );

  const updateConnectionState = useCallback((pc: RTCPeerConnection) => {
    setConnectionState(pc.connectionState ?? "unset");
    setIceState(pc.iceConnectionState ?? "unset");
  }, []);

  const cleanUpPeerConnection = useCallback(() => {
    peerRef.current?.ontrack && (peerRef.current.ontrack = null);
    peerRef.current?.onicecandidate && (peerRef.current.onicecandidate = null);
    peerRef.current?.onconnectionstatechange &&
      (peerRef.current.onconnectionstatechange = null);
    peerRef.current?.oniceconnectionstatechange &&
      (peerRef.current.oniceconnectionstatechange = null);
    peerRef.current?.close();
    peerRef.current = null;
    videoSenderRef.current = null;
  }, []);

  const createPeerConnection = useCallback(() => {
    cleanUpPeerConnection();

    const pc = new RTCPeerConnection(rtcConfig);
    peerRef.current = pc;

    setConnectionState(pc.connectionState ?? "unset");
    setIceState(pc.iceConnectionState ?? "unset");
    setIceGatheringState(pc.iceGatheringState);
    setHasRemoteStream(false);
    setRemoteVideoEnabled(false);
    updateRemoteMediaElements(null);
    setLocalDescription(null);

    pc.onconnectionstatechange = () => {
      updateConnectionState(pc);
    };

    pc.oniceconnectionstatechange = () => {
      updateConnectionState(pc);
      if (pc.iceConnectionState === "failed") {
        setErrorState(
          "Não foi possível estabelecer a conexão da chamada. Tente novamente.",
        );
      }
    };

    pc.onicecandidate = (event) => {
      setLocalDescription(pc.localDescription ?? null);
      if (event.candidate?.candidate) {
        // ICE candidate será enviado via callback externo se fornecido
        if (onIceCandidateCallback) {
          onIceCandidateCallback(event.candidate);
        }
      }
    };

    pc.onicecandidateerror = (event) => {
      console.warn("ICE candidate warning", {
        url: event.url,
        errorCode: event.errorCode,
        errorText: event.errorText,
        iceState: pc.iceConnectionState,
        connectionState: pc.connectionState,
      });

      if (
        pc.iceConnectionState === "failed" ||
        pc.connectionState === "failed"
      ) {
        setErrorState(
          "Não foi possível estabelecer a conexão da chamada. Tente novamente.",
        );
      }
    };

    pc.onicegatheringstatechange = () => {
      setIceGatheringState(pc.iceGatheringState);
      setLocalDescription(pc.localDescription ?? null);
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) {
        return;
      }

      updateRemoteMediaElements(stream);
      setHasRemoteStream(true);
      setRemoteVideoEnabled(
        stream.getVideoTracks().length > 0 || event.track.kind === "video",
      );

      const handleTrackUpdate = () => {
        setRemoteVideoEnabled(stream.getVideoTracks().length > 0);
      };

      stream.addEventListener("addtrack", handleTrackUpdate);
      stream.addEventListener("removetrack", handleTrackUpdate);
    };

    return pc;
  }, [
    cleanUpPeerConnection,
    updateConnectionState,
    updateRemoteMediaElements,
    onIceCandidateCallback,
  ]);

  const enableLocalVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) {
      throw new Error("Inicie o áudio antes de ativar a câmera.");
    }

    if (stream.getVideoTracks().length > 0) {
      setLocalVideoEnabled(true);
      return;
    }

    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: "user",
      },
      audio: false,
    });

    const [videoTrack] = videoStream.getVideoTracks();
    if (!videoTrack) {
      throw new Error("Não foi possível ativar a câmera local.");
    }

    stream.addTrack(videoTrack);
    localVideoTrackRef.current = videoTrack;

    const pc = peerRef.current;
    if (pc) {
      let sender = videoSenderRef.current;

      if (!sender) {
        sender =
          pc
            .getSenders()
            .find((currentSender) => currentSender.track?.kind === "video") ||
          null;

        if (!sender) {
          sender = pc.addTransceiver("video", { direction: "sendrecv" }).sender;
        }

        videoSenderRef.current = sender;
      }

      sender.setStreams(stream);
      await sender.replaceTrack(videoTrack);
    }

    setLocalVideoEnabled(true);
    setLocalStream(stream);
  }, []);

  const ensureLocalStream = useCallback(
    async ({ withVideo }: EnsureLocalStreamOptions) => {
      if (localStreamRef.current) {
        if (withVideo && localStreamRef.current.getVideoTracks().length === 0) {
          await enableLocalVideo();
        }

        return localStreamRef.current;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: withVideo
            ? {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: "user",
              }
            : false,
        });

        localStreamRef.current = stream;
        setLocalStream(stream);
        setHasLocalStream(true);
        setIsMuted(false);

        const [videoTrack] = stream.getVideoTracks();
        localVideoTrackRef.current = videoTrack ?? null;
        setLocalVideoEnabled(Boolean(videoTrack));

        return stream;
      } catch (mediaError) {
        const message =
          mediaError instanceof Error
            ? mediaError.message
            : "Não foi possível acessar a mídia local.";
        setErrorState(message);
        throw mediaError;
      }
    },
    [enableLocalVideo],
  );

  const attachLocalTracks = useCallback(
    (pc: RTCPeerConnection, stream: MediaStream) => {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    },
    [],
  );

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const [track] = stream.getAudioTracks();
    if (!track) return;

    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  const toggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const [track] = stream.getVideoTracks();
    if (!track) {
      await enableLocalVideo();
      return;
    }

    track.enabled = !track.enabled;
    setLocalVideoEnabled(track.enabled);
  }, [enableLocalVideo]);

  const createOffer = useCallback(
    async ({
      receiveAudio = true,
      receiveVideo = true,
      withLocalVideo = true,
    }: CreateOfferOptions = {}) => {
      const stream = await ensureLocalStream({ withVideo: withLocalVideo });
      const pc = createPeerConnection();
      attachLocalTracks(pc, stream);

      const sender = pc
        .getSenders()
        .find((currentSender) => currentSender.track?.kind === "video");

      if (sender) {
        sender.setStreams(stream);
        videoSenderRef.current = sender;
      }

      const offer = await pc.createOffer({
        offerToReceiveAudio: receiveAudio,
        offerToReceiveVideo: receiveVideo,
      });

      await pc.setLocalDescription(offer);
      updateConnectionState(pc);
      setLocalDescription(pc.localDescription ?? offer);
      setIceGatheringState(pc.iceGatheringState);

      return offer;
    },
    [
      attachLocalTracks,
      createPeerConnection,
      ensureLocalStream,
      updateConnectionState,
    ],
  );

  const acceptOffer = useCallback(
    async (
      offer: RTCSessionDescriptionInit,
      {
        receiveAudio = true,
        receiveVideo = true,
        withLocalVideo = false,
      }: CreateAnswerOptions = {},
    ) => {
      const stream = await ensureLocalStream({ withVideo: withLocalVideo });

      const pc = createPeerConnection();

      await pc.setRemoteDescription(offer);

      attachLocalTracks(pc, stream);

      // Configurar transceivers de vídeo após setRemoteDescription
      const videoTransceivers = pc
        .getTransceivers()
        .filter((transceiver) => transceiver.receiver.track?.kind === "video");

      // Se não há transceivers de vídeo, criar um
      if (videoTransceivers.length === 0 && receiveVideo) {
        pc.addTransceiver("video", {
          direction: "sendrecv",
        });
      }

      // Configurar todos os transceivers de vídeo existentes
      const allVideoTransceivers = pc
        .getTransceivers()
        .filter(
          (transceiver) =>
            transceiver.receiver.track?.kind === "video" ||
            transceiver.receiver.track === null,
        );

      for (const transceiver of allVideoTransceivers) {
        transceiver.direction = "sendrecv";
        transceiver.sender.setStreams(stream);
        videoSenderRef.current = transceiver.sender;
      }

      const answer = await pc.createAnswer({
        offerToReceiveAudio: receiveAudio,
        offerToReceiveVideo: receiveVideo,
      });

      await pc.setLocalDescription(answer);

      updateConnectionState(pc);
      setLocalDescription(pc.localDescription ?? answer);
      setIceGatheringState(pc.iceGatheringState);

      return answer;
    },
    [
      attachLocalTracks,
      createPeerConnection,
      ensureLocalStream,
      updateConnectionState,
    ],
  );

  const applyAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      if (!peerRef.current) {
        console.error("❌ [HOOK] Peer connection não existe!");
        throw new Error("Crie uma offer antes de aplicar a answer remota.");
      }

      await peerRef.current.setRemoteDescription(answer);

      updateConnectionState(peerRef.current);
      setLocalDescription(peerRef.current.localDescription ?? null);
    },
    [updateConnectionState],
  );

  const sendIceCandidate = useCallback(
    async (candidate: RTCIceCandidate, visitId: string) => {
      try {
        const response = await fetch(`/api/doorbell/${visitId}/ice-candidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            candidate: candidate.candidate,
            sdpMLineIndex: candidate.sdpMLineIndex,
            sdpMid: candidate.sdpMid,
          }),
        });

        if (!response.ok) {
          throw new Error("Falha ao enviar ICE candidate");
        }
      } catch (error) {
        console.error("❌ [HOOK] Erro ao enviar ICE candidate:", error);
      }
    },
    [],
  );

  const applyIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (!peerRef.current) {
        console.error("❌ [HOOK] Peer connection não existe!");
        return;
      }

      try {
        await peerRef.current.addIceCandidate(candidate);
      } catch (error) {
        console.error("❌ [HOOK] Erro ao aplicar ICE candidate:", error);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    cleanUpPeerConnection();

    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    localVideoTrackRef.current = null;
    videoSenderRef.current = null;

    setConnectionState("unset");
    setIceState("unset");
    setLocalStream(null);
    setRemoteStream(null);
    setLocalVideoEnabled(false);
    setRemoteVideoEnabled(false);
    setHasLocalStream(false);
    setHasRemoteStream(false);
    setIsMuted(false);
    setErrorState(null);
    setIceGatheringState("new");
    setLocalDescription(null);
  }, [cleanUpPeerConnection]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const setError = useCallback((message: string | null) => {
    setErrorState(message);
  }, []);

  const state = useMemo<DoorbellWebRTCState>(
    () => ({
      connectionState,
      iceState,
      localStream,
      remoteStream,
      localVideoEnabled,
      remoteVideoEnabled,
      hasLocalStream,
      hasRemoteStream,
      isMuted,
      error,
      iceGatheringState,
      localDescription,
    }),
    [
      connectionState,
      iceState,
      localStream,
      remoteStream,
      localVideoEnabled,
      remoteVideoEnabled,
      hasLocalStream,
      hasRemoteStream,
      isMuted,
      error,
      iceGatheringState,
      localDescription,
    ],
  );

  const controls = useMemo<DoorbellWebRTCControls>(
    () => ({
      ensureLocalStream,
      enableLocalVideo,
      toggleMute,
      toggleVideo,
      createOffer,
      acceptOffer,
      applyAnswer,
      sendIceCandidate,
      applyIceCandidate,
      setError,
      reset,
    }),
    [
      acceptOffer,
      applyAnswer,
      createOffer,
      enableLocalVideo,
      ensureLocalStream,
      sendIceCandidate,
      applyIceCandidate,
      reset,
      toggleMute,
      toggleVideo,
      setError,
    ],
  );

  return {
    ...state,
    ...controls,
  };
}
