import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server-admin";
import { payments, finalizeBooking, tokenHash } from "@/lib/server-bookings";
import { legacySessions, sessionAvailable } from "@/lib/event-sessions";
import type { Event } from "@/lib/firestore";
export async function POST(request: Request) {
  try {
    if (process.env.EVENT_BOOKING_MAINTENANCE === "true") throw new Error("Bookings are temporarily paused.");
    const input = await request.json();
    const { eventId, sessionId, ticketTypeId, quantity, name, email, phone, requestId } = input;
    if (![eventId, sessionId, ticketTypeId, requestId].every(v => typeof v === "string" && /^[\w-]{1,100}$/.test(v)) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || typeof name !== "string" || !name.trim() || name.length > 150 || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254 || typeof phone !== "string" || phone.length > 30) throw new Error("Invalid booking details.");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error("Invalid request identifier.");
    const db = adminDb(); const bookingRef = db.collection("bookings").doc(requestId);
    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rateId = crypto.createHmac("sha256", process.env.BOOKING_TOKEN_SECRET!).update(address).digest("hex");
    await db.runTransaction(async tx => {
      const rateRef = db.collection("bookingRateLimits").doc(rateId);
      const rate = (await tx.get(rateRef)).data();
      const fresh = !rate || rate.resetAt <= Date.now();
      if (!fresh && rate.count >= 20) throw new Error("Too many booking attempts. Please try again in a few minutes.");
      tx.set(rateRef, { count: fresh ? 1 : rate!.count + 1, resetAt: fresh ? Date.now() + 5 * 60000 : rate!.resetAt });
    });
    // A caller-held random request identifier also serves as a retry capability.
    const token = crypto.createHmac("sha256", process.env.BOOKING_TOKEN_SECRET!).update(requestId).digest("hex");
    await db.runTransaction(async tx => {
      const existing = await tx.get(bookingRef);
      if (existing.exists) { if (existing.data()!.tokenHash !== tokenHash(token) || existing.data()!.eventId !== eventId || existing.data()!.sessionId !== sessionId || existing.data()!.ticketTypeId !== ticketTypeId || existing.data()!.quantity !== quantity || existing.data()!.email !== email.trim()) throw new Error("Invalid request."); return; }
      const eventRef = db.collection("events").doc(eventId);
      const eventSnapshot = await tx.get(eventRef);
      if (!eventSnapshot.exists) throw new Error("Event not found.");
      const event = eventSnapshot.data() as Event;
      const session = legacySessions(event).find(s => s.id === sessionId);
      const ticket = event.ticketTypes.find(t => t.id === ticketTypeId);
      if (!session || !sessionAvailable(session) || !ticket || !Number.isFinite(ticket.price) || ticket.price < 0) throw new Error("This date or ticket is unavailable.");
      const holds = await tx.get(db.collection("bookings").where("eventId", "==", eventId));
      const held = holds.docs.reduce((sum, d) => { const b = d.data(); return sum + (b.sessionId === sessionId && b.ticketTypeId === ticketTypeId && b.status === "pending" && b.expiresAt > Date.now() ? b.quantity : 0); }, 0);
      if ((session.sold[ticket.id] ?? 0) + held + quantity > ticket.available) throw new Error("Not enough seats are available.");
      tx.update(eventRef, { reservationVersion: FieldValue.increment(1) });
      tx.create(bookingRef, { eventId, sessionId, eventTitle: event.title, sessionDate: session.date, sessionStartTime: session.startTime, sessionEndTime: session.endTime, venue: event.location, ticketTypeId, ticketType: ticket.name, quantity, amount: Math.round(ticket.price * quantity * 100) / 100, name: name.trim(), email: email.trim(), phone, status: "pending", expiresAt: Date.now() + 15 * 60000, tokenHash: tokenHash(token), bookedAt: FieldValue.serverTimestamp() });
    });
    let booking = (await bookingRef.get()).data()!;
    if (booking.status !== "pending") return NextResponse.json({ bookingId: bookingRef.id, token, status: booking.status, amount: booking.amount });
    if (booking.expiresAt <= Date.now()) throw new Error("Reservation expired. Start a new booking.");
    if (booking.amount === 0) return NextResponse.json({ bookingId: bookingRef.id, token, amount: 0, status: await finalizeBooking(bookingRef.id) });
    // A lock prevents concurrent retries from creating two payable orders.
    const claimed = await db.runTransaction(async tx => {
      const current = (await tx.get(bookingRef)).data()!;
      if (current.orderId || current.orderCreating) return false;
      tx.update(bookingRef, { orderCreating: true }); return true;
    });
    if (claimed) {
      try {
        const order = await payments().orders.create({ amount: Math.round(booking.amount * 100), currency: "INR", receipt: bookingRef.id.slice(0,40), notes: { bookingId: bookingRef.id } });
        await bookingRef.update({ orderId: order.id, orderCreating: false });
      } catch { throw new Error("Order creation is uncertain. Your reservation will expire automatically; do not retry payment for this reservation."); }
    }
    booking = (await bookingRef.get()).data()!;
    if (!booking.orderId) throw new Error("Payment order is being prepared. Please retry shortly.");
    return NextResponse.json({ bookingId: bookingRef.id, token, orderId: booking.orderId, amount: booking.amount, status: booking.status });
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
}
