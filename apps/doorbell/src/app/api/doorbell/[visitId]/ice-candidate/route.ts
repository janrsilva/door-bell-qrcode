import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { prisma } from "@/lib/db";

type IceCandidatePayload = {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  from?: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    let body: IceCandidatePayload & {
      candidates?: IceCandidatePayload[];
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "JSON body inválido" },
        { status: 400 },
      );
    }

    const candidates = Array.isArray(body.candidates)
      ? body.candidates
      : [body];

    const validCandidates = candidates.filter((candidate) =>
      Boolean(candidate.candidate),
    );

    if (validCandidates.length === 0) {
      return NextResponse.json(
        { error: "Candidate é obrigatório" },
        { status: 400 },
      );
    }

    // Buscar a visit para obter o addressUuid
    const visit = await prisma.doorbellVisit.findUnique({
      where: { uuid: visitId },
      include: { address: true },
    });

    if (!visit || !visit.address) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const app = getFirebaseAdminApp();
    const db = getDatabase(app);

    // Nova estrutura: addresses/{addressUuid}/visits/{visitUuid}
    const addressRef = db.ref(`addresses/${visit.address.addressUuid}`);
    const onCallVisitRef = db.ref(
      `addresses/${visit.address.addressUuid}/onCallVisit`,
    );
    const addressVisitRef = addressRef.child(`visits/${visitId}`);
    const addressVisitCandidatesRef = addressVisitRef.child("iceCandidates");

    const payloads = validCandidates.map((candidate) => ({
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex ?? null,
      sdpMid: candidate.sdpMid ?? null,
      from: candidate.from ?? body.from ?? "unknown",
      createdAt: now,
    }));

    const [visitSnapshot, onCallVisitSnapshot] = await Promise.all([
      addressVisitRef.get(),
      onCallVisitRef.get(),
    ]);
    const visitData = visitSnapshot.val();
    const onCallVisit = onCallVisitSnapshot.val();

    if (visitData?.status === "ended" || onCallVisit?.status === "ended") {
      return NextResponse.json({ success: true, ignored: true });
    }

    const writes = payloads.map((payload) =>
      addressVisitCandidatesRef.push(payload),
    );

    if (onCallVisit?.uuid === visitId) {
      writes.push(
        ...payloads.map((payload) =>
          onCallVisitRef.child("iceCandidates").push(payload),
        ),
      );
    }

    await Promise.all(writes);

    return NextResponse.json({ success: true, count: payloads.length });
  } catch (error) {
    console.error("❌ [ICE_API] Erro ao salvar ICE candidate:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
