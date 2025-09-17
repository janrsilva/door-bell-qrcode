const CACHE_NAME = "doorbell-call-v3"; // Som da campainha corrigido
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
  event.waitUntil(clients.claim()); // Assume controle imediatamente
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

// FUNÇÃO PARA TOCAR SOM DA CAMPAINHA EM BACKGROUND
async function playDoorbellSound(customSound) {
  try {
    console.log("🔔 === TOCANDO SOM DA CAMPAINHA ===");

    // Usar som personalizado da campainha se fornecido, senão usar padrão
    const doorbellSound = customSound || "/sounds/doorbell.mp3";
    const fallbackSounds = [doorbellSound, "/sounds/rington.mp3"];

    console.log("🎵 Sons da campainha disponíveis:", fallbackSounds);

    // Tentar reproduzir som da campainha
    for (const soundUrl of fallbackSounds) {
      try {
        console.log(`🔔 Tentando reproduzir campainha: ${soundUrl}`);

        // Abordagem mais robusta para service worker
        const response = await fetch(soundUrl);
        if (!response.ok) {
          throw new Error(`Erro ao carregar som: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        console.log(`✅ Som da campainha carregado: ${soundUrl}`);

        // Tocar som da campainha com padrão específico
        const playDoorbellTone = async (toneNumber) => {
          try {
            const audio = new Audio(audioUrl);
            audio.volume = 1.0;
            await audio.play();
            console.log(`🔔 Toque da campainha ${toneNumber}/3`);
            return true;
          } catch (e) {
            console.error(`❌ Erro no toque ${toneNumber}:`, e);
            return false;
          }
        };

        // Padrão de campainha: 3 toques rápidos
        await playDoorbellTone(1);

        setTimeout(() => playDoorbellTone(2), 800); // 0.8s depois
        setTimeout(() => playDoorbellTone(3), 1600); // 1.6s depois

        console.log("🎵 === SOM DA CAMPAINHA REPRODUZIDO ===");

        // Limpar URL temporária
        setTimeout(() => URL.revokeObjectURL(audioUrl), 5000);

        return true; // Sucesso
      } catch (error) {
        console.error(`❌ Erro ao reproduzir campainha ${soundUrl}:`, error);
      }
    }

    console.log("❌ Nenhum som da campainha funcionou");
    return false;
  } catch (error) {
    console.error("❌ Erro geral no som da campainha:", error);
    return false;
  }
}

// LISTENER PRINCIPAL - FUNCIONA COM APP FECHADO
self.addEventListener("push", (event) => {
  console.log("📞 === PUSH RECEBIDO NO SERVICE WORKER ===");
  console.log("📋 Event:", event);
  console.log("📦 Event.data:", event.data);

  let notificationData = {
    title: "🔔 Campainha Tocando!",
    body: "Alguém está na sua porta",
    visitId: null,
    timestamp: Date.now(),
    sound: "/sounds/doorbell.mp3", // Som padrão da campainha
  };

  try {
    if (event.data) {
      console.log("📄 Raw data:", event.data.text());
      const pushData = event.data.json();
      console.log("📊 Parsed data:", pushData);
      notificationData = { ...notificationData, ...pushData };
      console.log("✅ Notification data final:", notificationData);
    } else {
      console.log("⚠️ Nenhum data no push event");
    }
  } catch (e) {
    console.error("❌ Erro ao parsear dados do push:", e);
    console.log("🔄 Usando dados padrão");
  }

  // 🔔 TOCAR SOM DA CAMPAINHA IMEDIATAMENTE
  console.log("🚀 Iniciando som da campainha personalizado...");
  playDoorbellSound(notificationData.sound);

  const options = {
    body: notificationData.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    image: "/icons/icon-512x512.png",

    // CONFIGURAÇÕES CRÍTICAS PARA BACKGROUND
    vibrate: [1000, 500, 1000, 500, 1000, 500], // Vibração longa como chamada
    silent: false, // Permitir notificação aparecer normalmente
    sound: notificationData.sound || "/sounds/doorbell.mp3", // Som personalizado da campainha
    requireInteraction: true, // Não desaparece sozinha
    persistent: true, // Manter visível

    // AÇÕES DISPONÍVEIS NA NOTIFICAÇÃO
    actions: [
      {
        action: "answer",
        title: "📞 Atender",
        icon: "/icons/icon-96x96.png",
      },
      {
        action: "message",
        title: "💬 Mensagem",
        icon: "/icons/icon-96x96.png",
      },
      {
        action: "ignore",
        title: "🔇 Ignorar",
        icon: "/icons/icon-96x96.png",
      },
    ],

    // DADOS PARA RASTREAMENTO
    data: {
      visitId: notificationData.visitId,
      timestamp: notificationData.timestamp,
      type: "doorbell_call",
    },

    // TAGS PARA CONTROLE
    tag: "doorbell-ring",
    renotify: true,
  };

  event.waitUntil(
    Promise.all([
      // 1. Mostrar notificação (som já está tocando acima)
      self.registration.showNotification(notificationData.title, options),

      // 2. Comunicar com app se estiver aberto
      notifyOpenClients(notificationData),
    ])
  );
});

// FUNÇÃO PARA COMUNICAR COM APP ABERTO (SE HOUVER)
async function notifyOpenClients(data) {
  try {
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    console.log(`📱 Notificando ${clients.length} clientes abertos`);

    clients.forEach((client) => {
      client.postMessage({
        type: "DOORBELL_RING",
        data: data,
      });
    });
  } catch (error) {
    console.error("Erro ao notificar clientes:", error);
  }
}

// AÇÕES DA NOTIFICAÇÃO
self.addEventListener("notificationclick", (event) => {
  console.log("👆 Clique na notificação:", event.action);
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === "answer") {
    // Abrir app para atender
    event.waitUntil(
      clients.openWindow(`/atendimento?call=${data.visitId}&action=answer`)
    );
  } else if (action === "message") {
    // Abrir para enviar mensagem rápida
    event.waitUntil(
      clients.openWindow(`/atendimento?call=${data.visitId}&action=message`)
    );
  } else if (action === "ignore") {
    // Log de chamada ignorada
    console.log("🔇 Chamada ignorada:", data.visitId);
  } else {
    // Clique na notificação principal
    event.waitUntil(clients.openWindow("/atendimento"));
  }
});

// MANTER SERVICE WORKER ATIVO
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "KEEP_ALIVE") {
    event.ports[0].postMessage("SW_ALIVE");
  }
});

// LOG DE ATIVIDADE
console.log(
  "🚀 Service Worker carregado - Pronto para receber chamadas em background!"
);
