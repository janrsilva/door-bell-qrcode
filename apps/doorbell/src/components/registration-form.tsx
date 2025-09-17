"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { Form } from "@/components/ui/form";
import { registrationSchema, type RegistrationFormData } from "@/lib/schemas";
import PersonalDataStep from "./steps/personal-data-step";
import AddressStep from "./steps/address-step";
import QRDownloadStep from "./steps/qr-download-step";

export default function RegistrationForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [userId, setUserId] = useState<number | undefined>();
  const [addressUuid, setAddressUuid] = useState<string | undefined>();

  const steps = ["Dados Pessoais", "Endereço", "QR Code"];

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  const nextStep = async () => {
    if (currentStep === 1) {
      // Validate personal data
      const personalDataValid = await form.trigger([
        "name",
        "email",
        "phone",
        "cpf",
      ]);
      if (personalDataValid) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      // Validate address and submit
      const addressValid = await form.trigger([
        "zipCode",
        "street",
        "number",
        "neighborhood",
        "city",
        "state",
      ]);
      if (addressValid) {
        await handleSubmit();
      }
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
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao cadastrar usuário");
      }

      setUserId(result.userId);
      setAddressUuid(result.addressUuid);
      setCurrentStep(3);
      setSubmitMessage({
        type: "success",
        text: "Usuário cadastrado com sucesso!",
      });
    } catch (error: any) {
      setSubmitMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!addressUuid) return;

    try {
      const params = new URLSearchParams({
        addressUuid: addressUuid,
      });

      const houseNumber = form.getValues("number");
      if (houseNumber) {
        params.append("houseNumber", houseNumber);
      }

      const userName = form.getValues("name");
      if (userName) {
        params.append("userName", userName);
      }

      const pdfUrl = `/api/pdf?${params.toString()}`;

      // Create a temporary link to download the PDF
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `campainha-${houseNumber || addressUuid}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      alert("Erro ao baixar PDF. Tente novamente.");
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <PersonalDataStep form={form} />;
      case 2:
        return <AddressStep form={form} />;
      case 3:
        return (
          <QRDownloadStep
            userId={userId}
            addressUuid={addressUuid}
            houseNumber={form.getValues("number")}
            onDownloadQR={handleDownloadQR}
          />
        );
      default:
        return <PersonalDataStep form={form} />;
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Stepper */}
        <Stepper
          currentStep={currentStep}
          totalSteps={steps.length}
          steps={steps}
          className="mb-8"
        />

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
        {currentStep < 3 && (
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              Voltar
            </Button>

            <Button type="button" onClick={nextStep} disabled={isLoading}>
              {isLoading
                ? "Processando..."
                : currentStep === 2
                  ? "Finalizar Cadastro"
                  : "Continuar"}
            </Button>
          </div>
        )}

        {/* Link para Login */}
        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          Já tem uma conta?{" "}
          <a
            href="/auth/login"
            className="text-blue-600 hover:text-blue-500 underline-offset-4 hover:underline font-medium transition-colors"
          >
            Faça login aqui
          </a>
        </div>
      </div>
    </Form>
  );
}
