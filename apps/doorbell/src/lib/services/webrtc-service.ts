/**
 * WebRTC Service for Voice Calling
 * Handles peer-to-peer voice connections between visitor and resident
 */

export interface CallState {
  status: "idle" | "calling" | "ringing" | "connected" | "ended" | "error";
  isInitiator: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  error?: string;
  duration?: number;
}

export interface SignalingMessage {
  type:
    | "offer"
    | "answer"
    | "ice-candidate"
    | "call-end"
    | "call-accept"
    | "call-reject";
  data?: any;
  visitId: string;
  from: "visitor" | "resident";
}

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private visitId: string = "";
  private isInitiator: boolean = false;
  private callStateCallback?: (state: CallState) => void;
  private remoteStreamCallback?: (stream: MediaStream | null) => void;
  private callDuration: number = 0;
  private durationInterval?: NodeJS.Timeout;
  private pollingInterval?: NodeJS.Timeout;
  private lastMessageId: string = "0";

  // ICE servers configuration (using free STUN servers)
  private iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  constructor() {
    this.setupAudioContext();
  }

  private setupAudioContext() {
    // Configure audio context for call mode
    if (typeof window !== "undefined" && "mediaSession" in navigator) {
      try {
        // Set up media session if available
        navigator.mediaSession.metadata = new MediaMetadata({
          title: "Chamada de Voz",
          artist: "Campainha Eletrônica",
        });
      } catch (error) {
        console.warn("Could not set up media session:", error);
      }
    }
  }

  /**
   * Initialize call as visitor (initiator)
   */
  async initializeCall(
    visitId: string,
    onStateChange: (state: CallState) => void,
    onRemoteStream: (stream: MediaStream | null) => void
  ): Promise<void> {
    console.log("🚀 === WEBRTC SERVICE - INITIALIZE CALL ===");
    console.log("📋 visitId:", visitId);
    console.log("📋 onStateChange:", typeof onStateChange);
    console.log("📋 onRemoteStream:", typeof onRemoteStream);

    this.visitId = visitId;
    this.isInitiator = true;
    this.callStateCallback = onStateChange;
    this.remoteStreamCallback = onRemoteStream;

    try {
      console.log("📞 Atualizando estado para 'calling'...");
      this.updateCallState({
        status: "calling",
        isInitiator: true,
        isMuted: false,
        isSpeakerOn: true,
      });

      console.log("🎤 Configurando mídia local...");
      await this.setupLocalMedia();
      console.log("✅ Mídia local configurada");

      console.log("🔗 Configurando peer connection...");
      await this.setupPeerConnection();
      console.log("✅ Peer connection configurada");

      console.log("🔄 Iniciando polling...");
      this.startPolling();
      console.log("✅ Polling iniciado");

      console.log("📤 Criando offer...");
      // Create offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      console.log("✅ Offer criada:", offer.type);

      console.log("💾 Definindo local description...");
      await this.peerConnection!.setLocalDescription(offer);
      console.log("✅ Local description definida");

      console.log("📡 Preparando mensagem de offer...");
      // Send offer through signaling
      const offerMessage = {
        type: "offer" as const,
        data: offer,
        visitId: this.visitId,
        from: "visitor" as const,
      };
      console.log("📡 Offer message:", offerMessage);

      console.log("📨 Salvando offer no Firebase...");
      // Save offer to Firebase and notify resident via FCM
      await this.saveOfferToFirebase(this.visitId, offer);
      console.log("✅ Offer salva no Firebase e notificação enviada");
    } catch (error) {
      console.error("Error initializing call:", error);
      this.updateCallState({
        status: "error",
        isInitiator: true,
        isMuted: false,
        isSpeakerOn: true,
        error:
          error instanceof Error ? error.message : "Failed to initialize call",
      });
    }
  }

  /**
   * Accept incoming call as resident
   */
  async acceptCall(
    visitId: string,
    offer: RTCSessionDescriptionInit,
    onStateChange: (state: CallState) => void,
    onRemoteStream: (stream: MediaStream | null) => void
  ): Promise<void> {
    this.visitId = visitId;
    this.isInitiator = false;
    this.callStateCallback = onStateChange;
    this.remoteStreamCallback = onRemoteStream;

    try {
      this.updateCallState({
        status: "connected",
        isInitiator: false,
        isMuted: false,
        isSpeakerOn: true,
      });

      await this.setupLocalMedia();
      await this.setupPeerConnection();
      this.startPolling();

      await this.peerConnection!.setRemoteDescription(offer);

      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      // Send answer via FCM (always from resident to visitor)
      await this.sendAnswerViaFCM({
        type: "answer",
        sdp: answer.sdp,
        visitId: this.visitId,
        from: "resident",
      });

      this.startCallDuration();
    } catch (error) {
      console.error("Error accepting call:", error);
      this.updateCallState({
        status: "error",
        isInitiator: false,
        isMuted: false,
        isSpeakerOn: true,
        error: error instanceof Error ? error.message : "Failed to accept call",
      });
    }
  }

  /**
   * Setup local media stream (microphone)
   */
  private async setupLocalMedia(): Promise<void> {
    try {
      // Request microphone access with call-optimized settings
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
        video: false,
      });

      // Set audio output to speaker by default
      await this.setSpeakerMode(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      throw new Error("Microphone access denied or unavailable");
    }
  }

  /**
   * Setup WebRTC peer connection
   */
  private async setupPeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log("Received remote stream");
      this.remoteStream = event.streams[0];
      this.remoteStreamCallback?.(this.remoteStream);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidateViaFCM(
          {
            type: "candidate",
            candidate: event.candidate,
            visitId: this.visitId,
            from: this.isInitiator ? "visitor" : "resident",
          },
          this.isInitiator ? "resident" : "visitor"
        );
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log("Connection state changed:", state);

      if (state === "connected") {
        this.updateCallState({
          status: "connected",
          isInitiator: this.isInitiator,
          isMuted: false,
          isSpeakerOn: true,
        });
        this.startCallDuration();
      } else if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {
        this.updateCallState({
          status: "ended",
          isInitiator: this.isInitiator,
          isMuted: false,
          isSpeakerOn: true,
        });
        this.cleanup();
      }
    };
  }

  /**
   * Start polling for signaling messages
   */
  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/webrtc/signaling?visitId=${this.visitId}&type=${this.isInitiator ? "visitor" : "resident"}&lastMessageId=${this.lastMessageId}`
        );

        if (response.ok) {
          const data = await response.json();

          if (data.messages && data.messages.length > 0) {
            for (const message of data.messages) {
              await this.handleSignalingMessage(message);
            }
            this.lastMessageId = data.lastMessageId;
          }
        }
      } catch (error) {
        console.error("Error polling for signaling messages:", error);
      }
    }, 1000); // Poll every second
  }

  /**
   * Handle incoming signaling messages
   */
  private async handleSignalingMessage(
    message: SignalingMessage
  ): Promise<void> {
    if (!this.peerConnection) return;

    switch (message.type) {
      case "answer":
        if (this.isInitiator) {
          await this.peerConnection.setRemoteDescription(message.data);
        }
        break;

      case "ice-candidate":
        await this.peerConnection.addIceCandidate(message.data);
        break;

      case "call-accept":
        if (this.isInitiator) {
          this.updateCallState({
            status: "connected",
            isInitiator: true,
            isMuted: false,
            isSpeakerOn: true,
          });
          this.startCallDuration();
        }
        break;

      case "call-reject":
        this.updateCallState({
          status: "ended",
          isInitiator: this.isInitiator,
          isMuted: false,
          isSpeakerOn: true,
        });
        this.cleanup();
        break;

      case "call-end":
        this.updateCallState({
          status: "ended",
          isInitiator: this.isInitiator,
          isMuted: false,
          isSpeakerOn: true,
        });
        this.cleanup();
        break;
    }
  }

  /**
   * Send signaling message through HTTP API
   */
  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    try {
      const response = await fetch("/api/webrtc/signaling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(
          "Failed to send signaling message:",
          await response.text()
        );
      }
    } catch (error) {
      console.error("Error sending signaling message:", error);
    }
  }

  /**
   * Save offer to Firebase and notify resident via FCM
   * Always called by visitor - no need for role checking
   */
  private async saveOfferToFirebase(
    visitId: string,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    console.log("📨 === SAVE OFFER TO FIREBASE (VISITOR) ===");
    console.log("📋 visitId:", visitId);
    console.log("📋 offer type:", offer.type);
    console.log("📋 offer SDP length:", offer.sdp ? offer.sdp.length : "N/A");

    try {
      const requestBody = {
        sdp: offer.sdp,
      };

      console.log("📤 Enviando request para /api/doorbell/[visitId]/offer...");
      console.log("📤 Request body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`/api/doorbell/${visitId}/offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response status:", response.status);
      console.log("📥 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "❌ Failed to save offer to Firebase - status:",
          response.status
        );
        console.error("❌ Error response:", errorText);
      } else {
        const responseData = await response.json();
        console.log("✅ Offer saved to Firebase and resident notified");
        console.log("📥 Response data:", responseData);
      }
    } catch (error) {
      console.error("❌ === ERRO NO SAVE OFFER TO FIREBASE ===");
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
    }
  }

  /**
   * Send WebRTC answer via FCM (always from resident to visitor)
   */
  private async sendAnswerViaFCM(signal: any): Promise<void> {
    try {
      const response = await fetch("/api/webrtc-signal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitId: this.visitId,
          signal: signal,
          targetType: "visitor", // Answer always goes to visitor
        }),
      });

      if (!response.ok) {
        console.error(
          "Failed to send WebRTC answer via FCM:",
          await response.text()
        );
      } else {
        console.log(`✅ WebRTC answer sent via FCM to visitor`);
      }
    } catch (error) {
      console.error("Error sending WebRTC answer via FCM:", error);
    }
  }

  /**
   * Send ICE candidate via FCM
   */
  private async sendIceCandidateViaFCM(
    signal: any,
    targetType: "visitor" | "resident"
  ): Promise<void> {
    try {
      const response = await fetch("/api/webrtc-signal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visitId: this.visitId,
          signal: signal,
          targetType: targetType,
        }),
      });

      if (!response.ok) {
        console.error(
          "Failed to send ICE candidate via FCM:",
          await response.text()
        );
      } else {
        console.log(`✅ ICE candidate sent via FCM to ${targetType}`);
      }
    } catch (error) {
      console.error("Error sending ICE candidate via FCM:", error);
    }
  }

  /**
   * Toggle microphone mute
   */
  toggleMute(): void {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      const newMutedState = !audioTracks[0]?.enabled;

      audioTracks.forEach((track) => {
        track.enabled = !newMutedState;
      });

      this.updateCallState({
        status: "connected",
        isInitiator: this.isInitiator,
        isMuted: newMutedState,
        isSpeakerOn: true,
      });
    }
  }

  /**
   * Toggle speaker mode
   */
  async setSpeakerMode(enabled: boolean): Promise<void> {
    try {
      // This is a hint to the browser - actual implementation varies by browser
      if ("setSinkId" in HTMLAudioElement.prototype) {
        // For browsers that support setSinkId (Chrome, Edge)
        const audioElements = document.querySelectorAll("audio");
        audioElements.forEach(async (audio) => {
          try {
            await (audio as any).setSinkId(enabled ? "default" : "");
          } catch (e) {
            console.warn("Could not set audio output device:", e);
          }
        });
      }

      this.updateCallState({
        status: "connected",
        isInitiator: this.isInitiator,
        isMuted: false,
        isSpeakerOn: enabled,
      });
    } catch (error) {
      console.warn("Could not toggle speaker mode:", error);
    }
  }

  /**
   * End the call
   */
  endCall(): void {
    console.log("🛑 === ENDCALL CHAMADO ===");
    console.log(
      "🛑 Current status:",
      this.peerConnection?.connectionState || "unset"
    );
    console.log("🛑 Is initiator:", this.isInitiator);
    console.log("🛑 Visit ID:", this.visitId);
    console.log("🛑 Stack trace:", new Error().stack);

    // Send end call signal
    this.sendSignalingMessage({
      type: "call-end",
      visitId: this.visitId,
      from: this.isInitiator ? "visitor" : "resident",
    });

    this.updateCallState({
      status: "ended",
      isInitiator: this.isInitiator,
      isMuted: false,
      isSpeakerOn: true,
    });

    this.cleanup();
  }

  /**
   * Check if volume is low
   */
  checkVolumeLevel(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.localStream) {
        resolve(false);
        return;
      }

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(this.localStream);

      microphone.connect(analyser);
      analyser.fftSize = 256;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Check volume for 2 seconds
      let samples = 0;
      let totalVolume = 0;

      const checkInterval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }

        const average = sum / bufferLength;
        totalVolume += average;
        samples++;

        if (samples >= 20) {
          // 2 seconds of samples
          clearInterval(checkInterval);
          audioContext.close();

          const averageVolume = totalVolume / samples;
          const isLowVolume = averageVolume < 10; // Threshold for low volume

          resolve(isLowVolume);
        }
      }, 100);
    });
  }

  /**
   * Start call duration timer
   */
  private startCallDuration(): void {
    this.callDuration = 0;
    this.durationInterval = setInterval(() => {
      this.callDuration++;
      this.updateCallState({
        status: "connected",
        isInitiator: this.isInitiator,
        isMuted: false,
        isSpeakerOn: true,
        duration: this.callDuration,
      });
    }, 1000);
  }

  /**
   * Update call state and notify callback
   */
  private updateCallState(state: Partial<CallState>): void {
    const currentState = {
      status: state.status || "idle",
      isInitiator: state.isInitiator ?? this.isInitiator,
      isMuted: state.isMuted ?? false,
      isSpeakerOn: state.isSpeakerOn ?? true,
      error: state.error,
      duration: state.duration ?? this.callDuration,
    };

    this.callStateCallback?.(currentState);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = undefined;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.callDuration = 0;
    this.lastMessageId = "0";
  }

  /**
   * Get current call state
   */
  getCurrentState(): CallState {
    return {
      status: this.peerConnection ? "connected" : "idle",
      isInitiator: this.isInitiator,
      isMuted: false,
      isSpeakerOn: true,
      duration: this.callDuration,
    };
  }
}

// Singleton instance
export const webRTCService = new WebRTCService();
