import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { notifyResidentOfferAvailable } from "@/lib/services/push-notification";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  const { visitId } = await params;

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
      { status: 400 },
    );
  }

  try {
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
    const addressVisitRef = addressRef.child(`visits/${visitId}`);
    const onCallVisitRef = addressRef.child("onCallVisit");

    const visitPayload = {
      uuid: visitId,
      webRtcOffer: {
        sdp: body.sdp,
        createdAt: now,
      },
      webRtcAnswer: null,
      status: "offer_created",
      updatedAt: now,
      addressUuid: visit.address.addressUuid,
      createdAt: visit.createdAt.toISOString(),
    };

    const payloadWithReset = {
      ...visitPayload,
      iceCandidates: null,
    };

    await Promise.all([
      addressVisitRef.set(payloadWithReset),
      onCallVisitRef.set(payloadWithReset),
    ]);

    const { devicesNotified, reason } = await notifyResidentOfferAvailable(
      visitId,
      visit.addressId,
    );

    return NextResponse.json({
      success: true,
      visitId,
      storedAt: now,
      devicesNotified,
      reason,
    });
  } catch (error: any) {
    console.error("❌ Error saving offer to Firebase", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
