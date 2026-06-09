const CACHE_NAME = "doorbell-call-202606091008";
const urlsToCache = [
  "/manifest.json",
  "/sounds/rington.mp3",
  "/sounds/doorbell.mp3", // Som personalizado da campainha
  "/sounds/calling-ring.mp3",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Instalação do Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker instalando...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Cache aberto");
      return cache.addAll(urlsToCache);
    }),
  );
});

// Ativação do Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker ativado");
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((cacheNames) =>
          Promise.all(
            cacheNames
              .filter((cacheName) => cacheName !== CACHE_NAME)
              .map((cacheName) => caches.delete(cacheName)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

// Interceptar requisições para cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (
    requestUrl.origin === self.location.origin &&
    requestUrl.pathname === "/app-version.json"
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retorna do cache se disponível, senão busca na rede
      return response || fetch(event.request);
    }),
  );
});

// LISTENER PRINCIPAL - Recebe push e exibe notificação
self.addEventListener("push", (event) => {
  console.log("=== PUSH RECEBIDO NO SERVICE WORKER ===");

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = JSON.parse(event.data.text());
    } catch {}
  }

  const title = data.title || "📞 Chamada da campainha";
  const body = data.body || "Toque para abrir. Use ATENDER para atender.";
  const tag = data.tag || "doorbell-ring";
  const icon = data.icon || "/icons/icon-192x192.png";
  const badge = data.badge || "/icons/icon-72x72.png";
  const notificationType = data.type || "doorbell_call";
  // Som sugerido para o cliente (quando app estiver em foreground)
  const suggestedSound = data.sound || "doorbell.mp3";

  console.log("Dados da notificação:", {
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
    renotify: true,
    timestamp: data.timestamp || Date.now(),
    data: {
      suggestedSound, // Passa sugestão de som para o cliente
      visitId: data.visitId,
      timestamp: data.timestamp,
      type: notificationType,
      offer: data.offer, // Para chamadas de voz, incluir a oferta WebRTC
      defaultAction: data.defaultAction || "open",
    },
    actions: [
      {
        action: "answer",
        title: "ATENDER",
        icon: "/icons/icon-96x96.png",
      },
      {
        action: "ignore",
        title: "RECUSAR",
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
        `📱 Notificando ${clients.length} clientes para som customizado`,
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
        } else if (!data.silent && notificationType !== "webrtc_offer_ready") {
          // Para campainha normal
          client.postMessage({
            type: "PLAY_CUSTOM_SOUND",
            sound: suggestedSound,
            visitId: data.visitId,
            timestamp: data.timestamp,
            title,
            body,
            tag,
          });
        }
      });
    });

  event.waitUntil(Promise.all([showPromise, notifyClients]));
});

async function openOrFocusResident(path) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const targetUrl = new URL(path, self.location.origin).href;
  const residentClient = clients.find(
    (client) => new URL(client.url).pathname === "/resident",
  );

  if (residentClient) {
    if ("navigate" in residentClient) {
      await residentClient.navigate(targetUrl);
    }
    return residentClient.focus();
  }

  const openedClient = await self.clients.openWindow(targetUrl);
  return openedClient?.focus ? openedClient.focus() : openedClient;
}

async function notifyWindowClients(message) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  clients.forEach((client) => client.postMessage(message));
}

async function ignoreVisit(visitId) {
  if (!visitId) return;

  await Promise.allSettled([
    fetch(`/api/doorbell/${visitId}/end`, { method: "POST" }),
    notifyWindowClients({ type: "IGNORE_RING", visitId }),
  ]);
}

function getResidentCallPath(data, shouldAnswer) {
  if (!data?.visitId) return "/resident";

  const params = new URLSearchParams({ call: data.visitId });
  if (shouldAnswer) {
    params.set("action", "answer");
  }

  return `/resident?${params.toString()}`;
}

async function handleNotificationAction(action, data) {
  const normalizedAction = action || "";
  const effectiveAction = normalizedAction;

  if (effectiveAction === "ignore" || effectiveAction === "ignore_call") {
    console.log("Chamada ignorada:", data?.visitId, "Tipo:", data?.type);
    await ignoreVisit(data?.visitId);
    return { action: effectiveAction, handled: "ignore" };
  }

  const shouldAnswer =
    effectiveAction === "answer" || effectiveAction === "answer_call";
  const residentPath = getResidentCallPath(data, shouldAnswer);
  await openOrFocusResident(residentPath);

  return {
    action: effectiveAction,
    handled: shouldAnswer ? "answer" : "open",
    path: residentPath,
  };
}

// AÇÕES DA NOTIFICAÇÃO
self.addEventListener("notificationclick", (event) => {
  console.log("Clique na notificação:", event.action);
  event.notification.close();

  event.waitUntil(
    handleNotificationAction(event.action, event.notification.data),
  );
});

// MANTER SERVICE WORKER ATIVO
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "KEEP_ALIVE") {
    event.ports[0].postMessage("SW_ALIVE");
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "TEST_NOTIFICATION_CLICK") {
    const responsePort = event.ports && event.ports[0];
    const testPromise = handleNotificationAction(
      event.data.action,
      event.data.data || {},
    )
      .then((result) => {
        responsePort?.postMessage({ ok: true, result });
      })
      .catch((error) => {
        responsePort?.postMessage({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    if (event.waitUntil) {
      event.waitUntil(testPromise);
    }
  }
});

// LOG DE ATIVIDADE
console.log("Service Worker carregado - Pronto para receber chamadas!");
