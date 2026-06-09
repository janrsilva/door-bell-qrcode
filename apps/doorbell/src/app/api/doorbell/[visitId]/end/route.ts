import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  const { visitId } = await params;

  if (!visitId) {
    return NextResponse.json({ error: "visitId is required" }, { status: 400 });
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

    const addressRef = db.ref(`addresses/${visit.address.addressUuid}`);

    await addressRef.update({
      [`visits/${visitId}/status`]: "ended",
      [`visits/${visitId}/updatedAt`]: now,
      [`visits/${visitId}/endedAt`]: now,
      [`visits/${visitId}/iceCandidates`]: null,
      onCallVisit: null,
    });

    return NextResponse.json({
      success: true,
      visitId,
      endedAt: now,
    });
  } catch (error: any) {
    console.error("❌ Error ending call in Firebase", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
