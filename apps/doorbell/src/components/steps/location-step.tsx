import { UseFormReturn } from "react-hook-form";
import { useState, useEffect } from "react";
import { type RegistrationFormData } from "@/lib/schemas";
import LocationPicker, { type LocationData } from "@/components/LocationPicker";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface LocationStepProps {
  form: UseFormReturn<RegistrationFormData>;
}

export default function LocationStep({ form }: LocationStepProps) {
  const [componentKey, setComponentKey] = useState(() => Date.now());

  // Force recreation of LocationPicker when step is mounted
  useEffect(() => {
    setComponentKey(Date.now());
  }, []);

  const handleLocationChange = (location: LocationData) => {
    form.setValue("latitude", location.latitude);
    form.setValue("longitude", location.longitude);

    // Clear any previous errors
    form.clearErrors("latitude");
    form.clearErrors("longitude");
  };

  const currentLocation: LocationData | undefined = (() => {
    const lat = form.watch("latitude");
    const lon = form.watch("longitude");

    if (typeof lat === "number" && typeof lon === "number") {
      return {
        latitude: lat,
        longitude: lon,
      };
    }

    return undefined;
  })();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">📍 Localização</h2>
        <p className="text-muted-foreground text-sm">
          Selecione a localização exata do seu endereço para que a campainha
          funcione corretamente
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="latitude"
          render={() => (
            <FormItem>
              <FormLabel>Localização no Mapa</FormLabel>
              <FormControl>
                <LocationPicker
                  key={componentKey}
                  value={currentLocation}
                  onChange={handleLocationChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo oculto para longitude */}
        <FormField
          control={form.control}
          name="longitude"
          render={() => (
            <FormItem className="hidden">
              <FormControl>
                <input type="hidden" {...form.register("longitude")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="text-xl">⚠️</div>
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-2">
              Por que precisamos da localização?
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Para verificar se o visitante está próximo (máximo 50m)</li>
              <li>Para prevenir uso indevido da campainha</li>
              <li>Para garantir que apenas pessoas no local possam tocar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
