"use client";

import { useEffect, useMemo, useState } from "react";
import { onValue, ref } from "firebase/database";
import { Card } from "@/components/ui/card";
import { getFirebaseRealtimeDatabase } from "@/lib/firebase-client";

interface AvailableCall {
  visitId: string;
  createdAt?: string;
  status?: string;
  source?: "active" | "history";
}

interface Props {
  addressUuid: string;
  onCallAccepted?: (visitId: string) => void;
}

export default function AvailableCalls({ addressUuid, onCallAccepted }: Props) {
  const [calls, setCalls] = useState<AvailableCall[]>([]);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);

  useEffect(() => {
    if (!addressUuid) return;

    const db = getFirebaseRealtimeDatabase();
    const addressRef = ref(db, `addresses/${addressUuid}`);

    const unsubscribe = onValue(addressRef, (snapshot) => {
      const data = snapshot.val() ?? {};
      const visits = data.visits ?? {};
      const onCallVisit = data.onCallVisit;

      const available: AvailableCall[] = Object.entries(visits)
        .filter(([, value]: any) => value?.status === "offer_created")
        .map(([visitId, value]: [string, any]) => ({
          visitId,
          createdAt: value?.webRtcOffer?.createdAt,
          status: value?.status,
          source: "history",
        }));

      if (
        onCallVisit?.uuid &&
        onCallVisit?.webRtcOffer?.sdp &&
        onCallVisit.status !== "ended" &&
        !available.some((call) => call.visitId === onCallVisit.uuid)
      ) {
        available.push({
          visitId: onCallVisit.uuid,
          createdAt: onCallVisit.webRtcOffer.createdAt,
          status: onCallVisit.status,
          source: "active",
        });
      }

      setCalls(available);
      setActiveVisitId(
        onCallVisit?.uuid && onCallVisit.status !== "ended"
          ? onCallVisit.uuid
          : null,
      );
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

      {sortedCalls.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhuma chamada aguardando atendimento.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCalls.map((call) => (
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
                <span className="text-xs text-muted-foreground">
                  {activeVisitId === call.visitId
                    ? "✅ Em atendimento"
                    : "⏳ Aguardando"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
}
