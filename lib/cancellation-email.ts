"use client";
import emailjs from "@emailjs/browser";
import { doc, runTransaction, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { getEvent, getEventBookings } from "./firestore";
import { legacySessions } from "./event-sessions";

// These are the same public EmailJS identifiers used by the original booking form.
const service = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_ccmza7t";
const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "F8QjNtOzTSS8DVitl";
const template = process.env.NEXT_PUBLIC_EMAILJS_CANCELLATION_TEMPLATE_ID || "template_eobun16";

/** Browser-based delivery, like confirmations. Keep the page open; failed sends can be retried. */
export async function sendCancellationEmails(eventId: string) {
  if (!auth.currentUser) throw new Error("Administrator sign-in required.");
  const event = await getEvent(eventId);
  if (!event) throw new Error("Event not found.");
  const sessions = legacySessions(event);
  const bookings = await getEventBookings(eventId);
  let sent = 0, failed = 0;
  for (const booking of bookings) {
    const session = sessions.find(s => s.id === (booking.sessionId ?? "legacy") && s.status === "cancelled");
    if (!session || !booking.id) continue;
    const ref = doc(db, "bookings", booking.id);
    const claimed = await runTransaction(db, async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists()) return false;
      const current = snapshot.data();
      if (current.cancellationEmailSentAt || (current.cancellationEmailLeaseUntil ?? 0) > Date.now()) return false;
      tx.update(ref, { status: current.status === "refunded" ? "refunded" : booking.amount > 0 ? "refund_required" : "cancelled", cancellationReason: session.cancellationReason ?? "", cancellationEmailLeaseUntil: Date.now() + 120000 });
      return true;
    });
    if (!claimed) continue;
    try {
      await emailjs.send(service, template, {
        to_email: booking.email, customer_email: booking.email, customer_name: booking.name,
        email: booking.email, user_email: booking.email, reply_to: booking.email, to_name: booking.name,
        booking_id: booking.id, event_title: booking.eventTitle,
        event_date: booking.sessionDate ?? session.date,
        event_time: `${booking.sessionStartTime ?? session.startTime}–${booking.sessionEndTime ?? session.endTime} IST`,
        event_venue: event.location, ticket_type: booking.ticketType, quantity: booking.quantity,
        amount: booking.amount, cancellation_reason: session.cancellationReason ?? "This event date has been cancelled.",
        refund_status: booking.status === "refunded" ? "Your refund has been recorded as completed." : booking.amount > 0 ? "Your booking is marked as needing a refund. Please contact our team for payment assistance." : "This was a free booking. No refund is due.",
      }, publicKey);
      await updateDoc(ref, { cancellationEmailSentAt: new Date().toISOString(), cancellationEmailLeaseUntil: 0, cancellationEmailError: "" });
      sent++;
    } catch {
      failed++;
      await updateDoc(ref, { cancellationEmailLeaseUntil: 0, cancellationEmailError: "Delivery failed. Retry from the event page." });
    }
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
  return { sent, failed };
}
