import { RegistrationFormData } from "@/lib/schemas";
import { VISIT_EXPIRY_TIME_MS } from "@/lib/constants";
import { prisma } from "@/lib/db";

export interface CreateVisitResult {
  success: boolean;
  visit?: any;
  error?: string;
}

export interface GetVisitResult {
  success: boolean;
  user?: any;
  visit?: any;
  expiredAt?: Date;
  isExpired?: boolean;
  error?: string;
}

export class SimpleDoorbellService {
  /**
   * Create a new doorbell visit
   */
  static async createVisit(addressUuid: string): Promise<CreateVisitResult> {
    try {
      // Find address by UUID
      const address = await prisma.address.findUnique({
        where: { addressUuid },
      });

      if (!address) {
        return {
          success: false,
          error: "Endereço não encontrado",
        };
      }

      const visit = await prisma.doorbellVisit.create({
        data: {
          addressId: address.id,
        },
      });

      return {
        success: true,
        visit,
      };
    } catch (error: any) {
      console.error("SimpleDoorbellService: Error creating visit:", error);
      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }

  /**
   * Get a doorbell visit with expiry information
   */
  static async getVisit(uuid: string): Promise<GetVisitResult> {
    try {
      // Find the visit
      const visit = await prisma.doorbellVisit.findUnique({
        where: { uuid },
        include: {
          address: true,
        },
      });

      if (!visit) {
        return {
          success: false,
          error: "Visita não encontrada",
        };
      }

      // Calculate expiry information
      const now = new Date();
      const expiredAt = new Date(
        visit.createdAt.getTime() + VISIT_EXPIRY_TIME_MS,
      );
      const isExpired = now > expiredAt;

      // Get user data
      const user = await prisma.user.findUnique({
        where: { addressId: visit.addressId },
        include: {
          address: true,
        },
      });

      return {
        success: true,
        user,
        visit,
        expiredAt,
        isExpired,
      };
    } catch (error: any) {
      console.error("SimpleDoorbellService: Error using visit:", error);
      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }

  /**
   * Ring the doorbell (simplified version)
   */
  static async ringBell(
    uuid: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const visit = await prisma.doorbellVisit.findUnique({
        where: { uuid },
      });

      if (!visit) {
        return {
          success: false,
          error: "Visita não encontrada",
        };
      }

      // Check if visit has expired
      const now = new Date();
      const expiredAt = new Date(
        visit.createdAt.getTime() + VISIT_EXPIRY_TIME_MS,
      );

      if (now > expiredAt) {
        return {
          success: false,
          error:
            "Esta visita expirou. Por favor, escaneie o QR Code novamente.",
        };
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error("SimpleDoorbellService: Error ringing bell:", error);
      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }
}
