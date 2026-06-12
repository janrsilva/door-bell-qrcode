import webpush from "web-push";
import { getActiveSubscriptions } from "@/lib/services/subscription-service";
import { prisma } from "@/lib/db";

let vapidDetailsConfigured = false;

export function configureWebPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn(
      "VAPID keys are not configured. Web push notifications will fail.",
    );
    return false;
  }

  if (!vapidDetailsConfigured) {
    webpush.setVapidDetails(
      "mailto:your-email@domain.com",
      vapidPublicKey,
      vapidPrivateKey,
    );
    vapidDetailsConfigured = true;
  }

  return true;
}

export async function notifyResidentOfferAvailable(
  visitUuid: string,
  addressId?: number,
) {
  if (!configureWebPush()) {
    return { devicesNotified: 0, reason: "missing_vapid_keys" };
  }

  let resolvedAddressId = addressId;

  if (typeof resolvedAddressId !== "number") {
    const visit = await prisma.doorbellVisit.findUnique({
      where: { uuid: visitUuid },
      include: { address: true },
    });

    if (!visit || !visit.address) {
      return { devicesNotified: 0, reason: "visit_not_found" };
    }

    resolvedAddressId = visit.addressId;
  }

  const subscriptions = await getActiveSubscriptions(resolvedAddressId);

  if (subscriptions.length === 0) {
    return { devicesNotified: 0, reason: "no_active_subscriptions" };
  }

  const payload = JSON.stringify({
    title: "WebRTC Offer Ready",
    type: "webrtc_offer_ready",
    visitId: visitUuid,
    timestamp: Date.now(),
    silent: true,
  });

  const pushResults = await Promise.allSettled(
    subscriptions.map(async (subscription: any) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return true;
      } catch (error: any) {
        console.error("❌ Erro ao enviar push:", error);

        if (error.statusCode === 410) {
          try {
            await prisma.pushSubscription.updateMany({
              where: { endpoint: subscription.endpoint },
              data: { isActive: false },
            });
          } catch (dbError) {
            console.error(
              "❌ Erro ao desativar subscription expirada:",
              dbError,
            );
          }
        }

        return false;
      }
    }),
  );

  const devicesNotified = pushResults.filter(
    (result) => result.status === "fulfilled" && result.value,
  ).length;

  return { devicesNotified };
}
