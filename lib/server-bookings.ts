import crypto from "node:crypto";
import Razorpay from "razorpay";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./server-admin";
import { legacySessions, sessionAvailable } from "./event-sessions";
import type { Event } from "./firestore";
export function payments() { return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! }); }
export async function finalizeBooking(bookingId: string, paymentId?: string) {
  const db = adminDb(); const ref = db.collection("bookings").doc(bookingId);
  await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref); const booking = snapshot.data();
    if (!booking) throw new Error("Booking not found.");
    if (["confirmed", "refund_required", "cancelled"].includes(booking.status)) return;
    if (booking.amount > 0 && !paymentId) throw new Error("Payment required.");
    const eventRef = db.collection("events").doc(booking.eventId);
    const eventSnapshot = await tx.get(eventRef);
    const event = eventSnapshot.data() as Event | undefined;
    const sessions = event ? legacySessions(event) : [];
    const session = sessions.find(s => s.id === booking.sessionId);
    const ticket = event?.ticketTypes.find(t => t.id === booking.ticketTypeId);
    const unavailable = !session || !sessionAvailable(session) || !ticket || booking.expiresAt < Date.now() || (session.sold[ticket.id] ?? 0) + booking.quantity > ticket.available;
    const status = unavailable ? booking.amount > 0 ? "refund_required" : "cancelled" : "confirmed";
    if (!unavailable && session && ticket && event) tx.update(eventRef, {
      sessions: sessions.map(s => s.id === session.id ? { ...s, sold: { ...s.sold, [ticket.id]: (s.sold[ticket.id] ?? 0) + booking.quantity } } : s),
      ticketTypes: event.ticketTypes.map(t => t.id === ticket.id ? { ...t, sold: t.sold + booking.quantity } : t),
    });
    tx.update(ref, { status, ...(paymentId ? { paymentId } : {}), confirmedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection("eventJobs").doc(`${bookingId}_${status}`), { type: "booking_email", bookingId, status: "pending", template: status, createdAt: FieldValue.serverTimestamp() });
  });
  return (await ref.get()).data()!.status as string;
}
export function tokenHash(token: string) { return crypto.createHash("sha256").update(token).digest("hex"); }
