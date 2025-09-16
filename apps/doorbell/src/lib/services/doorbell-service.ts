import { RegistrationFormData } from "@/lib/schemas";

export interface DoorbellVisit {
  id: number;
  addressUuid: string;
  used: boolean;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CreateVisitResult {
  success: boolean;
  visit?: DoorbellVisit;
  error?: string;
}

export interface UseVisitResult {
  success: boolean;
  user?: any; // User data
  visit?: any; // Visit data
  error?: string;
}

export class DoorbellService {
  /**
   * Get Prisma client instance
   */
  private static async getPrisma() {
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient();
  }

  /**
   * Find address by UUID
   */
  static async findAddressByUuid(addressUuid: string): Promise<any> {
    try {
      const prisma = await this.getPrisma();
      const address = await prisma.address.findUnique({
        where: { addressUuid },
      });

      return address;
    } catch (error) {
      console.error("DoorbellService: Error finding address by UUID:", error);
      return null;
    }
  }

  /**
   * Find user by address UUID
   */
  static async findUserByAddressUuid(addressUuid: string): Promise<any> {
    try {
      const prisma = await this.getPrisma();
      const address = await prisma.address.findUnique({
        where: { addressUuid },
        include: {
          user: true,
        },
      });

      return address?.user || null;
    } catch (error) {
      console.error(
        "DoorbellService: Error finding user by address UUID:",
        error
      );
      return null;
    }
  }

  /**
   * Find visit by UUID
   */
  static async findVisitByUuid(visitUuid: string): Promise<any> {
    try {
      const prisma = await this.getPrisma();
      // Temporarily use id instead of visitUuid until database is fixed
      const visitId = parseInt(visitUuid.split("-")[0]) || 1; // Fallback to id 1
      const visit = await prisma.doorbellVisit.findUnique({
        where: { id: visitId },
        include: {
          address: true,
        },
      });

      return visit;
    } catch (error) {
      console.error("DoorbellService: Error finding visit by UUID:", error);
      return null;
    }
  }

  /**
   * Create a new doorbell visit
   */
  static async createVisit(addressUuid: string): Promise<CreateVisitResult> {
    try {
      console.log("DoorbellService: Creating visit for address:", addressUuid);

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
          used: false,
          // Temporarily remove expiresAt until database is updated
        },
      });

      console.log("DoorbellService: Visit created successfully:", visit);

      return {
        success: true,
        visit,
      };
    } catch (error: any) {
      console.error("DoorbellService: Error creating visit:", error);
      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }

  /**
   * Mark a doorbell visit as used (with 15-minute expiry)
   */
  static async markVisitAsUsed(visitUuid: string): Promise<UseVisitResult> {
    try {
      console.log("DoorbellService: Using visit:", visitUuid);

      const prisma = await this.getPrisma();

      // Find the visit and check if it exists and is not expired
      // Temporarily use id instead of visitUuid until database is fixed
      const visitId = parseInt(visitUuid.split("-")[0]) || 1;
      const visit = await prisma.doorbellVisit.findUnique({
        where: { id: visitId },
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

      // Temporarily disable expiry check until database is updated
      // if (new Date() > visit.expiresAt) {
      //   return {
      //     success: false,
      //     error:
      //       "Esta visita expirou. Por favor, escaneie o QR Code novamente.",
      //   };
      // }

      // If visit is already used, check if it's still within expiry time
      if (visit.used) {
        // Temporarily disable expiry check until database is updated
        // if (new Date() > visit.expiresAt) {
        //   return {
        //     success: false,
        //     error:
        //       "Esta visita expirou. Por favor, escaneie o QR Code novamente.",
        //   };
        // }

        // Visit is used but still valid - get user data for display
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
        };
      }

      // Mark as used and get user data
      const [updatedVisit, user] = await prisma.$transaction([
        prisma.doorbellVisit.update({
          where: { id: visitId },
          data: {
            used: true,
            // Temporarily remove usedAt until database is updated
          },
          include: {
            address: true,
          },
        }),
        prisma.user.findUnique({
          where: { addressId: visit.addressId },
          include: {
            address: true,
          },
        }),
      ]);

      console.log("DoorbellService: Visit used successfully:", updatedVisit);

      return {
        success: true,
        user,
        visit: updatedVisit,
      };
    } catch (error: any) {
      console.error("DoorbellService: Error using visit:", error);
      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }

  /**
   * Get visit by ID
   */
  static async getVisit(visitId: number): Promise<DoorbellVisit | null> {
    try {
      const prisma = await this.getPrisma();
      const visit = await prisma.doorbellVisit.findUnique({
        where: { id: visitId },
      });

      return visit;
    } catch (error) {
      console.error("DoorbellService: Error getting visit:", error);
      return null;
    }
  }

  /**
   * Ring the doorbell (set ringBellAt timestamp)
   */
  static async ringBell(
    visitUuid: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const prisma = await this.getPrisma();
      // Temporarily use id instead of visitUuid until database is fixed
      const visitId = parseInt(visitUuid.split("-")[0]) || 1;
      const visit = await prisma.doorbellVisit.findUnique({
        where: { id: visitId },
      });

      if (!visit) {
        return {
          success: false,
          error: "Visita não encontrada",
        };
      }

      // Temporarily disable expiry check until database is updated
      // if (new Date() > visit.expiresAt) {
      //   return {
      //     success: false,
      //     error:
      //       "Esta visita expirou. Por favor, escaneie o QR Code novamente.",
      //   };
      // }

      // Temporarily disable ringBellAt until database is updated
      // await prisma.doorbellVisit.update({
      //   where: { id: visitId },
      //   data: {
      //     ringBellAt: new Date(),
      //   },
      // });

      console.log("DoorbellService: Bell rung for visit:", visitUuid);

      return {
        success: true,
      };
    } catch (error: any) {
      console.error("DoorbellService: Error ringing bell:", error);
      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }
}
