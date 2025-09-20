"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PWADebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkPWAStatus = async () => {
      const info: any = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        isHttps: window.location.protocol === "https:",
        hasServiceWorker: "serviceWorker" in navigator,
        hasManifest: false,
        manifestData: null,
        serviceWorkerStatus: "unknown",
        installability: "unknown",
        isStandalone: false,
        permissions: {},
      };

      // Check if running as PWA
      info.isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      // Check manifest
      try {
        const manifestResponse = await fetch("/manifest.json");
        if (manifestResponse.ok) {
          info.hasManifest = true;
          info.manifestData = await manifestResponse.json();
        }
      } catch (error) {
        console.error("Error fetching manifest:", error);
      }

      // Check service worker
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            info.serviceWorkerStatus = {
              active: !!registration.active,
              installing: !!registration.installing,
              waiting: !!registration.waiting,
              scope: registration.scope,
              updateViaCache: registration.updateViaCache,
            };
          } else {
            info.serviceWorkerStatus = "not_registered";
          }
        } catch (error) {
          info.serviceWorkerStatus = `error: ${error}`;
        }
      }

      // Check permissions
      if ("permissions" in navigator) {
        try {
          const notificationPermission = await navigator.permissions.query({
            name: "notifications",
          });
          info.permissions.notifications = notificationPermission.state;

          const geolocationPermission = await navigator.permissions.query({
            name: "geolocation",
          });
          info.permissions.geolocation = geolocationPermission.state;
        } catch (error) {
          info.permissions.error = error.toString();
        }
      }

      setDebugInfo(info);
    };

    checkPWAStatus();
  }, []);

  const testInstallPrompt = () => {
    // Simular evento beforeinstallprompt
    const event = new Event("beforeinstallprompt");
    (event as any).preventDefault = () => console.log("preventDefault called");
    (event as any).prompt = () => console.log("prompt called");
    (event as any).userChoice = Promise.resolve({ outcome: "accepted" });

    window.dispatchEvent(event);
    console.log("🧪 Evento beforeinstallprompt simulado");
  };

  const forceReregisterSW = async () => {
    try {
      if ("serviceWorker" in navigator) {
        // Unregister all service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log("🗑️ Service Worker removido");
        }

        // Re-register
        const registration = await navigator.serviceWorker.register("/sw.js");
        console.log("✅ Service Worker re-registrado:", registration);

        // Update debug info
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Erro ao re-registrar SW:", error);
    }
  };

  return (
    <Card className="p-4 bg-yellow-50 border-yellow-200">
      <h3 className="font-bold text-yellow-800 mb-3">🔍 PWA Debug Info</h3>

      <div className="space-y-2 text-sm">
        <div>
          <strong>HTTPS:</strong> {debugInfo.isHttps ? "✅" : "❌"}{" "}
          {window.location.protocol}
        </div>
        <div>
          <strong>Service Worker:</strong>{" "}
          {debugInfo.hasServiceWorker ? "✅" : "❌"}
        </div>
        <div>
          <strong>Manifest:</strong> {debugInfo.hasManifest ? "✅" : "❌"}
        </div>
        <div>
          <strong>Standalone:</strong> {debugInfo.isStandalone ? "✅" : "❌"}
        </div>
        <div>
          <strong>SW Status:</strong>{" "}
          {JSON.stringify(debugInfo.serviceWorkerStatus)}
        </div>
        <div>
          <strong>Permissions:</strong> {JSON.stringify(debugInfo.permissions)}
        </div>
      </div>

      <div className="mt-4 space-x-2">
        <Button onClick={testInstallPrompt} size="sm" variant="outline">
          🧪 Test Install Event
        </Button>
        <Button onClick={forceReregisterSW} size="sm" variant="outline">
          🔄 Re-register SW
        </Button>
        <Button
          onClick={() => {
            console.log("📊 Full Debug Info:", debugInfo);
            alert("Debug info logged to console");
          }}
          size="sm"
          variant="outline"
        >
          📊 Log Full Info
        </Button>
      </div>
    </Card>
  );
}

