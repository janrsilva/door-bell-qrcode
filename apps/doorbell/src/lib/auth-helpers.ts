import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { NextRequest } from "next/server";

// Helper para obter sessão no servidor
export async function getAuthSession() {
  return await getServerSession(authOptions);
}

// Helper OTIMIZADO: Usa headers injetados pelo middleware (mais eficiente)
export function getAuthUserFromHeaders(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const cpf = req.headers.get("x-user-cpf");
    const addressId = req.headers.get("x-address-id");
    const addressUuid = req.headers.get("x-address-uuid");
    const name = req.headers.get("x-user-name");
    const email = req.headers.get("x-user-email");

    // Se middleware injetou headers, usar eles (mais eficiente)
    if (userId && cpf && addressId) {
      return {
        userId: parseInt(userId),
        cpf,
        addressId: parseInt(addressId),
        addressUuid: addressUuid || "",
        name: name || "",
        email: email || "",
        phone: "", // Não disponível nos headers
        address: null, // Não disponível nos headers
      };
    }

    return null;
  } catch (error) {
    console.error("❌ Erro ao obter dados dos headers:", error);
    return null;
  }
}

// Helper LEGACY: Verifica sessão diretamente (menos eficiente)
export async function getAuthUserFromRequest(req: NextRequest) {
  try {
    // OTIMIZAÇÃO: Tentar headers primeiro
    const headerUser = getAuthUserFromHeaders(req);
    if (headerUser) {
      return headerUser;
    }

    // FALLBACK: Verificar sessão (caso headers não estejam disponíveis)
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return null;
    }

    return {
      userId: session.user.id,
      cpf: session.user.cpf,
      addressId: session.user.addressId,
      addressUuid: session.user.address.addressUuid,
      name: session.user.name,
      email: session.user.email,
      phone: session.user.phone,
      address: session.user.address,
    };
  } catch (error) {
    console.error("❌ Erro ao obter usuário da sessão:", error);
    return null;
  }
}

// Interface para dados do usuário autenticado
export interface AuthUser {
  userId: number;
  cpf: string;
  addressId: number;
  addressUuid: string;
  name: string;
  email: string;
  phone: string;
  address: {
    id: number;
    addressUuid: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}
