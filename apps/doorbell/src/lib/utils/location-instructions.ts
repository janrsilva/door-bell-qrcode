/**
 * Utility functions for location permission instructions
 */

export const getLocationInstructions = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes("chrome");
  const isFirefox = userAgent.includes("firefox");
  const isSafari =
    userAgent.includes("safari") && !userAgent.includes("chrome");
  const isEdge = userAgent.includes("edge");
  const isMobile =
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

  let instructions = "🔒 COMO REATIVAR A LOCALIZAÇÃO:\n\n";

  if (isMobile) {
    if (userAgent.includes("android")) {
      instructions += "📱 ANDROID:\n";
      instructions +=
        "1. Toque no ícone de cadeado/informações na barra de endereço\n";
      instructions += "2. Toque em 'Permissões' ou 'Configurações do site'\n";
      instructions += "3. Encontre 'Localização' e altere para 'Permitir'\n";
      instructions += "4. Recarregue a página\n\n";
      instructions +=
        "OU vá em Configurações > Apps > [Navegador] > Permissões > Localização";
    } else if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      instructions += "📱 iOS (iPhone/iPad):\n";
      instructions +=
        "1. Vá em Configurações > Privacidade e Segurança > Serviços de Localização\n";
      instructions +=
        "2. Certifique-se que 'Serviços de Localização' está ativado\n";
      instructions +=
        "3. Role para baixo e encontre seu navegador (Safari, Chrome, etc.)\n";
      instructions += "4. Toque no navegador e selecione 'Ao Usar o App'\n";
      instructions += "5. Volte ao navegador e recarregue a página";
    }
  } else {
    // Desktop
    if (isChrome || isEdge) {
      instructions += "💻 CHROME/EDGE:\n";
      instructions += "1. Clique no ícone de cadeado ao lado da URL\n";
      instructions += "2. Clique em 'Configurações do site'\n";
      instructions += "3. Encontre 'Localização' e altere para 'Permitir'\n";
      instructions += "4. Recarregue a página\n\n";
      instructions += "OU vá em: chrome://settings/content/location";
    } else if (isFirefox) {
      instructions += "💻 FIREFOX:\n";
      instructions += "1. Clique no ícone de escudo/cadeado ao lado da URL\n";
      instructions += "2. Clique na seta ao lado de 'Bloqueado'\n";
      instructions +=
        "3. Encontre 'Acessar sua localização' e clique em 'Permitir'\n";
      instructions += "4. Recarregue a página";
    } else if (isSafari) {
      instructions += "💻 SAFARI:\n";
      instructions += "1. Vá em Safari > Preferências > Sites\n";
      instructions += "2. Clique em 'Localização' na barra lateral\n";
      instructions += "3. Encontre este site e altere para 'Permitir'\n";
      instructions += "4. Recarregue a página";
    } else {
      instructions += "💻 NAVEGADOR GENÉRICO:\n";
      instructions +=
        "1. Procure pelo ícone de cadeado/informações na barra de endereço\n";
      instructions +=
        "2. Clique nele e procure por configurações de localização\n";
      instructions += "3. Altere a permissão para 'Permitir'\n";
      instructions += "4. Recarregue a página";
    }
  }

  instructions +=
    "\n\n💡 DICA: Se não conseguir, tente limpar os dados do site nas configurações do navegador e visitar novamente.";
  instructions +=
    "\n\n🔄 Após seguir essas instruções, recarregue a página para que as mudanças tenham efeito.";

  return instructions;
};

export const getSimpleLocationInstructions = (): string => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile =
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

  let instructions = "🔒 PERMISSÃO NEGADA ANTERIORMENTE\n\nPara reativar:\n\n";

  if (isMobile) {
    if (userAgent.includes("android")) {
      instructions +=
        "📱 ANDROID:\n1. Toque no cadeado na barra de endereço\n2. Toque em 'Permissões'\n3. Ative 'Localização'\n4. Recarregue a página";
    } else {
      instructions +=
        "📱 iOS:\n1. Configurações > Privacidade > Localização\n2. Encontre seu navegador\n3. Selecione 'Ao Usar o App'\n4. Volte e recarregue a página";
    }
  } else {
    instructions +=
      "💻 DESKTOP:\n1. Clique no cadeado ao lado da URL\n2. Clique em 'Configurações do site'\n3. Altere 'Localização' para 'Permitir'\n4. Recarregue a página";
  }

  return instructions;
};

export const checkLocationPermissionStatus = async (): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> => {
  if (!("permissions" in navigator)) {
    return "unknown";
  }

  try {
    const permission = await navigator.permissions.query({
      name: "geolocation",
    });
    return permission.state;
  } catch (error) {
    console.warn("Could not check location permission:", error);
    return "unknown";
  }
};

export const requestLocationWithFallback = async (): Promise<{
  success: boolean;
  coords?: { lat: number; lon: number };
  error?: string;
}> => {
  try {
    // Check permission first
    const permissionStatus = await checkLocationPermissionStatus();

    if (permissionStatus === "denied") {
      return {
        success: false,
        error:
          "Permission was denied previously. Please enable location access in browser settings.",
      };
    }

    // Try to get location
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      }
    );

    return {
      success: true,
      coords: {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      },
    };
  } catch (error: any) {
    let errorMessage = "Failed to get location";

    if (error.code === error.PERMISSION_DENIED) {
      errorMessage =
        "Location permission denied. Please enable in browser settings.";
    } else if (error.code === error.TIMEOUT) {
      errorMessage = "Location request timed out. Please check GPS settings.";
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      errorMessage = "Location unavailable. Please check connection and GPS.";
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

