import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  try {
    const { visitId } = await params;
    let body: {
      candidate?: string;
      sdpMLineIndex?: number | null;
      sdpMid?: string | null;
      from?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "JSON body inválido" },
        { status: 400 },
      );
    }

    if (!body.candidate) {
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

    const payload = {
      candidate: body.candidate,
      sdpMLineIndex: body.sdpMLineIndex ?? null,
      sdpMid: body.sdpMid ?? null,
      from: body.from ?? "unknown",
      createdAt: now,
    };

    const [visitSnapshot, onCallVisitSnapshot] = await Promise.all([
      addressVisitRef.get(),
      onCallVisitRef.get(),
    ]);
    const visitData = visitSnapshot.val();
    const onCallVisit = onCallVisitSnapshot.val();

    if (visitData?.status === "ended" || onCallVisit?.status === "ended") {
      return NextResponse.json({ success: true, ignored: true });
    }

    const writes = [addressVisitCandidatesRef.push(payload)];

    if (onCallVisit?.uuid === visitId) {
      writes.push(onCallVisitRef.child("iceCandidates").push(payload));
    }

    await Promise.all(writes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [ICE_API] Erro ao salvar ICE candidate:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
