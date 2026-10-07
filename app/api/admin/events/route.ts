import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, requireAdmin } from "@/lib/server-admin";
import { legacySessions, validateSessions, sessionAvailable } from "@/lib/event-sessions";
import { eventMediaDefaults, sanitizeDescription } from "@/lib/event-content";
import type { Event } from "@/lib/firestore";
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const { action, id, data, sessionId, reason } = await request.json();
    const db = adminDb();
    if (!["create", "update", "delete", "cancel"].includes(action)) throw new Error("Invalid action.");
    if (action !== "create" && (typeof id !== "string" || !/^[\w-]+$/.test(id))) throw new Error("Invalid event.");
    const ref = action === "create" ? db.collection("events").doc() : db.collection("events").doc(id);
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      const old = snapshot.exists ? snapshot.data() as Event : null;
      if (action !== "create" && !old) throw new Error("Event not found.");
      const previous = old ? legacySessions(old) : [];
      if (action === "delete") {
        const bookings = await tx.get(db.collection("bookings").where("eventId", "==", id).limit(1));
        if (!bookings.empty || previous.some(s => s.status === "cancelled" || Object.values(s.sold).some(n => n > 0))) throw new Error("Events with bookings or cancelled dates cannot be deleted.");
        tx.delete(ref); return;
      }
      if (action === "cancel") {
        if (typeof reason !== "string" || !reason.trim() || reason.length > 1000) throw new Error("Enter a cancellation reason (up to 1000 characters).");
        const session = previous.find(s => s.id === sessionId);
        if (!session) throw new Error("Date not found.");
        if (session.status === "cancelled") return;
        if (!sessionAvailable(session)) throw new Error("Started dates cannot be cancelled.");
        tx.update(ref, { schemaVersion: 2, sessions: previous.map(s => s.id === sessionId ? { ...s, status: "cancelled", cancelledAt: new Date().toISOString(), cancellationReason: reason.trim() } : s) });
        tx.set(db.collection("eventJobs").doc(`${id}_${sessionId}_cancel`), { eventId: id, sessionId, reason: reason.trim(), type: "cancellation", status: "pending", actor, createdAt: FieldValue.serverTimestamp() });
        return;
      }
      const value = data as Event;
      if (!value || typeof value.title !== "string" || !value.title.trim() || !Array.isArray(value.ticketTypes) || !value.ticketTypes.length) throw new Error("Title and tickets are required.");
      if (new Set(value.ticketTypes.map(t => t.id)).size !== value.ticketTypes.length || value.ticketTypes.some(t => !/^[\w-]+$/.test(t.id) || !t.name.trim() || !Number.isInteger(t.available) || t.available < 1 || !Number.isFinite(t.price) || t.price < 0)) throw new Error("Invalid ticket details.");
      validateSessions(value.sessions ?? [], previous);
      for (const session of previous) for (const [ticketId, sold] of Object.entries(session.sold)) {
        const ticket = value.ticketTypes.find(t => t.id === ticketId);
        if (sold > 0 && (!ticket || ticket.available < sold)) throw new Error("Cannot remove booked tickets or lower capacity below booked seats.");
      }
      const sessions = value.sessions!.map(s => { const existing = previous.find(p => p.id === s.id); return existing?.status === "cancelled" ? existing : { id: s.id, date: s.date, startTime: s.startTime, endTime: s.endTime, status: "scheduled", sold: existing?.sold ?? {} }; });
      const payload = {
        ...eventMediaDefaults(value), title: value.title.trim(), description: value.descriptionFormat === "html" ? sanitizeDescription(value.description) : value.description,
        category: value.category, location: value.location, image: value.image,
        date: sessions[0].date, startTime: sessions[0].startTime, endTime: sessions[0].endTime,
        ticketTypes: value.ticketTypes.map(t => ({ id: t.id, name: t.name, price: t.price, available: t.available, sold: previous.reduce((sum,s) => sum + (s.sold[t.id] ?? 0),0) })),
        schemaVersion: 2, sessions, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor,
      };
      if (action === "create") tx.create(ref, { ...payload, createdAt: FieldValue.serverTimestamp() });
      else tx.update(ref, payload);
    });
    return NextResponse.json({ id: ref.id });
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
}
