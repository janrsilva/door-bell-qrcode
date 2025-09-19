"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getCurrentLocation } from "@/lib/utils/latlong";

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

interface LocationPickerProps {
  value?: LocationData;
  onChange?: (location: LocationData) => void;
  disabled?: boolean;
}

// Importação dinâmica do Google Maps
const GoogleMapComponent = dynamic(() => import("./GoogleMapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <div className="text-center">
        <div className="animate-pulse text-gray-500">🗺️</div>
        <p className="text-sm text-gray-500 mt-2">Carregando mapa...</p>
      </div>
    </div>
  ),
});

export default function LocationPicker({
  value,
  onChange,
  disabled = false,
}: LocationPickerProps) {
  const [position, setPosition] = useState({
    lat: value?.latitude || -19.9786533,
    lng: value?.longitude || -44.0037764,
  });
  const [address, setAddress] = useState(value?.address || "");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    if (value) {
      setPosition({
        lat: value.latitude,
        lng: value.longitude,
      });
      setAddress(value.address || "");
    }
  }, [value]);

  // Função para buscar endereço por coordenadas (geocoding reverso)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();

      if (data && data.display_name) {
        return data.display_name;
      }
    } catch (error) {
      console.error("Erro no geocoding reverso:", error);
    }
    return "";
  };

  // Obter localização atual
  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const coords = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });

      const newPosition = { lat: coords.lat, lng: coords.lon };
      setPosition(newPosition);

      const foundAddress = await reverseGeocode(coords.lat, coords.lon);
      setAddress(foundAddress);

      if (onChange) {
        onChange({
          latitude: coords.lat,
          longitude: coords.lon,
          address: foundAddress,
        });
      }
    } catch (error: any) {
      console.error("Erro ao obter localização:", error);
      alert(`Erro ao obter localização: ${error.message}`);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Quando a posição muda no mapa
  const handlePositionChange = async (newPosition: {
    lat: number;
    lng: number;
  }) => {
    setPosition(newPosition);

    // Buscar endereço para as novas coordenadas
    const foundAddress = await reverseGeocode(newPosition.lat, newPosition.lng);
    setAddress(foundAddress);

    if (onChange) {
      onChange({
        latitude: newPosition.lat,
        longitude: newPosition.lng,
        address: foundAddress,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Localização do Endereço</Label>

        {/* Botão para obter localização atual */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGetCurrentLocation}
          disabled={disabled || isGettingLocation}
          className="w-full"
        >
          {isGettingLocation ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Obtendo localização...
            </>
          ) : (
            <>📍 Usar Minha Localização Atual</>
          )}
        </Button>
      </div>

      {/* Mapa */}
      <div className="h-64 w-full border rounded-lg overflow-hidden">
        <GoogleMapComponent
          position={position}
          onPositionChange={handlePositionChange}
          disabled={disabled}
          showCurrentLocation={true}
        />
      </div>

      {/* Coordenadas atuais */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>
          <strong>Latitude:</strong> {position.lat.toFixed(7)}
        </div>
        <div>
          <strong>Longitude:</strong> {position.lng.toFixed(7)}
        </div>
        {address && (
          <div>
            <strong>Endereço:</strong> {address}
          </div>
        )}
      </div>

      {/* Legenda do mapa */}
      <div className="text-xs bg-gray-50 p-3 rounded-lg space-y-2">
        <div className="font-medium text-gray-700 mb-2">
          🗺️ Legenda do Mapa:
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-4 bg-red-500 rounded-sm"></div>
            <span className="text-gray-600">
              📍 Pin vermelho = Localização do endereço (arraste para ajustar)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">
              🔵 Ponto azul = Sua localização atual (GPS)
            </span>
          </div>
        </div>
      </div>

      <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
        💡 <strong>Dica:</strong> Arraste o pin vermelho para a localização
        exata do seu endereço. O ponto azul mostra onde você está agora.
      </div>
    </div>
  );
}
