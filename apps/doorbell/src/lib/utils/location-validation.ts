/**
 * Utilitários para validação de localização e proximidade
 */

export const MAX_DISTANCE = 50;

export function getMaxDistance(distance: number): boolean {
  return distance <= MAX_DISTANCE;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationValidationResult {
  isValid: boolean;
  distance?: number;
  maxDistance: number;
  error?: string;
}

/**
 * Calcula a distância entre duas coordenadas em metros usando a fórmula de Haversine
 */
export function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates,
): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lon - coord1.lon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Valida se as coordenadas do visitante estão dentro da distância permitida do endereço
 */
export function validateVisitorLocation(
  visitorCoords: Coordinates,
  addressCoords: Coordinates,
  maxDistance: number = MAX_DISTANCE, // 50 metros por padrão
): LocationValidationResult {
  try {
    // Validar se as coordenadas são válidas
    if (!isValidCoordinates(visitorCoords)) {
      return {
        isValid: false,
        maxDistance,
        error: "Coordenadas do visitante inválidas",
      };
    }

    if (!isValidCoordinates(addressCoords)) {
      return {
        isValid: false,
        maxDistance,
        error: "Coordenadas do endereço inválidas",
      };
    }

    // Calcular distância
    const distance = calculateDistance(visitorCoords, addressCoords);

    return {
      isValid: distance <= maxDistance,
      distance,
      maxDistance,
      error:
        distance > maxDistance
          ? `Visitante está a ${distance.toFixed(1)}m do endereço (máximo: ${maxDistance}m)`
          : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      maxDistance,
      error: `Erro ao validar localização: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
}

/**
 * Valida se as coordenadas são válidas
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return (
    coords &&
    typeof coords.lat === "number" &&
    typeof coords.lon === "number" &&
    !isNaN(coords.lat) &&
    !isNaN(coords.lon) &&
    coords.lat >= -90 &&
    coords.lat <= 90 &&
    coords.lon >= -180 &&
    coords.lon <= 180
  );
}

/**
 * Validação simplificada para uso no frontend (sem dependências externas)
 */
export function validateLocationFrontend(
  visitorCoords: Coordinates,
  addressCoords: Coordinates,
  maxDistance: number = MAX_DISTANCE,
): boolean {
  if (
    !isValidCoordinates(visitorCoords) ||
    !isValidCoordinates(addressCoords)
  ) {
    return false;
  }

  // Cálculo simplificado para frontend (aproximação)
  const dist = Math.sqrt(
    Math.pow((visitorCoords.lat - addressCoords.lat) * 111000, 2) +
      Math.pow(
        (visitorCoords.lon - addressCoords.lon) *
          111000 *
          Math.cos((visitorCoords.lat * Math.PI) / 180),
        2,
      ),
  );

  return dist <= maxDistance;
}
