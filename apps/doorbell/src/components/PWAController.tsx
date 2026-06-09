"use client";

import { useEffect } from "react";

declare global {
  interface WindowEventMap {
    "pwa-update-available": CustomEvent<ServiceWorkerRegistration>;
  }
}

export default function PWAController() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    const notifyUpdate = (registration: ServiceWorkerRegistration) => {
      window.dispatchEvent(
        new CustomEvent("pwa-update-available", { detail: registration }),
      );
    };

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });

        if (registration.waiting) {
          notifyUpdate(registration);
        }

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              notifyUpdate(registration);
            }
          });
        });

        void registration.update();
      } catch (error) {
        console.error("Erro ao registrar Service Worker:", error);
      }
    };

    if (document.readyState === "complete") {
      void registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    const updateActiveRegistration = () => {
      void navigator.serviceWorker
        .getRegistration()
        .then((registration) => registration?.update())
        .catch((error) => {
          console.error("Erro ao buscar atualização do Service Worker:", error);
        });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateActiveRegistration();
      }
    };

    window.addEventListener("focus", updateActiveRegistration);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      window.removeEventListener("load", registerServiceWorker);
      window.removeEventListener("focus", updateActiveRegistration);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
