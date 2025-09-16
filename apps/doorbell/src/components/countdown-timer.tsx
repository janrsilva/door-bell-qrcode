"use client";

import { useState, useEffect } from "react";
import {
  DOORBELL_VISIT_EXPIRY_TIME_MS,
  DOORBELL_VISIT_EXPIRY_TIME_MINUTES,
} from "@/lib/constants";

type Props = {
  createdAt: string; // ISO string date from visit.createdAt
  onExpiryChange?: (isExpired: boolean) => void; // Callback to notify parent of expiry status
};

export default function CountdownTimer({ createdAt, onExpiryChange }: Props) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  function timeDifference() {
    // Use createdAt from visit to calculate expiry
    const now = new Date().getTime();
    const visitCreatedAt = new Date(createdAt).getTime();
    const expiryTime = visitCreatedAt + DOORBELL_VISIT_EXPIRY_TIME_MS;
    return expiryTime - now;
  }

  const [isExpired, setIsExpired] = useState(timeDifference() <= 0);

  useEffect(() => {
    if (isExpired) {
      return;
    }

    const calculateTimeLeft = () => {
      const difference = timeDifference();
      if (difference <= 0) {
        //force reload the page
        window.location.reload();
        setIsExpired(true);
        setTimeLeft("00:00:00");
        onExpiryChange?.(true);
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      setTimeLeft(formattedTime);
      onExpiryChange?.(false);
    };

    // Calculate immediately
    calculateTimeLeft();

    // Update every second
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [createdAt, isExpired, onExpiryChange]);

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
        <p className="text-red-800 font-medium text-sm">
          ⚠️ Esta página expirou. Por favor, escaneie o QR Code novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-blue-800 font-medium text-sm">⏰ Tempo restante:</p>
        <div className="bg-blue-100 px-3 py-1 rounded-md">
          <span className="text-blue-900 font-mono text-lg font-bold">
            {timeLeft}
          </span>
        </div>
      </div>
      <p className="text-blue-700 text-xs mt-1">
        Esta página expira em {DOORBELL_VISIT_EXPIRY_TIME_MINUTES} minutos após
        o primeiro acesso.
      </p>
    </div>
  );
}
