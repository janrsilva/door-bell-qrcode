import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import { notifyResidentOfferAvailable } from "@/lib/services/push-notification";
import { prisma } from "@/lib/db";
import {
  validateVisitorLocation,
  Coordinates,
} from "@/lib/utils/location-validation";
import { isVisitExpired, VISIT_EXPIRY_TIME } from "@/lib/constants";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> },
) {
  const { visitId } = await params;

  if (!visitId) {
    return NextResponse.json({ error: "visitId is required" }, { status: 400 });
  }

  let body: {
    sdp?: any;
    coords?: Coordinates;
    visitorPreviewDataUrl?: string | null;
  };
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

  if (!body?.coords) {
    return NextResponse.json(
      { error: "Missing field 'coords' in request body" },
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

    // Validar se a visita não expirou (15 minutos)
    if (isVisitExpired(visit.createdAt)) {
      return NextResponse.json(
        {
          error: "Visita expirada",
          details: `O tempo limite de ${VISIT_EXPIRY_TIME} minutos para iniciar chamadas de voz foi excedido`,
        },
        { status: 400 },
      );
    }

    // Validar localização do visitante
    if (visit.address.latitude && visit.address.longitude) {
      const addressCoords: Coordinates = {
        lat: visit.address.latitude,
        lon: visit.address.longitude,
      };

      const locationValidation = validateVisitorLocation(
        body.coords,
        addressCoords,
      );

      if (!locationValidation.isValid) {
        return NextResponse.json(
          {
            error: "Localização inválida",
            details: locationValidation.error,
            distance: locationValidation.distance,
            maxDistance: locationValidation.maxDistance,
          },
          { status: 400 },
        );
      }
    }

    const now = new Date().toISOString();
    const app = getFirebaseAdminApp();
    const db = getDatabase(app);

    // Nova estrutura: addresses/{addressUuid}/visits/{visitUuid}
    const addressRef = db.ref(`addresses/${visit.address.addressUuid}`);
    const visitsSnapshot = await addressRef.child("visits").get();
    const visits = (visitsSnapshot.val() ?? {}) as Record<
      string,
      { status?: string }
    >;

    const visitPayload = {
      uuid: visitId,
      webRtcOffer: {
        sdp: body.sdp,
        createdAt: now,
      },
      webRtcAnswer: null,
      visitorPreview: getValidVisitorPreview(body.visitorPreviewDataUrl, now),
      status: "offer_created",
      updatedAt: now,
      addressUuid: visit.address.addressUuid,
      createdAt: visit.createdAt.toISOString(),
    };

    const payloadWithReset = {
      ...visitPayload,
      iceCandidates: null,
    };

    const updates: Record<string, unknown> = {
      [`visits/${visitId}`]: payloadWithReset,
      onCallVisit: payloadWithReset,
    };

    Object.entries(visits).forEach(([currentVisitId, currentVisit]) => {
      if (currentVisitId === visitId || currentVisit?.status === "ended") {
        return;
      }

      updates[`visits/${currentVisitId}/status`] = "ended";
      updates[`visits/${currentVisitId}/updatedAt`] = now;
      updates[`visits/${currentVisitId}/endedAt`] = now;
      updates[`visits/${currentVisitId}/iceCandidates`] = null;
    });

    await addressRef.update(updates);

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

function getValidVisitorPreview(dataUrl: string | null | undefined, now: string) {
  if (!dataUrl) return null;

  const isSupportedImage = /^data:image\/(jpeg|png|webp);base64,/.test(dataUrl);
  if (!isSupportedImage || dataUrl.length > 200_000) {
    return null;
  }

  return {
    dataUrl,
    createdAt: now,
  };
}
