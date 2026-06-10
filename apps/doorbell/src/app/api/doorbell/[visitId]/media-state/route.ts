import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  const { visitId } = await params;

  if (!visitId) {
    return NextResponse.json({ error: "visitId is required" }, { status: 400 });
  }

  let body: { residentVideoEnabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.residentVideoEnabled !== "boolean") {
    return NextResponse.json(
      { error: "Missing boolean field 'residentVideoEnabled'" },
      { status: 400 },
    );
  }

  try {
    const visit = await prisma.doorbellVisit.findUnique({
      where: { uuid: visitId },
      include: { address: true },
    });

    if (!visit?.address) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const app = getFirebaseAdminApp();
    const db = getDatabase(app);
    const addressRef = db.ref(`addresses/${visit.address.addressUuid}`);
    const onCallVisitSnapshot = await addressRef.child("onCallVisit/uuid").get();
    const isCurrentCall = onCallVisitSnapshot.val() === visitId;

    const updates: Record<string, unknown> = {
      [`visits/${visitId}/residentMedia`]: {
        videoEnabled: body.residentVideoEnabled,
        updatedAt: now,
      },
      [`visits/${visitId}/webRtcAnswer/residentVideoEnabled`]:
        body.residentVideoEnabled,
      [`visits/${visitId}/updatedAt`]: now,
    };

    if (isCurrentCall) {
      updates["onCallVisit/residentMedia"] = {
        videoEnabled: body.residentVideoEnabled,
        updatedAt: now,
      };
      updates["onCallVisit/webRtcAnswer/residentVideoEnabled"] =
        body.residentVideoEnabled;
      updates["onCallVisit/updatedAt"] = now;
    }

    await addressRef.update(updates);

    return NextResponse.json({
      success: true,
      visitId,
      residentVideoEnabled: body.residentVideoEnabled,
      updatedAt: now,
    });
  } catch (error: any) {
    console.error("Error updating media state in Firebase", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
