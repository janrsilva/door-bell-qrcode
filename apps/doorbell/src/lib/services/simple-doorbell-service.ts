import { RegistrationFormData } from "@/lib/schemas";
import { DOORBELL_VISIT_EXPIRY_TIME_MS } from "@/lib/constants";
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
   * Get Prisma client instance
   */
  private static getPrisma() {
    return prisma;
  }

  /**
   * Create a new doorbell visit
   */
  static async createVisit(addressUuid: string): Promise<CreateVisitResult> {
    try {
      console.log(
        "SimpleDoorbellService: Creating visit for address:",
        addressUuid
      );

      const prismaClient = this.getPrisma();

      // Find address by UUID
      const address = await prismaClient.address.findUnique({
        where: { addressUuid },
      });

      if (!address) {
        return {
          success: false,
          error: "Endereço não encontrado",
        };
      }

      const visit = await prismaClient.doorbellVisit.create({
        data: {
          addressId: address.id,
        },
      });

      console.log("SimpleDoorbellService: Visit created successfully:", visit);

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
      console.log("SimpleDoorbellService: Using visit:", uuid);

      const prismaClient = this.getPrisma();

      // Find the visit
      const visit = await prismaClient.doorbellVisit.findUnique({
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
        visit.createdAt.getTime() + DOORBELL_VISIT_EXPIRY_TIME_MS
      );
      const isExpired = now > expiredAt;

      // Get user data
      const user = await prismaClient.user.findUnique({
        where: { addressId: visit.addressId },
        include: {
          address: true,
        },
      });

      console.log("SimpleDoorbellService: Visit retrieved:", {
        uuid: visit.uuid,
        createdAt: visit.createdAt,
        expiredAt,
        isExpired,
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
    uuid: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const prismaClient = this.getPrisma();
      const visit = await prismaClient.doorbellVisit.findUnique({
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
        visit.createdAt.getTime() + DOORBELL_VISIT_EXPIRY_TIME_MS
      );

      if (now > expiredAt) {
        return {
          success: false,
          error:
            "Esta visita expirou. Por favor, escaneie o QR Code novamente.",
        };
      }

      console.log("SimpleDoorbellService: Bell rung for visit:", uuid);

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
