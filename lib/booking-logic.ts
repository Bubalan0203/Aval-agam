/** Pure booking/event rules shared by the UI and Firestore layer. No Firebase imports. */
import { sessionAvailable, sessionStart, type EventSession } from "./event-sessions";

export type TicketLike = { id: string; name: string; price: number; available: number };
export type EventLike = { ticketTypes: TicketLike[]; sessions?: EventSession[] };

export const MAX_TICKETS_PER_BOOKING = 10;

export function ticketRemaining(ticket: TicketLike, session: EventSession): number {
  return Math.max(0, ticket.available - (session.sold[ticket.id] ?? 0));
}

export function sessionRemaining(event: EventLike, session: EventSession): number {
  return event.ticketTypes.reduce((n, t) => n + ticketRemaining(t, session), 0);
}

export function sessionCapacity(event: EventLike): number {
  return event.ticketTypes.reduce((n, t) => n + t.available, 0);
}

export function sessionSold(session: EventSession): number {
  return Object.values(session.sold).reduce((a, b) => a + b, 0);
}

/** Upcoming, non-cancelled dates in chronological order (sold-out ones included, flagged by remaining = 0). */
export function upcomingSessions(event: EventLike & { sessions: EventSession[] }, now = Date.now()): EventSession[] {
  return event.sessions.filter(s => sessionAvailable(s, now)).sort((a, b) => sessionStart(a) - sessionStart(b));
}

export function bookableSessions(event: EventLike & { sessions: EventSession[] }, now = Date.now()): EventSession[] {
  return upcomingSessions(event, now).filter(s => sessionRemaining(event, s) > 0);
}

export function maxQuantity(ticket: TicketLike, session: EventSession): number {
  return Math.min(MAX_TICKETS_PER_BOOKING, ticketRemaining(ticket, session));
}

/** Validates a booking request against the latest event data. Returns an error code or null. */
export function checkBookable(event: EventLike & { sessions: EventSession[] }, sessionId: string, ticketId: string, quantity: number, now = Date.now()):
  null | "DATE_UNAVAILABLE" | "TICKET_NOT_FOUND" | "INVALID_QUANTITY" | "SOLD_OUT" {
  const session = event.sessions.find(s => s.id === sessionId);
  if (!session || !sessionAvailable(session, now)) return "DATE_UNAVAILABLE";
  const ticket = event.ticketTypes.find(t => t.id === ticketId);
  if (!ticket) return "TICKET_NOT_FOUND";
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_BOOKING) return "INVALID_QUANTITY";
  if (ticketRemaining(ticket, session) < quantity) return "SOLD_OUT";
  return null;
}

/** Paid amount below current price × quantity (the browser computes the price, so admins see a warning). */
export function amountMismatch(booking: { amount: number; quantity: number; ticketTypeId?: string; paymentMethod?: string }, event?: EventLike | null): boolean {
  if (!event || booking.paymentMethod === "offline" || !booking.ticketTypeId) return false;
  const ticket = event.ticketTypes.find(t => t.id === booking.ticketTypeId);
  if (!ticket) return false;
  return booking.amount < ticket.price * booking.quantity;
}

/** Builds extra dates repeating a base date every `everyDays` days, `count` times (base not included). */
export function repeatDates(base: Pick<EventSession, "date" | "startTime" | "endTime">, count: number, everyDays = 7): Pick<EventSession, "date" | "startTime" | "endTime">[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base.date) || count < 1 || everyDays < 1) return [];
  const [y, m, d] = base.date.split("-").map(Number);
  return Array.from({ length: Math.min(count, 99) }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + everyDays * (i + 1)));
    return { date: dt.toISOString().slice(0, 10), startTime: base.startTime, endTime: base.endTime };
  });
}

export function toCsv(rows: (string | number | undefined | null)[][]): string {
  return rows.map(r => r.map(v => {
    const s = String(v ?? "");
    // Neutralise spreadsheet formulas and quote everything.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, rows: (string | number | undefined | null)[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function formatTime12(t: string): string {
  const m = t.match(/^(\d{2}):(\d{2})$/);
  if (!m) return t;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

export function formatDateLong(d: string): string {
  if (!d) return "";
  return new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function formatDateShort(d: string): string {
  if (!d) return "";
  return new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}

export function rupees(n: number): string {
  return n === 0 ? "Free" : `₹${n.toLocaleString("en-IN")}`;
}
