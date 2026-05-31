"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="px-4 pt-8 pb-12">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-6">🔔</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Torne seu celular uma campainha inteligente
          </h1>
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Atenda visitantes de qualquer lugar do mundo, sem custos adicionais.
            Seu celular com internet vira uma campainha que funciona 24/7.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 mb-12">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Como funciona?
            </h2>
          </div>

          <div className="space-y-4">
            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">📱</div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Instale no seu celular
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Baixe o app e configure as notificações. Funciona como um
                    app nativo.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">🌍</div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Atenda de qualquer lugar
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Receba chamadas mesmo estando longe de casa. Só precisa de
                    internet.
                  </p>
                  <div className="text-xs text-gray-500">
                    <ul className="mt-1 ml-2 list-disc space-y-1">
                      <li>Chamadas de voz em tempo real</li>
                      <li>Videochamadas com visitantes</li>
                      <li>Notificações instantâneas</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">💰</div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Sem custos mensais
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Use sua internet existente. Não cobramos taxas de uso ou
                    mensalidades.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">🔒</div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    Totalmente seguro
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Apenas pessoas com o QR code correto conseguem tocar sua
                    campainha.
                  </p>
                  <div className="text-xs text-gray-500">
                    <strong>Regras de segurança:</strong>
                    <ul className="mt-1 ml-2 list-disc space-y-1">
                      <li>QR code único por endereço</li>
                      <li>Verificação de proximidade por GPS</li>
                      <li>Bloqueio automático após tentativas</li>
                      <li>Logs de todas as tentativas de acesso</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Waitlist Form */}
      <div className="px-4 pb-12">
        <div className="max-w-md mx-auto">
          <Card className="p-6 bg-white/90 backdrop-blur-sm">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Seja o primeiro a saber!
              </h2>
              <p className="text-gray-600">
                Cadastre-se na lista de espera e receba acesso antecipado
              </p>
            </div>

            {submitStatus === "success" && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-center font-medium">
                  ✅ Cadastro realizado com sucesso! Em breve entraremos em
                  contato.
                </p>
              </div>
            )}

            {submitStatus === "error" && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-center font-medium">
                  ❌ {errorMessage}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  name="name"
                  placeholder="Seu nome completo"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Input
                  type="tel"
                  name="phone"
                  placeholder="Seu telefone (WhatsApp)"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div>
                <Input
                  type="email"
                  name="email"
                  placeholder="Seu melhor email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-12 text-base"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-semibold"
              >
                {isSubmitting ? "Cadastrando..." : "Entrar na lista de espera"}
              </Button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4">
              Seus dados estão seguros conosco. Não compartilhamos informações
              pessoais.
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-4 pb-8">
        <div className="max-w-md mx-auto text-center">
          <p className="text-gray-600 mb-6">
            Já tem uma conta? Acesse o sistema
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/auth/login")}
              className="flex-1 h-12"
            >
              Login
            </Button>
            <Button
              onClick={() => (window.location.href = "/cadastro")}
              className="flex-1 h-12"
            >
              Cadastrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
