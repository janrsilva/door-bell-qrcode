import { Card } from "@/components/ui/card";
import { SimpleDoorbellService } from "@/lib/services/simple-doorbell-service";
import DoorbellPageClient from "@/components/doorbell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ visitId: string }> };

export default async function UseVisitPage({ params }: Props) {
  const { visitId } = await params;

  try {
    // Get visit data with expiry information
    const getResult = await SimpleDoorbellService.getVisit(visitId);

    if (!getResult.success) {
      return (
        <main className="min-h-dvh flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-5 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-red-600">Erro</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {getResult.error || "Erro ao processar a visita"}
              </p>
            </div>
          </Card>
        </main>
      );
    }

    const visit = getResult.visit!;
    const expiredAt = getResult.expiredAt!;
    const isExpired = getResult.isExpired!;

    // Display the doorbell page using client component
    return <DoorbellPageClient visit={{ ...visit, expiredAt, isExpired }} />;
  } catch (error: any) {
    console.error("UseVisitPage: Error:", error);
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-5 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-red-600">Erro</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Erro interno do servidor. Tente novamente.
            </p>
          </div>
        </Card>
      </main>
    );
  }
}
