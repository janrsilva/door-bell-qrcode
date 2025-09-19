"use client";

import { withAuthUser, DefaultAuthLoading } from "@/components/hoc/withAuth";
import EditRegistrationForm from "@/components/EditRegistrationForm";

interface EditPageProps {
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
      complement: string | null;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
      latitude: number | null;
      longitude: number | null;
    };
  };
}

function EditPage({ user }: EditPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          ✏️ Editar Cadastro
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Atualize suas informações pessoais e de endereço
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <EditRegistrationForm userData={user} />
        </div>
      </div>
    </div>
  );
}

export default withAuthUser(EditPage, {
  loadingComponent: DefaultAuthLoading,
});
