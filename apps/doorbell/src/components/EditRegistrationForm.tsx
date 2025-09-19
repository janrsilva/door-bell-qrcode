"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ClickableStepper } from "@/components/ui/clickable-stepper";
import { Form } from "@/components/ui/form";
import { registrationSchema, type RegistrationFormData } from "@/lib/schemas";
import PersonalDataStep from "./steps/personal-data-step";
import AddressStep from "./steps/address-step";
import LocationStep from "./steps/location-step";

interface EditRegistrationFormProps {
  userData: {
    id: number;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: {
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

export default function EditRegistrationForm({
  userData,
}: EditRegistrationFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const router = useRouter();
  const steps = ["Dados Pessoais", "Endereço", "Localização"];

  // Criar schema sem password para edição
  const editRegistrationSchema = registrationSchema.omit({ password: true });

  const form = useForm<Omit<RegistrationFormData, "password">>({
    resolver: zodResolver(editRegistrationSchema),
    defaultValues: {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      cpf: userData.cpf,
      zipCode: userData.address.zipCode,
      street: userData.address.street,
      number: userData.address.number,
      complement: userData.address.complement || "",
      neighborhood: userData.address.neighborhood,
      city: userData.address.city,
      state: userData.address.state,
      latitude: userData.address.latitude || -19.9786533,
      longitude: userData.address.longitude || -44.0037764,
    },
  });

  const validateCurrentStep = async (step: number): Promise<boolean> => {
    if (step === 1) {
      return await form.trigger(["name", "email", "phone", "cpf"]);
    } else if (step === 2) {
      return await form.trigger([
        "zipCode",
        "street",
        "number",
        "neighborhood",
        "city",
        "state",
      ]);
    } else if (step === 3) {
      return await form.trigger(["latitude", "longitude"]);
    }
    return true;
  };

  const goToStep = async (targetStep: number) => {
    // Se está tentando ir para um step anterior, permite sem validação
    if (targetStep < currentStep) {
      setCurrentStep(targetStep);
      return;
    }

    // Se está tentando ir para um step posterior, valida o atual primeiro
    const isValid = await validateCurrentStep(currentStep);
    if (isValid) {
      setCurrentStep(targetStep);
    }
  };

  const nextStep = async () => {
    if (currentStep === 3) {
      // Último step - validar e submeter
      const locationValid = await validateCurrentStep(3);
      if (locationValid) {
        await handleSubmit();
      }
    } else {
      // Próximo step
      await goToStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setSubmitMessage(null);

    try {
      const data = form.getValues();
      const response = await fetch(`/api/user/${userData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar cadastro");
      }

      setSubmitMessage({
        type: "success",
        text: "Cadastro atualizado com sucesso!",
      });

      // Redirecionar após sucesso
      setTimeout(() => {
        router.push("/atendimento");
      }, 2000);
    } catch (error: any) {
      setSubmitMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <PersonalDataStep form={form as any} isEdit />;
      case 2:
        return <AddressStep form={form as any} />;
      case 3:
        return <LocationStep form={form as any} />;
      default:
        return <PersonalDataStep form={form as any} isEdit />;
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Stepper */}
        <div className="space-y-2">
          <ClickableStepper
            currentStep={currentStep}
            totalSteps={steps.length}
            steps={steps}
            onStepClick={goToStep}
            className="mb-4"
          />
          <div className="text-xs text-center text-gray-500">
            💡 Clique nos steps para navegar entre eles
          </div>
        </div>

        {/* Current Step Content */}
        <div className="min-h-[400px]">{renderCurrentStep()}</div>

        {/* Messages */}
        {submitMessage && (
          <div
            className={`p-4 rounded-md ${
              submitMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {submitMessage.text}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Voltar
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/atendimento")}
            >
              Cancelar
            </Button>

            <Button type="button" onClick={nextStep} disabled={isLoading}>
              {isLoading
                ? "Processando..."
                : currentStep === 3
                  ? "Salvar Alterações"
                  : "Continuar"}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
}
