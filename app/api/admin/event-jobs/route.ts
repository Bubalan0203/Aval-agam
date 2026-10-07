import { NextResponse } from "next/server";
import { FieldValue, FieldPath } from "firebase-admin/firestore";
import { adminDb, requireAdmin } from "@/lib/server-admin";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) await requireAdmin(request);
    const db = adminDb();
    const jobs = await db.collection("eventJobs").where("status", "==", "pending").limit(3).get();
    let completed = 0;
    for (const job of jobs.docs) {
      const claimed = await db.runTransaction(async tx => {
        const current = (await tx.get(job.ref)).data()!;
        if (current.status !== "pending" || (current.leaseUntil ?? 0) > Date.now()) return false;
        tx.update(job.ref, { leaseUntil: Date.now() + 120000, attempts: FieldValue.increment(1) }); return true;
      });
      if (!claimed) continue;
      try {
        const data = job.data();
        if (data.type === "cancellation") {
          let query = db.collection("bookings").where("eventId", "==", data.eventId).orderBy(FieldPath.documentId()).limit(100);
          if (data.cursor) query = query.startAfter(data.cursor);
          const bookings = await query.get();
          for (const booking of bookings.docs) {
            if ((booking.data().sessionId ?? "legacy") !== data.sessionId) continue;
            await db.runTransaction(async tx => {
              const current = (await tx.get(booking.ref)).data()!;
              if (current.status && current.status !== "confirmed") return;
              const status = current.amount > 0 ? "refund_required" : "cancelled";
              tx.update(booking.ref, { status, cancellationReason: data.reason, cancelledAt: FieldValue.serverTimestamp() });
              tx.set(db.collection("eventJobs").doc(`${booking.id}_cancelled`), { type: "booking_email", bookingId: booking.id, template: "cancelled", status: "pending", reason: data.reason, createdAt: FieldValue.serverTimestamp() });
            });
          }
          if (bookings.size === 100) {
            await job.ref.update({ cursor: bookings.docs[99].id, leaseUntil: 0 });
            continue;
          }
        } else if (data.type === "booking_email") {
          const booking = (await db.collection("bookings").doc(data.bookingId).get()).data();
          if (!booking) throw new Error("Booking missing.");
          const template = data.template === "confirmed" ? process.env.EMAILJS_CONFIRMATION_TEMPLATE_ID : process.env.EMAILJS_CANCELLATION_TEMPLATE_ID;
          if (!template || !process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_PUBLIC_KEY || !process.env.EMAILJS_PRIVATE_KEY) throw new Error("Email provider configuration missing.");
          const event = (await db.collection("events").doc(booking.eventId).get()).data();
          const cancelled = event?.sessions?.some((s: {id: string; status: string}) => s.id === booking.sessionId && s.status === "cancelled");
          // Never send an obsolete confirmation after a cancellation.
          if (data.template !== "confirmed" || booking.status === "confirmed" && !cancelled) {
            const result = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
              method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
              body: JSON.stringify({ service_id: process.env.EMAILJS_SERVICE_ID, template_id: template, user_id: process.env.EMAILJS_PUBLIC_KEY, accessToken: process.env.EMAILJS_PRIVATE_KEY, template_params: {
                to_email: booking.email, customer_email: booking.email, customer_name: booking.name,
                event_title: booking.eventTitle, event_date: booking.sessionDate, event_time: `${booking.sessionStartTime}–${booking.sessionEndTime} IST`, event_venue: booking.venue,
                ticket_type: booking.ticketType, quantity: booking.quantity, amount: booking.amount,
                booking_id: data.bookingId, cancellation_reason: data.reason ?? booking.cancellationReason ?? "The selected date is no longer available.",
                refund_status: booking.status === "refund_required" ? "Your payment requires a refund. Our team will contact you once it is processed." : "No refund is due.",
              } }),
            });
            if (!result.ok) throw new Error(`Email provider returned ${result.status}.`);
            await new Promise(resolve => setTimeout(resolve, 1100));
          }
        } else throw new Error("Unknown job type.");
        await job.ref.update({ status: "sent", leaseUntil: 0, completedAt: FieldValue.serverTimestamp(), lastError: null });
        completed++;
      } catch (error) { await job.ref.update({ leaseUntil: 0, lastError: (error as Error).message, lastAttemptAt: FieldValue.serverTimestamp() }); }
    }
    return NextResponse.json({ completed, checked: jobs.size });
  } catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
}
