"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LucideBellRing,
  LucideCamera,
  LucideCheckCircle2,
  LucideMapPin,
  LucideQrCode,
  LucideShieldCheck,
  LucideSmartphone,
} from "lucide-react";

const steps = [
  {
    icon: LucideQrCode,
    title: "Coloque uma placa no portão",
    text: "A placa tem um QR Code, parecido com os que aparecem em restaurantes e bancos.",
  },
  {
    icon: LucideCamera,
    title: "A pessoa aponta o celular",
    text: "O entregador ou visitante abre a câmera do celular e toca no aviso que aparece.",
  },
  {
    icon: LucideBellRing,
    title: "Seu celular toca",
    text: "Você recebe o aviso no telefone e pode atender, falar, ver a pessoa ou recusar.",
  },
];

const benefits = [
  "Não precisa instalar aparelho no portão.",
  "Funciona para entregas, visitas e prestadores de serviço.",
  "Ajuda a confirmar se a pessoa está no endereço certo.",
];

export default function HomePage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus("success");
        setFormData({ name: "", phone: "", email: "" });
      } else {
        setSubmitStatus("error");
        setErrorMessage(
          result.message || "Erro ao adicionar à lista de espera",
        );
      }
    } catch {
      setSubmitStatus("error");
      setErrorMessage("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <section className="mx-auto flex min-h-[92vh] w-full max-w-5xl flex-col px-5 py-6 md:px-8">
        <nav className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <LucideBellRing className="h-5 w-5" />
            </span>
            Campainha QR Code
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = "/auth/login";
            }}
          >
            Entrar
          </Button>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[1fr_360px]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
              <LucideCheckCircle2 className="h-4 w-4" />
              Para casas, condomínios pequenos e entregas
            </div>

            <h1 className="text-4xl font-bold leading-tight text-zinc-950 md:text-6xl">
              Uma campainha no seu celular, sem instalar aparelho no portão.
            </h1>

            <p className="mt-6 max-w-xl text-xl leading-8 text-zinc-700">
              Você imprime uma placa com QR Code e coloca no portão. Quando
              alguém chega, essa pessoa aponta a câmera do celular e o seu
              telefone toca.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-14 text-base font-semibold"
                onClick={() => {
                  document
                    .getElementById("lista-de-espera")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Quero testar
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-base font-semibold"
                onClick={() => {
                  window.location.href = "/cadastro";
                }}
              >
                Criar cadastro
              </Button>
            </div>

            <p className="mt-3 text-xs leading-5 text-zinc-500">
              No momento o uso é grátis por tempo limitado. A assinatura paga
              poderá ser oferecida futuramente.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-500">
                    Exemplo no portão
                  </p>
                  <p className="text-lg font-bold">Toque a campainha</p>
                </div>
                <LucideQrCode className="h-10 w-10 text-zinc-900" />
              </div>

              <div className="grid aspect-square place-items-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-100">
                <LucideQrCode className="h-28 w-28 text-zinc-800" />
              </div>

              <div className="mt-5 rounded-lg bg-yellow-50 p-3 text-sm font-semibold leading-5 text-yellow-900">
                ENTREGADOR, sempre confirme o endereço e os dados do
                destinatário.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50 px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-zinc-950">
            Como funciona, bem simples
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <Card key={step.title} className="p-5">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-950 text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-500">
                    Passo {index + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-zinc-600">{step.text}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-12">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_380px]">
          <div>
            <h2 className="text-3xl font-bold">
              Feito para quem quer atender com calma e segurança
            </h2>
            <div className="mt-6 space-y-4">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <LucideCheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-lg leading-7 text-zinc-700">{benefit}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 p-4">
                <LucideSmartphone className="h-7 w-7 text-zinc-900" />
                <h3 className="mt-3 font-bold">Para o morador</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Recebe notificação, atende a chamada e decide se quer ligar a
                  câmera.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4">
                <LucideShieldCheck className="h-7 w-7 text-zinc-900" />
                <h3 className="mt-3 font-bold">Para segurança</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  O sistema pode pedir localização para evitar chamadas longe do
                  endereço.
                </p>
              </div>
            </div>
          </div>

          <Card id="lista-de-espera" className="p-5">
            <div className="mb-5">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <LucideMapPin className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">Quero testar no meu portão</h2>
              <p className="mt-2 leading-6 text-zinc-600">
                Deixe seus dados para receber acesso e orientação de
                configuração.
              </p>
            </div>

            {submitStatus === "success" && (
              <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="text-center font-medium text-green-800">
                  Cadastro realizado. Entraremos em contato em breve.
                </p>
              </div>
            )}

            {submitStatus === "error" && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-center font-medium text-red-800">
                  {errorMessage}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                name="name"
                placeholder="Seu nome"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="h-12 text-base"
              />

              <Input
                type="tel"
                name="phone"
                placeholder="Telefone com WhatsApp"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="h-12 text-base"
              />

              <Input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="h-12 text-base"
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full text-base font-semibold"
              >
                {isSubmitting ? "Enviando..." : "Entrar na lista"}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
              Seus dados serão usados apenas para contato sobre a campainha.
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
}
