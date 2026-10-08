"use client";
import emailjs from "@emailjs/browser";
import { formatDateLong, formatTime12, rupees } from "./booking-logic";

// EmailJS identifiers are public by design; env vars allow rotating them without a code change.
export const EMAILJS_SERVICE_ID  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID  || "service_ccmza7t";
export const EMAILJS_PUBLIC_KEY  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY  || "F8QjNtOzTSS8DVitl";
const CONFIRMATION_TEMPLATE_ID   = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_ro58gnx";

export type ConfirmationEmail = {
  bookingId: string; name: string; email: string; phone: string;
  eventTitle: string; date: string; startTime: string; endTime: string; venue: string;
  ticketType: string; quantity: number; amount: number;
};

export async function sendConfirmationEmail(b: ConfirmationEmail): Promise<void> {
  await emailjs.send(EMAILJS_SERVICE_ID, CONFIRMATION_TEMPLATE_ID, {
    booking_id:     b.bookingId,
    customer_name:  b.name,
    customer_email: b.email,
    customer_phone: b.phone,
    event_title:    b.eventTitle,
    event_date:     formatDateLong(b.date),
    event_time:     `${formatTime12(b.startTime)} — ${formatTime12(b.endTime)} IST`,
    event_venue:    b.venue,
    ticket_type:    b.ticketType,
    quantity:       String(b.quantity),
    amount:         rupees(b.amount),
    to_email:       b.email,
  }, EMAILJS_PUBLIC_KEY);
}
