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
    const body = await request.json();

    if (!body.candidate) {
      return NextResponse.json(
        { error: "Candidate é obrigatório" },
        { status: 400 },
      );
    }

    console.log("🔍 [ICE_API] Recebendo ICE candidate para visit:", visitId);

    // Buscar a visit para obter o addressUuid
    const visit = await prisma.doorbellVisit.findUnique({
      where: { uuid: visitId },
      include: { address: true },
    });

    if (!visit || !visit.address) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    console.log("🔍 [ICE_API] Visit encontrada:", {
      visitId,
      addressUuid: visit.address.addressUuid,
    });

    const now = new Date().toISOString();
    const app = getFirebaseAdminApp();
    const db = getDatabase(app);

    // Nova estrutura: addresses/{addressUuid}/visits/{visitUuid}
    const addressRef = db.ref(`addresses/${visit.address.addressUuid}`);
    const onCallVisitRef = db.ref(
      `addresses/${visit.address.addressUuid}/onCallVisit`,
    );
    const addressVisitCandidatesRef = addressRef
      .child(`visits/${visitId}`)
      .child("iceCandidates");
    const onCallVisitCandidatesRef = onCallVisitRef.child("iceCandidates");

    const payload = {
      candidate: body.candidate,
      sdpMLineIndex: body.sdpMLineIndex ?? null,
      sdpMid: body.sdpMid ?? null,
      from: body.from ?? "unknown",
      createdAt: now,
    };

    await addressVisitCandidatesRef.push(payload);
    await onCallVisitCandidatesRef.push(payload);

    console.log("✅ [ICE_API] ICE candidate salvo no Firebase");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ [ICE_API] Erro ao salvar ICE candidate:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
