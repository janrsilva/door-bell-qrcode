"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { type Coordinates } from "@/lib/utils/latlong";
import {
  LucideBell,
  LucideCamera,
  LucideChevronRight,
  LucideMapPin,
} from "lucide-react";

type LocationResult = {
  success: boolean;
  coords?: Coordinates;
  error?: string;
};

type VisitorGuidedFlowProps = {
  hasLocation: boolean;
  needsLocation: boolean;
  isLocationBlocked: boolean;
  onRequestLocation: () => Promise<LocationResult>;
  onShowLocationHelp: () => void;
};

type CallCameraIntroProps = {
  open: boolean;
  isStarting: boolean;
  onCancel: () => void;
  onContinue: () => void;
};

function GuidedScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-white md:flex md:items-center md:justify-center">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white px-6 py-8 text-zinc-950 md:aspect-[9/16] md:h-[100dvh] md:w-auto md:max-h-[900px] md:border-x md:border-zinc-200 md:shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function ProgressDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex justify-center gap-2">
      {[1, 2].map((currentStep) => (
        <div
          key={currentStep}
          className={`h-2.5 rounded-full transition-all ${
            currentStep === step ? "w-8 bg-zinc-950" : "w-2.5 bg-zinc-300"
          }`}
        />
      ))}
    </div>
  );
}

export function VisitorGuidedFlow({
  hasLocation,
  needsLocation,
  isLocationBlocked,
  onRequestLocation,
  onShowLocationHelp,
}: VisitorGuidedFlowProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (needsLocation && !hasLocation) {
      setIsOpen(true);
      return;
    }

    setIsOpen(false);
  }, [hasLocation, needsLocation]);

  if (!isOpen) return null;

  async function requestLocation() {
    if (isRequesting) return;

    setIsRequesting(true);
    setError(null);

    const result = await onRequestLocation();

    setIsRequesting(false);

    if (result.success) {
      setIsOpen(false);
      return;
    }

    if (result.error === "permission_denied") {
      setError("Localização bloqueada. Reative no navegador para continuar.");
      return;
    }

    setError(result.error || "Não foi possível ativar a localização.");
  }

  return (
    <GuidedScreen>
      <div
        className="flex flex-1 flex-col justify-between"
        onTouchStart={(event) => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (step !== 1 || touchStartXRef.current === null) return;

          const touchEndX = event.changedTouches[0]?.clientX ?? null;
          if (touchEndX === null) return;

          if (touchStartXRef.current - touchEndX > 48) {
            setStep(2);
          }
        }}
      >
        <div className="pt-2">
          <ProgressDots step={step} />
        </div>

        {step === 1 ? (
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center text-center">
            <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-zinc-950 text-white shadow-lg">
              <LucideBell className="h-14 w-14" />
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              Campainha eletrônica
            </h1>
            <p className="mt-5 text-xl leading-8 text-zinc-600">
              Você está no lugar certo para chamar o morador.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center text-center">
            <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg">
              <LucideMapPin className="h-14 w-14" />
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              Ative a localização
            </h1>
            <p className="mt-5 text-xl leading-8 text-zinc-600">
              Precisamos confirmar que você está perto do endereço.
            </p>
            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4 pb-2">
          {step === 1 ? (
            <Button
              type="button"
              size="lg"
              className="h-16 w-full text-xl font-bold"
              onClick={() => setStep(2)}
            >
              Próximo
              <LucideChevronRight className="ml-2 h-6 w-6" />
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="lg"
                className="h-16 w-full bg-emerald-600 text-xl font-bold hover:bg-emerald-700"
                onClick={requestLocation}
                disabled={isRequesting || isLocationBlocked}
              >
                {isRequesting ? "Ativando..." : "Ativar localização"}
              </Button>
              {isLocationBlocked && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-14 w-full text-base font-semibold"
                  onClick={onShowLocationHelp}
                >
                  Ver como reativar
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </GuidedScreen>
  );
}

export function CallCameraIntro({
  open,
  isStarting,
  onCancel,
  onContinue,
}: CallCameraIntroProps) {
  if (!open) return null;

  return (
    <GuidedScreen>
      <div className="flex flex-1 flex-col justify-between">
        <div />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center text-center">
          <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
            <LucideCamera className="h-14 w-14" />
          </div>
          <h1 className="text-4xl font-bold leading-tight">Ative a câmera</h1>
          <p className="mt-5 text-xl leading-8 text-zinc-600">
            Assim o morador consegue ver quem está chamando.
          </p>
        </div>

        <div className="space-y-3 pb-2">
          <Button
            type="button"
            size="lg"
            className="h-16 w-full bg-blue-600 text-xl font-bold hover:bg-blue-700"
            onClick={onContinue}
            disabled={isStarting}
          >
            {isStarting ? "Abrindo chamada..." : "Ativar câmera e chamar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-14 w-full text-base font-semibold"
            onClick={onCancel}
            disabled={isStarting}
          >
            Voltar
          </Button>
        </div>
      </div>
    </GuidedScreen>
  );
}
