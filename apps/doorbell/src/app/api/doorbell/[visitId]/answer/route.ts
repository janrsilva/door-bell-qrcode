import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";

export async function POST(
  req: NextRequest,
  { params }: { params: { visitId: string } }
) {
  const { visitId } = params;

  if (!visitId) {
    return NextResponse.json({ error: "visitId is required" }, { status: 400 });
  }

  let body: { sdp?: any };
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.sdp) {
    return NextResponse.json(
      { error: "Missing field 'sdp' in request body" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  try {
    const app = getFirebaseAdminApp();
    const db = getDatabase(app);

    // Buscar a visita para obter o addressUuid
    const { prisma } = await import("@/lib/db");
    const visit = await prisma.doorbellVisit.findUnique({
      where: { uuid: visitId },
      include: { address: true },
    });

    if (!visit || !visit.address) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    console.log("🔍 [ANSWER_API] Visit encontrada:", {
      visitId,
      addressUuid: visit.address.addressUuid,
      address: visit.address,
    });

    const onCallVisitRef = db.ref(
      `addresses/${visit.address.addressUuid}/onCallVisit`
    );
    const addressVisitRef = db
      .ref(`addresses/${visit.address.addressUuid}`)
      .child(`visits/${visitId}`);

    const answerPayload = {
      webRtcAnswer: {
        sdp: body.sdp,
        createdAt: now,
      },
      status: "answered",
      updatedAt: now,
    };

    await addressVisitRef.update(answerPayload);
    await onCallVisitRef.update({
      ...answerPayload,
      uuid: visitId,
    });

    return NextResponse.json({
      success: true,
      visitId,
      storedAt: now,
    });
  } catch (error: any) {
    console.error("❌ Error saving answer to Firebase", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
