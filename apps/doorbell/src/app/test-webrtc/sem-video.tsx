"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

type ConnectionState = RTCPeerConnectionState | "unset";

type IceState = RTCIceConnectionState | "unset";

export default function TestWebRTCPage() {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [localOffer, setLocalOffer] = useState("");
  const [remoteOffer, setRemoteOffer] = useState("");
  const [localAnswer, setLocalAnswer] = useState("");
  const [remoteAnswer, setRemoteAnswer] = useState("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("unset");
  const [iceState, setIceState] = useState<IceState>("unset");
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const syncLocalDescription = useCallback((pc: RTCPeerConnection) => {
    const description = pc.localDescription;
    if (!description) return;
    const serialized = JSON.stringify(description, null, 2);

    if (description.type === "offer") {
      setLocalOffer(serialized);
    } else if (description.type === "answer") {
      setLocalAnswer(serialized);
    }
  }, []);

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      localStreamRef.current = stream;
      setHasLocalStream(true);
      setIsMuted(false);

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível acessar o microfone.";
      setErrorMessage(message);
      throw error;
    }
  }, []);

  const attachLocalTracks = useCallback(
    (pc: RTCPeerConnection, stream: MediaStream) => {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    },
    []
  );

  const createPeerConnection = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.oniceconnectionstatechange = null;
      peerRef.current.close();
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerRef.current = pc;

    setConnectionState(pc.connectionState ?? "unset");
    setIceState(pc.iceConnectionState ?? "unset");

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState ?? "unset");
    };

    pc.oniceconnectionstatechange = () => {
      setIceState(pc.iceConnectionState ?? "unset");
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamRef.current = stream;

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
      }
    };

    pc.onicecandidate = () => {
      syncLocalDescription(pc);
    };

    pc.onicecandidateerror = (event) => {
      console.error("ICE candidate error", event);
      setErrorMessage("Erro ao coletar ICE candidates. Tente novamente.");
    };

    return pc;
  }, [syncLocalDescription]);

  const handleCreateOffer = useCallback(async () => {
    setErrorMessage(null);

    try {
      const stream = await ensureLocalStream();
      const pc = createPeerConnection();
      attachLocalTracks(pc, stream);

      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      syncLocalDescription(pc);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      }
    }
  }, [
    attachLocalTracks,
    createPeerConnection,
    ensureLocalStream,
    syncLocalDescription,
  ]);

  const handleCreateAnswer = useCallback(async () => {
    setErrorMessage(null);

    if (!remoteOffer.trim()) {
      setErrorMessage("Cole a offer remota antes de criar a answer.");
      return;
    }

    try {
      const remoteDescription = JSON.parse(
        remoteOffer
      ) as RTCSessionDescriptionInit;

      if (remoteDescription.type !== "offer") {
        setErrorMessage("A descrição remota informada não é uma offer válida.");
        return;
      }

      const stream = await ensureLocalStream();
      const pc = createPeerConnection();
      attachLocalTracks(pc, stream);

      await pc.setRemoteDescription(remoteDescription);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      syncLocalDescription(pc);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível criar a answer.";
      setErrorMessage(message);
    }
  }, [
    attachLocalTracks,
    createPeerConnection,
    ensureLocalStream,
    remoteOffer,
    syncLocalDescription,
  ]);

  const handleApplyAnswer = useCallback(async () => {
    setErrorMessage(null);

    if (!remoteAnswer.trim()) {
      setErrorMessage("Cole a answer remota antes de aplicar.");
      return;
    }

    if (!peerRef.current) {
      setErrorMessage("Crie a offer antes de aplicar uma answer remota.");
      return;
    }

    try {
      const remoteDescription = JSON.parse(
        remoteAnswer
      ) as RTCSessionDescriptionInit;

      if (remoteDescription.type !== "answer") {
        setErrorMessage("A descrição informada não é uma answer válida.");
        return;
      }

      await peerRef.current.setRemoteDescription(remoteDescription);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar a answer remota.";
      setErrorMessage(message);
    }
  }, [remoteAnswer]);

  const handleToggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const [track] = stream.getAudioTracks();
    if (!track) return;

    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  useEffect(() => {
    return () => {
      peerRef.current?.close();
      peerRef.current = null;

      localStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      localStreamRef.current = null;
      remoteStreamRef.current = null;
    };
  }, []);

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Teste WebRTC</h1>
        <p className="text-muted-foreground">
          Abra esta página em dois navegadores, troque os campos de offer/answer
          e teste a chamada de áudio ponto-a-ponto.
        </p>
      </header>

      {errorMessage && (
        <Card className="border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {errorMessage}
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Mídia local</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void ensureLocalStream()} variant="outline">
            Iniciar microfone
          </Button>
          <Button
            onClick={handleToggleMute}
            variant={isMuted ? "secondary" : "outline"}
            disabled={!hasLocalStream}
          >
            {isMuted ? "Desmutar" : "Mutar"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {hasLocalStream
            ? "Microfone ativo."
            : "O microfone precisa ser inicializado em cada navegador."}
        </p>
        <audio ref={localAudioRef} autoPlay muted className="hidden" />
        <audio ref={remoteAudioRef} autoPlay className="hidden" />
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="text-xl font-semibold">Estado da conexão</h2>
        <div className="grid gap-1 text-sm">
          <span>
            <strong>Peer:</strong> {connectionState}
          </span>
          <span>
            <strong>ICE:</strong> {iceState}
          </span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold">Lado A — Criar Offer</h2>
          <Button onClick={() => void handleCreateOffer()} className="w-full">
            Criar offer
          </Button>
          <label className="text-sm font-medium">
            Offer gerada (copie para o outro navegador)
          </label>
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={localOffer}
            readOnly
            placeholder="A offer aparecerá aqui após ser criada."
          />
          <label className="text-sm font-medium">Cole a answer recebida</label>
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={remoteAnswer}
            onChange={(event) => setRemoteAnswer(event.target.value)}
            placeholder="Cole a answer do outro navegador aqui."
          />
          <Button
            onClick={() => void handleApplyAnswer()}
            variant="secondary"
            className="w-full"
          >
            Aplicar answer remota
          </Button>
        </Card>

        <Card className="p-4 space-y-4">
          <h2 className="text-lg font-semibold">Lado B — Aplicar Offer</h2>
          <label className="text-sm font-medium">Cole a offer recebida</label>
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={remoteOffer}
            onChange={(event) => setRemoteOffer(event.target.value)}
            placeholder="Cole aqui a offer gerada no outro navegador."
          />
          <Button onClick={() => void handleCreateAnswer()} className="w-full">
            Aplicar offer e criar answer
          </Button>
          <label className="text-sm font-medium">
            Answer gerada (devolva para o outro navegador)
          </label>
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={localAnswer}
            readOnly
            placeholder="A answer aparecerá aqui após ser criada."
          />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Passo a passo</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>
            Abra esta página em dois navegadores ou dispositivos diferentes.
          </li>
          <li>
            Em cada um, clique em "Iniciar microfone" e permita o acesso ao
            áudio.
          </li>
          <li>
            No navegador A clique em "Criar offer" e copie o texto gerado.
          </li>
          <li>
            No navegador B cole a offer recebida e clique em "Aplicar offer e
            criar answer".
          </li>
          <li>
            Ainda no navegador B copie a answer gerada e envie de volta para o
            navegador A.
          </li>
          <li>
            No navegador A cole a answer recebida e clique em "Aplicar answer
            remota".
          </li>
          <li>
            Quando o estado da conexão ficar "connected", fale e confirme o
            áudio nos dois lados.
          </li>
        </ol>
      </Card>
    </div>
  );
}
