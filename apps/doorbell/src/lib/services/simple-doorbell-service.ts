import { RegistrationFormData } from "@/lib/schemas";
import { DOORBELL_VISIT_EXPIRY_TIME_MS } from "@/lib/constants";

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
  private static async getPrisma() {
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient();
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

      const prisma = await this.getPrisma();

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

      const prisma = await this.getPrisma();

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
        visit.createdAt.getTime() + DOORBELL_VISIT_EXPIRY_TIME_MS
      );
      const isExpired = now > expiredAt;

      // Get user data
      const user = await prisma.user.findUnique({
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
      const prisma = await this.getPrisma();
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
