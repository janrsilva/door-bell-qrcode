import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RingButton from "@/components/ring-button";
import CountdownTimer from "@/components/countdown-timer";

type Props = {
  visit: {
    uuid: string;
    createdAt: Date;
    expiredAt?: Date;
    isExpired?: boolean;
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
};

export default function DoorbellPageClient({ visit }: Props) {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-5 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Campainha eletrônica</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Você está no portão do endereço deste QR. Toque a campainha para
            alertar o morador agora.
          </p>
        </div>

        <Separator />

        {/* Address Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            📍 Endereço do QR Code:
          </h3>
          <div className="text-blue-800">
            <p className="font-medium">
              {visit.address.street}, {visit.address.number}
              {visit.address.complement && `, ${visit.address.complement}`}
            </p>
            <p className="text-sm">
              {visit.address.neighborhood} - {visit.address.city}/
              {visit.address.state}
            </p>
            <p className="text-xs mt-1">CEP: {visit.address.zipCode}</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-600 mt-0.5">⚠️</div>
            <div>
              <p className="text-yellow-800 font-medium text-sm">
                Confirme o endereço
              </p>
              <p className="text-yellow-700 text-xs mt-1">
                Só toque a campainha se você estiver no endereço correto acima.
                Se estiver em outro local, não interaja com este QR Code.
              </p>
            </div>
          </div>
        </div>

        <Separator />
        <RingButton visit={visit} />
        <Separator />
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            Ao tocar, o morador recebe uma notificação imediata. Se necessário,
            ele pode iniciar uma conversa.
          </p>
          <p>
            Por segurança, podemos registrar horário e localização aproximada da
            tentativa de contato.
          </p>
          <CountdownTimer createdAt={visit.createdAt.toISOString()} />
        </div>
      </Card>
    </main>
  );
}
