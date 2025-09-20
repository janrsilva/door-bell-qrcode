const CACHE_NAME = "doorbell-call-v4"; // Som da campainha corrigido com abordagem correta
const urlsToCache = [
  "/atendimento",
  "/sounds/rington.mp3",
  "/sounds/doorbell.mp3", // Som personalizado da campainha
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Instalação do Service Worker
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker instalando...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Cache aberto");
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting(); // Ativa imediatamente
});

// Ativação do Service Worker
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker ativado");
  event.waitUntil(self.clients.claim()); // Assume controle imediatamente
});

// Interceptar requisições para cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retorna do cache se disponível, senão busca na rede
      return response || fetch(event.request);
    })
  );
});

// LISTENER PRINCIPAL - Recebe push e exibe notificação
self.addEventListener("push", (event) => {
  console.log("📞 === PUSH RECEBIDO NO SERVICE WORKER ===");

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = JSON.parse(event.data.text());
    } catch {}
  }

  const title = data.title || "🔔 Campainha Tocando!";
  const body = data.body || "Alguém está na sua porta";
  const tag = data.tag || "doorbell-ring";
  const icon = data.icon || "/icons/icon-192x192.png";
  const badge = data.badge || "/icons/icon-72x72.png";
  const notificationType = data.type || "doorbell_call";
  // Som sugerido para o cliente (quando app estiver em foreground)
  const suggestedSound = data.sound || "doorbell.mp3";

  console.log("📊 Dados da notificação:", {
    title,
    body,
    suggestedSound,
    type: notificationType,
  });

  const options = {
    body,
    icon,
    badge,
    tag,
    // IMPORTANTE: não existe suporte estável a `sound` aqui - som será padrão do sistema
    vibrate: [1000, 500, 1000, 500, 1000, 500], // Vibração como campainha
    requireInteraction: true, // Não desaparece sozinha
    data: {
      suggestedSound, // Passa sugestão de som para o cliente
      visitId: data.visitId,
      timestamp: data.timestamp,
      type: notificationType,
      offer: data.offer, // Para chamadas de voz, incluir a oferta WebRTC
    },
    actions: [
      {
        action: "answer",
        title: "📞 Atender",
        icon: "/icons/icon-96x96.png",
      },
      {
        action: "ignore",
        title: "🔇 Ignorar",
        icon: "/icons/icon-96x96.png",
      },
    ],
  };

  // Mostrar notificação apenas se não for sinal silencioso
  let showPromise = Promise.resolve();
  if (!data.silent) {
    showPromise = self.registration.showNotification(title, options);
  }

  // Avisar clientes abertos para tocar som customizado (quando possível)
  const notifyClients = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      console.log(
        `📱 Notificando ${clients.length} clientes para som customizado`
      );
      clients.forEach((client) => {
        if (notificationType === "voice_call") {
          // Para chamadas de voz, notificar o app com dados de sinalização WebRTC
          client.postMessage({
            type: "WEBRTC_SIGNAL",
            signal: data.webrtc, // Dados de sinalização (offer/answer/candidate)
            visitId: data.visitId,
            title,
            body,
          });
        } else if (notificationType === "webrtc_signal") {
          // Para sinais WebRTC silenciosos (answer/candidates)
          client.postMessage({
            type: "WEBRTC_SIGNAL",
            signal: data.webrtc,
            visitId: data.visitId,
          });
        } else {
          // Para campainha normal
          client.postMessage({
            type: "PLAY_CUSTOM_SOUND",
            sound: suggestedSound,
            title,
            body,
            tag,
          });
        }
      });
    });

  event.waitUntil(Promise.all([showPromise, notifyClients]));
});

// AÇÕES DA NOTIFICAÇÃO
self.addEventListener("notificationclick", (event) => {
  console.log("👆 Clique na notificação:", event.action);
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === "answer" || action === "answer_call") {
    // Abrir app para atender
    if (data.type === "voice_call") {
      // Para chamadas de voz, passar dados de sinalização WebRTC
      event.waitUntil(
        self.clients.openWindow(
          `/atendimento?voiceCall=${data.visitId}&webrtc=${encodeURIComponent(JSON.stringify(data.webrtc))}`
        )
      );
    } else {
      // Campainha normal
      event.waitUntil(
        self.clients.openWindow(
          `/atendimento?call=${data.visitId}&action=answer`
        )
      );
    }
  } else if (action === "ignore" || action === "ignore_call") {
    // Log de chamada ignorada
    console.log("🔇 Chamada ignorada:", data.visitId, "Tipo:", data.type);
  } else {
    // Clique na notificação principal - se for chamada de voz, abrir com dados
    if (data.type === "voice_call") {
      event.waitUntil(
        self.clients.openWindow(
          `/atendimento?voiceCall=${data.visitId}&webrtc=${encodeURIComponent(JSON.stringify(data.webrtc))}`
        )
      );
    } else {
      event.waitUntil(self.clients.openWindow("/atendimento"));
    }
  }
});

// MANTER SERVICE WORKER ATIVO
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "KEEP_ALIVE") {
    event.ports[0].postMessage("SW_ALIVE");
  }
});

// LOG DE ATIVIDADE
console.log("🚀 Service Worker carregado - Pronto para receber chamadas!");
