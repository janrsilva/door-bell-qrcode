import { RegistrationFormData } from "@/lib/schemas";

export interface CreateUserData extends RegistrationFormData {}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  addressId: number;
  createdAt: Date;
  updatedAt: Date;
  address: {
    id: number;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    houseNumber: string | null;
    addressUuid: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export interface CreateUserResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class UserService {
  /**
   * Get Prisma client instance
   */
  private static async getPrisma() {
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient();
  }

  /**
   * Create a new user in the database
   */
  static async createUser(userData: CreateUserData): Promise<CreateUserResult> {
    try {
      console.log("UserService: Creating user with data:", userData);

      const prisma = await this.getPrisma();

      // First, try to find or create the address
      let address = await prisma.address.findFirst({
        where: {
          street: userData.street,
          number: userData.number,
          complement: userData.complement || null,
          city: userData.city,
          state: userData.state,
        },
      });

      if (!address) {
        // Create new address
        address = await prisma.address.create({
          data: {
            street: userData.street,
            number: userData.number,
            complement: userData.complement || null,
            neighborhood: userData.neighborhood,
            city: userData.city,
            state: userData.state,
            zipCode: userData.zipCode,
            houseNumber: userData.number,
          },
        });
        console.log("UserService: New address created:", address);
      } else {
        console.log("UserService: Existing address found:", address);
      }

      // Create user with the address
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          cpf: userData.cpf,
          addressId: address.id,
        },
        include: {
          address: true,
        },
      });

      console.log("UserService: User created successfully:", user);

      return {
        success: true,
        user,
      };
    } catch (error: any) {
      console.error("UserService: Error creating user:", error);

      // Handle Prisma unique constraint errors
      if (error.code === "P2002") {
        const field = error.meta?.target?.[0];
        const fieldNames: Record<string, string> = {
          email: "email",
          cpf: "CPF",
          address_id: "endereço",
        };

        return {
          success: false,
          error: `${fieldNames[field] || field} já está em uso`,
        };
      }

      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }

  /**
   * Find a user by ID
   */
  static async findUserById(id: number): Promise<User | null> {
    try {
      const prisma = await this.getPrisma();
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          address: true,
        },
      });

      return user;
    } catch (error) {
      console.error("UserService: Error finding user by ID:", error);
      return null;
    }
  }

  /**
   * Find a user by email
   */
  static async findUserByEmail(email: string): Promise<User | null> {
    try {
      const prisma = await this.getPrisma();
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          address: true,
        },
      });

      return user;
    } catch (error) {
      console.error("UserService: Error finding user by email:", error);
      return null;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const prisma = await this.getPrisma();
      const users = await prisma.user.findMany({
        include: {
          address: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return users;
    } catch (error) {
      console.error("UserService: Error getting all users:", error);
      return [];
    }
  }

  /**
   * Update a user
   */
  static async updateUser(
    id: number,
    userData: Partial<CreateUserData>
  ): Promise<CreateUserResult> {
    try {
      const prisma = await this.getPrisma();
      const user = await prisma.user.update({
        where: { id },
        data: userData,
        include: {
          address: true,
        },
      });

      return {
        success: true,
        user,
      };
    } catch (error: any) {
      console.error("UserService: Error updating user:", error);

      if (error.code === "P2002") {
        const field = error.meta?.target?.[0];
        const fieldNames: Record<string, string> = {
          email: "email",
          cpf: "CPF",
        };

        return {
          success: false,
          error: `${fieldNames[field] || field} já está em uso`,
        };
      }

      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(
    id: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const prisma = await this.getPrisma();
      await prisma.user.delete({
        where: { id },
      });

      return { success: true };
    } catch (error: any) {
      console.error("UserService: Error deleting user:", error);
      return {
        success: false,
        error: error.message || "Erro interno do servidor",
      };
    }
  }
}
