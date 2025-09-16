// Utility functions for input masks

export const formatCPF = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, "");

  // Apply CPF mask: 000.000.000-00
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  } else {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(
      6,
      9
    )}-${numbers.slice(9, 11)}`;
  }
};

export const formatCEP = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, "");

  // Apply CEP mask: 00000-000
  if (numbers.length <= 5) {
    return numbers;
  } else {
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  }
};

export const formatPhone = (value: string): string => {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, "");

  // Apply phone mask: (00) 00000-0000 or (00) 0000-0000
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(
      6
    )}`;
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(
      7,
      11
    )}`;
  }
};

// Hook for input masks
export const useInputMask = (maskType: "cpf" | "cep" | "phone") => {
  const formatValue = (value: string) => {
    switch (maskType) {
      case "cpf":
        return formatCPF(value);
      case "cep":
        return formatCEP(value);
      case "phone":
        return formatPhone(value);
      default:
        return value;
    }
  };

  const getMaxLength = () => {
    switch (maskType) {
      case "cpf":
        return 14; // 000.000.000-00
      case "cep":
        return 9; // 00000-000
      case "phone":
        return 15; // (00) 00000-0000
      default:
        return undefined;
    }
  };

  return {
    formatValue,
    maxLength: getMaxLength(),
  };
};
