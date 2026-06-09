"use client";

import { useEffect, useState } from "react";

type AppVersionPayload = {
  version?: string;
  label?: string;
};

export default function AppVersion() {
  const [versionLabel, setVersionLabel] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadVersion = async () => {
      try {
        const response = await fetch(`/app-version.json?t=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as AppVersionPayload;
        if (isMounted && (payload.label || payload.version)) {
          setVersionLabel(payload.label || payload.version || null);
        }
      } catch (error) {
        console.warn("Não foi possível carregar versão do app", error);
      }
    };

    void loadVersion();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!versionLabel) return null;

  return (
    <p className="pt-2 text-center text-[11px] leading-none text-gray-400">
      versão {versionLabel}
    </p>
  );
}
