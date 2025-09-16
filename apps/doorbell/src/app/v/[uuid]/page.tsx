import { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RingButton from "@/components/ring-button";
import { SimpleDoorbellService } from "@/lib/services/simple-doorbell-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ uuid: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uuid } = await params;
  const title = "Campainha Eletrônica";
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

  // Redirect to the single-use page immediately
  return (
    <div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
                // Redirect to the single-use page immediately
                window.location.replace('/use/${visitResult.visit.uuid}');
              `,
        }}
      />
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-5 space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <h1 className="text-xl font-semibold">Redirecionando...</h1>
            <p className="text-sm text-muted-foreground text-center">
              Aguarde enquanto redirecionamos para a página da campainha.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
