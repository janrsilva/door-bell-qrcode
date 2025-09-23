"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getCurrentLocation,
  getHighAccuracyLocation,
  checkLocationProximity,
  formatDistance,
  type Coordinates,
} from "@/lib/utils/latlong";
import { MAX_DISTANCE } from "@/lib/utils/location-validation";

interface LocationTrackerProps {
  addressCoords: Coordinates;
  onLocationUpdate: (
    coords: Coordinates | null,
    distance: number | null,
  ) => void;
}

export function LocationTracker({
  addressCoords,
  onLocationUpdate,
}: LocationTrackerProps) {
  const [visitorCoords, setVisitorCoords] = useState<Coordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRange, setIsWithinRange] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isImproving, setIsImproving] = useState(false);

  const forceLocationUpdate = async () => {
    try {
      setIsImproving(true);
      setLocationError(null);

      const preciseResult = await getHighAccuracyLocation(5, 5); // 5 tentativas, 5m precisão

      setVisitorCoords(preciseResult.coords);
      setAccuracy(preciseResult.accuracy);

      const result = checkLocationProximity(
        addressCoords,
        preciseResult.coords,
      );
      setDistance(result.distance);
      setIsWithinRange(result.isWithinRange);

      onLocationUpdate(preciseResult.coords, result.distance);
    } catch (error: any) {
      setLocationError(error.message);
    } finally {
      setIsImproving(false);
    }
  };

  // Obter localização inicial apenas uma vez
  useEffect(() => {
    let isMounted = true;

    const getInitialLocation = async () => {
      if (!isMounted || visitorCoords) return; // Não executar se já tem localização

      try {
        setIsLoading(true);
        setLocationError(null);

        // Obter localização com configuração balanceada
        const result = await getCurrentLocation({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // Cache por 5 minutos
        });

        if (isMounted) {
          setVisitorCoords(result);
          const distanceResult = checkLocationProximity(addressCoords, result);
          setDistance(distanceResult.distance);
          setIsWithinRange(distanceResult.isWithinRange);
          onLocationUpdate(result, distanceResult.distance);
          setAccuracy(20); // Precisão padrão estimada
        }
      } catch (error: any) {
        if (isMounted) {
          setLocationError(error.message);
          setVisitorCoords(null);
          setDistance(null);
          setIsWithinRange(false);
          onLocationUpdate(null, null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialLocation();

    return () => {
      isMounted = false;
    };
  }, [addressCoords, onLocationUpdate]); // Removido visitorCoords para evitar loops

  const getLocationStatus = () => {
    if (isLoading && !visitorCoords) {
      return {
        icon: "📍",
        text: "Obtendo localização...",
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
      };
    }

    if (isImproving) {
      return {
        icon: "🎯",
        text: `${formatDistance(distance!)} do endereço (melhorando precisão...)`,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
      };
    }

    if (locationError && !visitorCoords) {
      return {
        icon: "❌",
        text: `Erro: ${locationError}`,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
      };
    }

    if (distance === null) {
      return {
        icon: "❓",
        text: "Localização não disponível",
        color: "text-gray-600",
        bg: "bg-gray-50",
        border: "border-gray-200",
      };
    }

    const precisionText = accuracy ? ` (±${accuracy.toFixed(0)}m)` : "";

    if (isWithinRange) {
      return {
        icon: "✅",
        text: `${formatDistance(distance)} do endereço${precisionText}`,
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
      };
    } else {
      return {
        icon: "⚠️",
        text: `${formatDistance(distance)} do endereço${precisionText} (muito longe)`,
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
      };
    }
  };

  const status = getLocationStatus();

  return (
    <Card className={`p-4 ${status.bg} ${status.border} border`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">{status.icon}</div>
        <div className="flex-1">
          <p className={`font-medium ${status.color}`}>📍 Sua Localização</p>
          <p className={`text-sm ${status.color}`}>{status.text}</p>
          {distance !== null && (
            <p className="text-xs text-gray-500 mt-1">Máximo permitido: 50m</p>
          )}
        </div>
      </div>

      {!isWithinRange && distance !== null && distance > MAX_DISTANCE && (
        <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-md">
          <p className="text-sm text-orange-800 font-medium">
            🚫 Muito longe para tocar a campainha
          </p>
          <p className="text-xs text-orange-700 mt-1">
            Você precisa estar a no máximo {MAX_DISTANCE} metros do endereço
          </p>
        </div>
      )}
      {/* Botão para melhorar precisão */}
      {!isLoading && !isImproving && visitorCoords && (
        <Button
          variant="outline"
          size="default"
          onClick={forceLocationUpdate}
          className="w-full mt-2 text-xs h-10"
        >
          🎯 Melhorar Precisão
        </Button>
      )}
    </Card>
  );
}

export default LocationTracker;
