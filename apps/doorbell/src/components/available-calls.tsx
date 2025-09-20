"use client";

import { useEffect, useMemo, useState } from "react";
import { onValue, ref, update } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFirebaseRealtimeDatabase } from "@/lib/firebase-client";

interface AvailableCall {
  visitId: string;
  createdAt?: string;
  status?: string;
}

interface Props {
  addressUuid: string;
  onCallAccepted?: (visitId: string) => void;
}

export default function AvailableCalls({ addressUuid, onCallAccepted }: Props) {
  const [calls, setCalls] = useState<AvailableCall[]>([]);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!addressUuid) return;

    const db = getFirebaseRealtimeDatabase();
    const addressRef = ref(db, `addresses/${addressUuid}`);

    const unsubscribe = onValue(addressRef, (snapshot) => {
      const data = snapshot.val() ?? {};
      const visits = data.visits ?? {};

      const available: AvailableCall[] = Object.entries(visits)
        .filter(([, value]: any) => value?.status === "offer_created")
        .map(([visitId, value]: [string, any]) => ({
          visitId,
          createdAt: value?.webRtcOffer?.createdAt,
          status: value?.status,
        }));

      setCalls(available);
      setActiveVisitId(data.onCallVisit ?? null);
    });

    return () => unsubscribe();
  }, [addressUuid]);

  const sortedCalls = useMemo(() => {
    return [...calls].sort((a, b) => {
      const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
      return timeB - timeA;
    });
  }, [calls]);

  const handleSelectCall = async (visitId: string) => {
    try {
      const db = getFirebaseRealtimeDatabase();
      const addressRef = ref(db, `addresses/${addressUuid}`);
      await update(addressRef, { onCallVisit: visitId });
      setStatusMessage(`Chamada ${visitId} selecionada`);
      onCallAccepted?.(visitId);
    } catch (error) {
      console.error("❌ Falha ao selecionar chamada:", error);
      setStatusMessage("Não foi possível selecionar a chamada");
    }
  };

  return (
    <Card className="mb-6 space-y-4 p-6">
      <div className="flex items-center gap-3">
        <div className="text-2xl">📋</div>
        <div>
          <h2 className="text-xl font-semibold">Chamadas Disponíveis</h2>
          <p className="text-sm text-muted-foreground">
            Visitantes próximos que tocaram a campainha recentemente
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          {statusMessage}
        </div>
      )}

      {sortedCalls.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhuma chamada aguardando atendimento.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCalls.map((call) => {
            const isActive = activeVisitId === call.visitId;
            return (
              <Card key={call.visitId} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Visita {call.visitId}</p>
                    <p className="text-xs text-muted-foreground">
                      {call.createdAt
                        ? new Date(call.createdAt).toLocaleString()
                        : "Horário não informado"}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleSelectCall(call.visitId)}
                    variant={isActive ? "secondary" : "default"}
                    size="sm"
                  >
                    {isActive ? "✅ Selecionada" : "Atender"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
