/**
 * Utilitários para cálculos de latitude/longitude
 * Reutilizado em frontend e backend
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationResult {
  distance: number; // em metros
  isWithinRange: boolean;
  maxDistance: number; // limite configurado
}

/**
 * Calcula a distância entre duas coordenadas usando a fórmula de Haversine
 * @param coord1 Primeira coordenada (lat, lon)
 * @param coord2 Segunda coordenada (lat, lon)
 * @returns Distância em metros
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (coord1.lat * Math.PI) / 180; // φ, λ em radianos
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lon - coord1.lon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // em metros

  return Math.round(distance);
}

/**
 * Verifica se uma localização está dentro do raio permitido
 * @param addressCoords Coordenadas do endereço cadastrado
 * @param visitorCoords Coordenadas do visitante
 * @param maxDistance Distância máxima permitida em metros (padrão: 50)
 * @returns Resultado com distância e se está dentro do raio
 */
export function checkLocationProximity(
  addressCoords: Coordinates,
  visitorCoords: Coordinates,
  maxDistance: number = 50
): LocationResult {
  const distance = calculateDistance(addressCoords, visitorCoords);
  const isWithinRange = distance <= maxDistance;

  return {
    distance,
    isWithinRange,
    maxDistance,
  };
}

/**
 * Formatar distância para exibição
 * @param distance Distância em metros
 * @returns String formatada (ex: "25m", "1.2km")
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${distance}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
}

/**
 * Obter coordenadas via Geolocation API com alta precisão
 * @param options Opções de geolocalização
 * @returns Promise com coordenadas ou erro
 */
export function getCurrentLocation(
  options?: PositionOptions
): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada neste navegador"));
      return;
    }

    // Configurações otimizadas para máxima precisão
    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,    // Usar GPS quando disponível
      timeout: 15000,              // Timeout maior para permitir GPS
      maximumAge: 0,               // Não usar cache, sempre buscar nova posição
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        // Log da precisão obtida para debug
        console.log(`📍 Localização obtida - Precisão: ${position.coords.accuracy.toFixed(1)}m`);
        
        resolve(coords);
      },
      (error) => {
        let errorMessage = "Erro ao obter localização";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão de localização negada";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Localização não disponível";
            break;
          case error.TIMEOUT:
            errorMessage = "Timeout ao obter localização (tentando GPS)";
            break;
        }

        reject(new Error(errorMessage));
      },
      defaultOptions
    );
  });
}

/**
 * Obter localização com múltiplas tentativas para máxima precisão
 * @param maxAttempts Número máximo de tentativas
 * @param minAccuracy Precisão mínima desejada em metros
 * @returns Promise com a melhor coordenada obtida
 */
export function getHighAccuracyLocation(
  maxAttempts: number = 3,
  minAccuracy: number = 20
): Promise<{ coords: Coordinates; accuracy: number }> {
  return new Promise(async (resolve, reject) => {
    let bestResult: { coords: Coordinates; accuracy: number } | null = null;
    let attempts = 0;

    const tryGetLocation = async (): Promise<void> => {
      try {
        attempts++;
        console.log(`📍 Tentativa ${attempts}/${maxAttempts} para obter localização precisa...`);

        const position = await new Promise<GeolocationPosition>((res, rej) => {
          navigator.geolocation.getCurrentPosition(
            res,
            rej,
            {
              enableHighAccuracy: true,
              timeout: attempts === 1 ? 20000 : 10000, // Mais tempo na primeira tentativa
              maximumAge: 0, // Sempre buscar nova posição
            }
          );
        });

        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        const accuracy = position.coords.accuracy;
        console.log(`✅ Posição obtida - Precisão: ${accuracy.toFixed(1)}m`);

        // Se é a primeira tentativa ou se a precisão melhorou
        if (!bestResult || accuracy < bestResult.accuracy) {
          bestResult = { coords, accuracy };
          console.log(`🎯 Nova melhor precisão: ${accuracy.toFixed(1)}m`);
        }

        // Se atingiu a precisão desejada, retorna
        if (accuracy <= minAccuracy) {
          console.log(`✅ Precisão desejada atingida: ${accuracy.toFixed(1)}m ≤ ${minAccuracy}m`);
          resolve(bestResult);
          return;
        }

        // Se ainda não atingiu o máximo de tentativas, tenta novamente
        if (attempts < maxAttempts) {
          console.log(`🔄 Tentando melhorar precisão... (atual: ${accuracy.toFixed(1)}m, desejada: ≤${minAccuracy}m)`);
          setTimeout(tryGetLocation, 1000); // Aguarda 1s entre tentativas
        } else {
          console.log(`✅ Melhor precisão obtida após ${attempts} tentativas: ${bestResult.accuracy.toFixed(1)}m`);
          resolve(bestResult);
        }
      } catch (error) {
        if (bestResult) {
          // Se já tem algum resultado, usa ele
          console.log(`⚠️ Erro na tentativa ${attempts}, usando melhor resultado: ${bestResult.accuracy.toFixed(1)}m`);
          resolve(bestResult);
        } else if (attempts < maxAttempts) {
          // Tenta novamente
          console.log(`❌ Erro na tentativa ${attempts}, tentando novamente...`);
          setTimeout(tryGetLocation, 2000);
        } else {
          // Falhou em todas as tentativas
          reject(error);
        }
      }
    };

    tryGetLocation();
  });
}

/**
 * Coordenadas padrão para testes (São Paulo - Centro)
 */
export const DEFAULT_TEST_COORDINATES: Coordinates = {
  lat: -23.5505,
  lon: -46.6333,
};

/**
 * Validar se coordenadas são válidas
 * @param coords Coordenadas para validar
 * @returns true se válidas
 */
export function isValidCoordinates(coords: any): coords is Coordinates {
  return (
    coords &&
    typeof coords.lat === "number" &&
    typeof coords.lon === "number" &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lon >= -180 &&
    coords.lon <= 180
  );
}
