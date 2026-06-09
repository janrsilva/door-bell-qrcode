"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RingButton from "@/components/ring-button";
import VoiceCallFirebase from "@/components/voice-call-firebase";
import CountdownTimer from "@/components/countdown-timer";
import { type Coordinates } from "@/lib/utils/latlong";
import ApiService from "@/lib/api";
import { getSimpleLocationInstructions } from "@/lib/utils/location-instructions";
import { useAddress } from "@/contexts/AddressContext";
import { getMaxDistance, MAX_DISTANCE } from "@/lib/utils/location-validation";
import { isVisitExpired } from "@/lib/constants";
import AddressBlock from "@/components/AdressBlock";
import { LucideAlertTriangle, LucideMapPin } from "lucide-react";
import AppVersion from "@/components/AppVersion";

type Props = {
  visit: {
    uuid: string;
    createdAt: Date;
    expiredAt?: Date;
    isExpired?: boolean;
    address: {
      addressUuid: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      latitude?: number;
      longitude?: number;
    };
  };
};

export default function DoorbellPageClient({ visit }: Props) {
  const [visitorCoords, setVisitorCoords] = useState<Coordinates | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);
  const [isRequestingLocationManually, setIsRequestingLocationManually] =
    useState(false);
  const [isGettingLocationAutomatically, setIsGettingLocationAutomatically] =
    useState(false);
  const hasCheckedLocationRef = useRef(false);
  const { addressData } = useAddress();

  // Verificar se endereço tem coordenadas (mover para antes do useEffect)
  const addressCoords: Coordinates | null =
    visit.address.latitude && visit.address.longitude
      ? { lat: visit.address.latitude, lon: visit.address.longitude }
      : null;

  // Verificar e obter localização automaticamente se já foi permitida
  useEffect(() => {
    const checkAndGetLocation = async () => {
      if (
        "permissions" in navigator &&
        addressCoords &&
        !visitorCoords &&
        !hasCheckedLocationRef.current
      ) {
        hasCheckedLocationRef.current = true; // Marcar que já verificou
        try {
          const permission = await navigator.permissions.query({
            name: "geolocation",
          });

          if (permission.state === "denied") {
            setLocationPermissionDenied(true);
          } else if (permission.state === "granted") {
            // Permissão já foi concedida, obter localização automaticamente
            setIsGettingLocationAutomatically(true);
            const result = await requestLocationOnDemand();
            setIsGettingLocationAutomatically(false);
          }

          // Escutar mudanças na permissão
          permission.onchange = async () => {
            const newState = permission.state === "denied";
            if (newState) {
              setLocationPermissionDenied(newState);
            }

            // Se mudou para granted e ainda não temos coordenadas, obter localização
            if (permission.state === "granted" && !newState && !visitorCoords) {
              setIsGettingLocationAutomatically(true);
              const result = await requestLocationOnDemand();
              setIsGettingLocationAutomatically(false);
            }
          };
        } catch (error) {
          console.warn("Could not check location permission:", error);
        }
      }
    };

    checkAndGetLocation();
  }, []); // Executar apenas uma vez ao montar o componente

  // Função para solicitar localização sob demanda
  const requestLocationOnDemand = async (): Promise<{
    success: boolean;
    coords?: Coordinates;
    error?: string;
  }> => {
    if (!addressCoords) {
      return {
        success: false,
        error: "Endereço não possui coordenadas configuradas",
      };
    }

    try {
      // Verificar se já foi negada anteriormente
      if ("permissions" in navigator) {
        const permission = await navigator.permissions.query({
          name: "geolocation",
        });
        if (permission.state === "denied") {
          return { success: false, error: "permission_denied" };
        }
      }

      // Solicitar localização
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000, // Cache por 1 minuto
          });
        },
      );

      const coords: Coordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };

      // Calcular distância
      const dist = Math.sqrt(
        Math.pow((coords.lat - addressCoords.lat) * 111000, 2) +
          Math.pow(
            (coords.lon - addressCoords.lon) *
              111000 *
              Math.cos((coords.lat * Math.PI) / 180),
            2,
          ),
      );

      // Atualizar estado
      setVisitorCoords(coords);
      setDistance(dist);

      return { success: true, coords };
    } catch (error: any) {
      let errorMessage = "Erro ao obter localização";

      if (error.code === error.PERMISSION_DENIED) {
        return { success: false, error: "permission_denied" };
      } else if (error.code === error.TIMEOUT) {
        errorMessage =
          "Timeout ao obter localização. Verifique se o GPS está ativado.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMessage = "Localização indisponível. Verifique sua conexão e GPS.";
      }

      return { success: false, error: errorMessage };
    }
  };

  const handleCallStart = async () => {
    // Ring the doorbell when starting a voice call
    try {
      if (!visitorCoords) {
        throw new Error("Localização não disponível");
      }

      const coords = {
        lat: visitorCoords.lat,
        lon: visitorCoords.lon,
        acc: 20,
      };

      const result = await ApiService.ringBell(visit.uuid, coords);
      if (!result.ok) {
        throw new Error(result.error || "Erro ao tocar a campainha");
      }
    } catch (error) {
      console.error("Error ringing bell during call start:", error);
    }
  };

  // return (
  //   <div className="p-1">
  //     <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
  //       {addressData && <AddressBlock addressData={addressData} />}
  //     </div>
  //   </div>
  // );

  return (
    <main className="min-h-dvh flex items-center justify-center md:p-4">
      <Card className="max-w-md w-full m-0 p-4 space-y-4 border-none shadow-none md:shadow-md md:rounded-lg md:border">
        <h1 className="text-2xl text-center font-semibold">
          CAMPAINHA ELETRÔNICA
        </h1>

        <Separator />
        <AddressBlock addressData={visit.address} />

        {/* Location Permission Warning */}
        {locationPermissionDenied && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🔒</div>
              <div className="flex-1">
                <p className="font-medium text-red-800">
                  Localização Bloqueada
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Para usar a campainha e chamadas de voz, você precisa permitir
                  o acesso à localização.
                </p>
                <button
                  onClick={() => {
                    const instructions = getSimpleLocationInstructions();
                    alert(instructions);
                  }}
                  className="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                >
                  📍 Ver instruções para reativar
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Location Info - Apenas informativo */}
        {!addressCoords && (
          <Card className="p-4 bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <p className="font-medium text-gray-600">
                  📍 Localização não configurada
                </p>
                <p className="text-sm text-gray-500">
                  Este endereço não possui coordenadas cadastradas para
                  verificação de proximidade
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading state quando obtendo localização automaticamente */}
        {addressCoords && !visitorCoords && isGettingLocationAutomatically && (
          <Card className="p-4 bg-green-50 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                <span className="animate-spin">📍</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800">
                  Obtendo Localização Automaticamente
                </p>
                <p className="text-sm text-green-600">
                  Permissão já concedida, verificando sua posição atual...
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Location Info - Quando há coordenadas mas ainda não verificamos proximidade */}
        {addressCoords && !visitorCoords && !isGettingLocationAutomatically && (
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📍</div>
              <div className="flex-1">
                <p className="font-medium text-blue-800">
                  Verificação de Proximidade
                </p>
                <p className="text-sm text-blue-600 mb-3">
                  Sua localização será solicitada quando você tentar usar a
                  campainha ou chamada de voz para verificar se está próximo ao
                  endereço (máximo 50m).
                </p>
                <button
                  onClick={async () => {
                    if (isRequestingLocationManually) return;

                    setIsRequestingLocationManually(true);
                    const result = await requestLocationOnDemand();
                    setIsRequestingLocationManually(false);

                    if (
                      !result.success &&
                      result.error === "permission_denied"
                    ) {
                      // Mostrar instruções se foi negada
                      const instructions = getSimpleLocationInstructions();
                      alert(instructions);
                    }
                  }}
                  disabled={isRequestingLocationManually}
                  className="text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRequestingLocationManually ? (
                    <>
                      <span className="animate-spin inline-block mr-1">⏳</span>
                      Solicitando...
                    </>
                  ) : (
                    "📍 Ativar localização agora"
                  )}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Location Status - Quando já temos a localização */}
        {visitorCoords && distance !== null && (
          <>
            {getMaxDistance(distance) ? (
              // Localização OK - Card simples e discreto
              <div className="text-center py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-start gap-2">
                  <div className="text-lg">
                    <LucideMapPin />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    Sua localização está ativa, {distance.toFixed(0)}m
                  </p>
                </div>
              </div>
            ) : (
              // Localização fora do limite - Card destacado para chamar atenção
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">❌</div>
                  <div className="flex-1">
                    <p className="font-medium text-red-800">Muito Distante</p>
                    <p className="text-sm text-red-600">
                      Você está a {distance.toFixed(0)}m do endereço (máximo:{" "}
                      {MAX_DISTANCE}m)
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-600 mt-0.5">
              <LucideAlertTriangle />
            </div>
            <div>
              <p className="text-yellow-800 font-medium text-sm">
                <strong className="block text-base">ENTREGADOR</strong>
                <strong>
                  SEMPRE CONFIRME O ENDEREÇO E OS DADOS DO DESTINATÁRIO
                </strong>
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                <strong>Evite fraudes! </strong>
                Só toque a campainha se você estiver no endereço correto.
              </p>
            </div>
          </div>
        </div>

        <Separator />
        <RingButton
          visit={visit}
          visitorCoords={visitorCoords}
          distance={distance}
          onRequestLocation={requestLocationOnDemand}
        />

        {/* Voice Call Component */}
        <VoiceCallFirebase
          role="visitor"
          addressUuid={visit.address.addressUuid}
          startVisitUuid={visit.uuid}
          visitorCoords={visitorCoords}
          distance={distance}
          disabled={isVisitExpired(visit.createdAt)}
          onCallStart={handleCallStart}
          onRequestLocation={requestLocationOnDemand}
        />
        <Separator />
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            Ao tocar a campainha, o morador recebe uma notificação imediata. Use
            a chamada de voz para falar diretamente com o morador.
          </p>
          <p>
            Por segurança, podemos registrar horário e localização aproximada da
            tentativa de contato.
          </p>
          <CountdownTimer createdAt={visit.createdAt.toISOString()} />
          <AppVersion />
        </div>
      </Card>
    </main>
  );
}
