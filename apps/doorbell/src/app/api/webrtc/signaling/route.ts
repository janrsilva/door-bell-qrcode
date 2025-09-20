import { NextRequest } from "next/server";

interface SignalingMessage {
  type:
    | "offer"
    | "answer"
    | "ice-candidate"
    | "call-end"
    | "call-accept"
    | "call-reject";
  data?: any;
  visitId: string;
  from: "visitor" | "resident";
}

// Simple in-memory storage for signaling messages
// In production, you might want to use Redis or another persistent store
const signalingMessages = new Map<string, SignalingMessage[]>();

// Store for pending messages by visit and connection type
const pendingMessages = new Map<
  string,
  { visitor: SignalingMessage[]; resident: SignalingMessage[] }
>();

// Initialize pending messages for a visit
function initializePendingMessages(visitId: string) {
  if (!pendingMessages.has(visitId)) {
    pendingMessages.set(visitId, { visitor: [], resident: [] });
  }
}

// Clean up old messages (older than 5 minutes)
function cleanupOldMessages() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  for (const [visitId, messages] of signalingMessages.entries()) {
    const recentMessages = messages.filter(
      (msg) => (msg as any).timestamp && (msg as any).timestamp > fiveMinutesAgo
    );

    if (recentMessages.length === 0) {
      signalingMessages.delete(visitId);
      pendingMessages.delete(visitId);
    } else {
      signalingMessages.set(visitId, recentMessages);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupOldMessages, 60000);

// POST endpoint for sending signaling messages
export async function POST(request: NextRequest) {
  try {
    const message: SignalingMessage & { timestamp?: number } =
      await request.json();
    const { visitId, from } = message;

    if (!visitId) {
      return Response.json({ error: "Missing visitId" }, { status: 400 });
    }

    // Add timestamp to message
    message.timestamp = Date.now();

    console.log(`Received signaling message via POST:`, message);

    // Initialize storage for this visit
    initializePendingMessages(visitId);

    // Store message for the target recipient
    const targetType = from === "visitor" ? "resident" : "visitor";
    const pending = pendingMessages.get(visitId)!;
    pending[targetType].push(message);

    // Also store in general messages array
    if (!signalingMessages.has(visitId)) {
      signalingMessages.set(visitId, []);
    }
    signalingMessages.get(visitId)!.push(message);

    console.log(`Stored message for ${targetType} on visit ${visitId}`);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error handling POST signaling:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET endpoint for polling signaling messages
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const visitId = searchParams.get("visitId");
  const addressId = searchParams.get("addressId");
  const type = searchParams.get("type") as "visitor" | "resident";
  const lastMessageId = searchParams.get("lastMessageId");

  if ((!visitId && !addressId) || !type) {
    return Response.json(
      { error: "Missing visitId/addressId or type parameter" },
      { status: 400 }
    );
  }

  try {
    if (visitId) {
      initializePendingMessages(visitId);

      const pending = pendingMessages.get(visitId)!;
      const messages = pending[type];

      // Filter messages newer than lastMessageId if provided
      let filteredMessages = messages;
      if (lastMessageId) {
        const lastTimestamp = parseInt(lastMessageId);
        if (!isNaN(lastTimestamp)) {
          filteredMessages = messages.filter(
            (msg) => (msg as any).timestamp > lastTimestamp
          );
        }
      }

      // Clear retrieved messages from pending
      pending[type] = [];

      return Response.json({
        messages: filteredMessages,
        lastMessageId:
          filteredMessages.length > 0
            ? Math.max(
                ...filteredMessages.map((m) => (m as any).timestamp)
              ).toString()
            : lastMessageId || "0",
      });
    } else {
      // Handle addressId case - for now just return empty
      return Response.json({
        messages: [],
        lastMessageId: lastMessageId || "0",
      });
    }
  } catch (error) {
    console.error("Error handling GET signaling:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
