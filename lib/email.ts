"use client";
import emailjs from "@emailjs/browser";
import { formatDateLong, formatTime12, rupees } from "./booking-logic";

// EmailJS identifiers are public by design; env vars allow rotating them without a code change.
export const EMAILJS_SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  || "service_7dbj13y";
export const EMAILJS_PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  || "F8QjNtOzTSS8DVitl";
const CONFIRMATION_TEMPLATE_ID   = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_ro58gnx";
const CANCELLATION_TEMPLATE_ID   = process.env.NEXT_PUBLIC_EMAILJS_CANCELLATION_TEMPLATE_ID || "template_eobun16";

export const BUSINESS_NAME = "Aval Agam";
export const BUSINESS_EMAIL = "marketingbybrindha@gmail.com";

/** Template variables: To Email = {{to_email}}, From Name = {{name}}, Reply To = {{reply_to}}. */
export function recipient(email: string, name: string) {
  return { to_email: email, customer_email: email, email, user_email: email, to_name: name, customer_name: name, name: BUSINESS_NAME, reply_to: BUSINESS_EMAIL };
}

export type ConfirmationEmail = {
  bookingId: string; name: string; email: string; phone: string;
  eventTitle: string; date: string; startTime: string; endTime: string; venue: string;
  ticketType: string; quantity: number; amount: number;
};

export async function sendConfirmationEmail(b: ConfirmationEmail): Promise<void> {
  await emailjs.send(EMAILJS_SERVICE_ID, CONFIRMATION_TEMPLATE_ID, {
    booking_id:     b.bookingId,
    customer_phone: b.phone,
    event_title:    b.eventTitle,
    event_date:     formatDateLong(b.date),
    event_time:     `${formatTime12(b.startTime)} — ${formatTime12(b.endTime)} IST`,
    event_venue:    b.venue,
    ticket_type:    b.ticketType,
    quantity:       String(b.quantity),
    amount:         rupees(b.amount),
    ...recipient(b.email, b.name),
  }, EMAILJS_PUBLIC_KEY);
}

/** Tells one customer their booking was cancelled (used when an admin cancels a single booking). */
export async function sendBookingCancellationEmail(b: ConfirmationEmail & { reason: string }): Promise<void> {
  await emailjs.send(EMAILJS_SERVICE_ID, CANCELLATION_TEMPLATE_ID, {
    booking_id: b.bookingId, event_title: b.eventTitle,
    event_date: formatDateLong(b.date), event_time: `${formatTime12(b.startTime)} – ${formatTime12(b.endTime)} IST`,
    event_venue: b.venue, ticket_type: b.ticketType, quantity: String(b.quantity), amount: rupees(b.amount),
    cancellation_reason: b.reason,
    refund_status: b.amount > 0 ? "Your booking is marked for a refund. Our team will process it and confirm with you." : "This was a free booking. No refund is due.",
    ...recipient(b.email, b.name),
  }, EMAILJS_PUBLIC_KEY);
}
