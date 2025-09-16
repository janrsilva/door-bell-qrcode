import { Metadata } from "next";
import RegistrationForm from "@/components/registration-form";

export const metadata: Metadata = {
  title: "Cadastro - Campainha Eletrônica",
  description: "Cadastre-se para receber notificações da campainha eletrônica.",
};

export default function CadastroPage() {
  return (
    <main className="min-h-dvh bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Cadastre-se</h1>
            <p className="text-muted-foreground">
              Preencha os dados abaixo para se cadastrar no sistema de campainha
              eletrônica.
            </p>
          </div>
          <RegistrationForm />
        </div>
      </div>
    </main>
  );
}
