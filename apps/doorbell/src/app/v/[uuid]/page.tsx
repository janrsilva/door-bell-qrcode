import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SimpleDoorbellService } from "@/lib/services/simple-doorbell-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ uuid: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uuid } = await params;
  const title = "CAMPAINHA ELETRÔNICA";
  const description =
    "Toque a campainha. O morador receberá um alerta imediato no celular.";
  return { title, description };
}

export default async function CampainhaPage({ params }: Props) {
  const { uuid } = await params;

  // Create a new visit and redirect immediately
  const visitResult = await SimpleDoorbellService.createVisit(uuid);

  if (!visitResult.success || !visitResult.visit) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-5 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-red-600">Erro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Não foi possível criar a visita. Tente novamente.
            </p>
          </div>
        </Card>
      </main>
    );
  }

  redirect(`/visitor/${visitResult.visit.uuid}`);
}
