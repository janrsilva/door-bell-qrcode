import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    cpf: string;
    phone: string;
    addressId: number;
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

  interface Session {
    user: {
      id: number;
      name: string;
      email: string;
      cpf: string;
      phone: string;
      addressId: number;
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
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: number;
    cpf: string;
    phone: string;
    addressId: number;
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
}

