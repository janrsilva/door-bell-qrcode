"use client";

import { withAuthUser, DefaultAuthLoading } from "@/components/hoc/withAuth";
import { CallPageContent } from "@/components/CallPageContent";

interface CallPageProps {
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

function CallPage({ user }: CallPageProps) {
  return <CallPageContent user={user} />;
}

// Exportar a página protegida com HOC
export default withAuthUser(CallPage, {
  redirectTo: "/auth/login",
  loadingComponent: DefaultAuthLoading,
});
