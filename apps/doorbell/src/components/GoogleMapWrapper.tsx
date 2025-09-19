import React, { useCallback, useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Importação com tipos any para evitar conflitos
const { GoogleMap, LoadScript, Marker } =
  require("@react-google-maps/api") as any;

interface GoogleMapWrapperProps {
  position: { lat: number; lng: number };
  onPositionChange: (position: { lat: number; lng: number }) => void;
  disabled?: boolean;
  showCurrentLocation?: boolean;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function GoogleMapWrapper({
  position,
  onPositionChange,
  disabled = false,
  showCurrentLocation = true,
}: GoogleMapWrapperProps) {
  const mapRef = useRef<google.maps.Map>();
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Capturar localização atual quando componente é montado
  useEffect(() => {
    if (
      showCurrentLocation &&
      typeof window !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Localização atual não disponível:", error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    }
  }, [showCurrentLocation]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMarkerDrag = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      onPositionChange({ lat, lng });
    },
    [onPositionChange]
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (disabled || !e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      onPositionChange({ lat, lng });
    },
    [disabled, onPositionChange]
  );

  // Se não tem API key, mostra campos manuais
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="p-4 bg-gray-100">
        <div className="text-center mb-4">
          <div className="text-2xl mb-2">🗺️</div>
          <p className="text-sm text-gray-700 font-medium mb-1">
            Google Maps não configurado
          </p>
          <p className="text-xs text-gray-500 mb-1">
            Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
          <p className="text-xs text-gray-500">
            Veja GOOGLE_MAPS_SETUP.md para instruções
          </p>
        </div>

        {/* Campos manuais de coordenadas */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="any"
                placeholder="-19.9786533"
                value={position.lat}
                onChange={(e) => {
                  const lat = parseFloat(e.target.value) || position.lat;
                  onPositionChange({ lat, lng: position.lng });
                }}
                disabled={disabled}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="any"
                placeholder="-44.0037764"
                value={position.lng}
                onChange={(e) => {
                  const lng = parseFloat(e.target.value) || position.lng;
                  onPositionChange({ lat: position.lat, lng });
                }}
                disabled={disabled}
                className="text-xs"
              />
            </div>
          </div>
          <p className="text-xs text-blue-600 text-center">
            💡 Digite as coordenadas manualmente ou use o botão de localização
            atual
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={position}
        zoom={16}
        onLoad={onLoad}
        onClick={handleMapClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
        }}
      >
        {/* Marcador da localização selecionada (pin vermelho padrão) */}
        <Marker
          position={position}
          draggable={!disabled}
          onDragEnd={handleMarkerDrag}
          title="📍 Localização do endereço (arraste para ajustar)"
        />

        {/* Apenas ponto azul da localização atual (sem círculo de precisão) */}
        {currentLocation && typeof window !== "undefined" && window.google && (
          <Marker
            position={currentLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285f4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
            title="📱 Sua localização atual"
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
}
