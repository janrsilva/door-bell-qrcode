"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDoorbellWebRTC } from "@/hooks/useDoorbellWebRTC";

const formatDescription = (description: RTCSessionDescriptionInit | null) => {
  if (!description) {
    return "";
  }

  try {
    return JSON.stringify(description, null, 2);
  } catch (error) {
    console.error("Erro ao serializar descrição", error);
    return "";
  }
};

const parseDescription = (value: string) => {
  try {
    return JSON.parse(value) as RTCSessionDescriptionInit;
  } catch (error) {
    throw new Error("Descrição SDP inválida. Verifique o JSON informado.");
  }
};

export default function TestWebRTCPage() {
  const {
    connectionState,
    iceState,
    iceGatheringState,
    localDescription,
    localStream,
    remoteStream,
    localVideoEnabled,
    remoteVideoEnabled,
    hasLocalStream,
    hasRemoteStream,
    isMuted,
    error,
    ensureLocalStream,
    enableLocalVideo,
    toggleMute,
    createOffer,
    acceptOffer,
    applyAnswer,
    setError,
  } = useDoorbellWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [offerText, setOfferText] = useState("");
  const [remoteOfferText, setRemoteOfferText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [remoteAnswerText, setRemoteAnswerText] = useState("");

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

  useEffect(() => {
    if (!localDescription) return;

    const formatted = formatDescription(localDescription);
    if (localDescription.type === "offer") {
      setOfferText(formatted);
    }
    if (localDescription.type === "answer") {
      setAnswerText(formatted);
    }
  }, [localDescription]);

  const infoBadge = useMemo(() => {
    switch (iceGatheringState) {
      case "complete":
        return "Todos os ICE candidates coletados";
      case "gathering":
        return "Coletando ICE candidates...";
      default:
        return "Aguardando coleta de ICE";
    }
  }, [iceGatheringState]);

  const handleVisitorMedia = async () => {
    setError(null);
    try {
      await ensureLocalStream({ withVideo: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleResidentMedia = async () => {
    setError(null);
    try {
      await ensureLocalStream({ withVideo: false });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOffer = async () => {
    setError(null);
    try {
      const offer = await createOffer({ withLocalVideo: true });
      setOfferText(formatDescription(offer));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Falha ao criar offer.");
    }
  };

  const handleCreateAnswer = async () => {
    setError(null);

    if (!remoteOfferText.trim()) {
      setError("Cole a offer do visitor antes de criar a answer.");
      return;
    }

    try {
      const offer = parseDescription(remoteOfferText);
      if (offer.type !== "offer") {
        setError("A descrição remota informada não é uma offer válida.");
        return;
      }

      const answer = await acceptOffer(offer, { withLocalVideo: false });
      setAnswerText(formatDescription(answer));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível criar a answer."
      );
    }
  };

  const handleApplyAnswer = async () => {
    setError(null);

    if (!remoteAnswerText.trim()) {
      setError("Cole a answer do resident antes de aplicar.");
      return;
    }

    try {
      const answer = parseDescription(remoteAnswerText);
      if (answer.type !== "answer") {
        setError("A descrição informada não é uma answer válida.");
        return;
      }

      await applyAnswer(answer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível aplicar a answer remota."
      );
    }
  };

  const handleEnableResidentCamera = async () => {
    setError(null);
    if (!remoteVideoEnabled) {
      setError("A câmera do visitor precisa estar ativa primeiro.");
      return;
    }

    try {
      await enableLocalVideo();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível ativar a câmera do resident."
      );
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Teste WebRTC</h1>
        <p className="text-muted-foreground">
          Abra esta página em dois navegadores. O visitor inicia a chamada com
          offer e vídeo; o resident responde com a answer e libera sua câmera
          depois de visualizar o visitante.
        </p>
      </header>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Visualizações</h2>
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
              Áudio:{" "}
              {hasLocalStream ? (isMuted ? "mutado" : "ativo") : "desligado"} ·
              Câmera: {localVideoEnabled ? "ativa" : "desligada"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Pessoa conectada</p>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="aspect-video w-full rounded bg-black object-cover"
            />
            <p className="text-xs text-muted-foreground">
              Fluxo: {hasRemoteStream ? "recebido" : "aguardando"} · Câmera
              remota: {remoteVideoEnabled ? "ativa" : "aguardando"}
            </p>
          </div>
        </div>
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
          <span>
            <strong>Gathering:</strong> {iceGatheringState} ({infoBadge})
          </span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold">Visitor — Offer</h2>
            <p className="text-xs text-muted-foreground">
              O visitor toca a campainha: ativa áudio + câmera, cria a offer e
              aguarda a answer do resident.
            </p>
          </header>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleVisitorMedia()} variant="outline">
              Iniciar áudio + câmera (visitor)
            </Button>
            <Button
              onClick={toggleMute}
              variant="outline"
              disabled={!hasLocalStream}
            >
              {isMuted ? "Desmutar" : "Mutar"}
            </Button>
          </div>

          <Button onClick={() => void handleCreateOffer()} className="w-full">
            Criar offer (visitor)
          </Button>
          <label className="text-sm font-medium">
            Offer gerada (copie para o resident)
          </label>
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={offerText}
            readOnly
            placeholder="A offer aparecerá aqui após ser criada."
          />

          <label className="text-sm font-medium">
            Cole a answer enviada pelo resident
          </label>
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={remoteAnswerText}
            onChange={(event) => setRemoteAnswerText(event.target.value)}
            placeholder="Cole aqui a answer copiada do resident."
          />

          <Button
            onClick={() => void handleApplyAnswer()}
            variant="secondary"
            className="w-full"
          >
            Aplicar answer do resident
          </Button>
        </Card>

        <Card className="p-4 space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold">Resident — Answer</h2>
            <p className="text-xs text-muted-foreground">
              O resident recebe a offer, cria a answer e pode ativar a própria
              câmera somente depois de ver a do visitor.
            </p>
          </header>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void handleResidentMedia()}
              variant="outline"
            >
              Iniciar áudio (resident)
            </Button>
            <Button
              onClick={() => void handleEnableResidentCamera()}
              variant="secondary"
              disabled={
                !hasLocalStream || localVideoEnabled || !remoteVideoEnabled
              }
            >
              Ativar câmera (liberada após visitor)
            </Button>
            <Button
              onClick={toggleMute}
              variant="outline"
              disabled={!hasLocalStream}
            >
              {isMuted ? "Desmutar" : "Mutar"}
            </Button>
          </div>

          <label className="text-sm font-medium">
            Cole a offer recebida do visitor
          </label>
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={remoteOfferText}
            onChange={(event) => setRemoteOfferText(event.target.value)}
            placeholder="Cole aqui a offer enviada pelo visitor."
          />

          <Button onClick={() => void handleCreateAnswer()} className="w-full">
            Aplicar offer e criar answer
          </Button>

          <label className="text-sm font-medium">
            Answer gerada (envie ao visitor)
          </label>
          <textarea
            className="h-40 w-full rounded border p-2 font-mono text-xs"
            value={answerText}
            readOnly
            placeholder="A answer aparecerá aqui após ser criada."
          />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold">Passo a passo sugerido</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Abra esta página em dois navegadores/dispositivos.</li>
          <li>
            No browser do visitor clique em "Iniciar áudio + câmera (visitor)" e
            permita microfone/câmera.
          </li>
          <li>
            No browser do resident clique em "Iniciar áudio (resident)" para
            liberar o microfone.
          </li>
          <li>Visitor: clique em "Criar offer" e copie o conteúdo gerado.</li>
          <li>
            Resident: cole a offer recebida e clique em "Aplicar offer e criar
            answer".
          </li>
          <li>Resident: copie a answer gerada e envie de volta ao visitor.</li>
          <li>
            Visitor: cole a answer recebida e clique em "Aplicar answer do
            resident".
          </li>
          <li>
            Assim que o estado da conexão estiver "connected", validem o áudio
            nos dois lados.
          </li>
          <li>
            Com o vídeo do visitor ativo, o botão "Ativar câmera" do resident
            será liberado.
          </li>
          <li>
            Ative a câmera do resident (opcional) e confirme que ambos se veem.
          </li>
        </ol>
      </Card>
    </div>
  );
}
