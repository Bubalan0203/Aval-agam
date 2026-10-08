import { legacySessions, validateSessions, sessionAvailable, sessionStart, type EventSession } from "./event-sessions";
import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteField, arrayUnion,
  query, orderBy, where, writeBatch, Timestamp, runTransaction, serverTimestamp, addDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { eventMediaDefaults, sanitizeDescription, type DescriptionFormat, type YouTubeUrls } from "./event-content";
import { checkBookable } from "./booking-logic";

// ── Types ────────────────────────────────────────────────────────────────────

export type TicketType = {
  id:        string;
  name:      string;
  price:     number;
  /** Seats per date. */
  available: number;
  /** Derived on read: seats sold across all dates. Never written. */
  sold:      number;
};

export type EventStatus = "draft" | "published" | "archived";

export type Event = {
  id:          string;
  status:      EventStatus;
  sessions:    EventSession[];
  schemaVersion?: number;
  title:       string;
  description: string;
  descriptionFormat?: DescriptionFormat;
  youtubeUrls?: YouTubeUrls;
  category:    string;
  /** Derived on read from the next upcoming date (or the last date). Never written. */
  date:        string;
  startTime:   string;
  endTime:     string;
  location:    string;
  locationUrl: string;
  image:       string;
  gallery:     string[];
  ticketTypes: TicketType[];
  createdAt?:  Timestamp;
  updatedAt?:  Timestamp;
};

/** What the editor submits. Derived fields are omitted. */
export type EventInput = Omit<Event, "id" | "createdAt" | "updatedAt" | "date" | "startTime" | "endTime" | "ticketTypes" | "schemaVersion"> & {
  ticketTypes: Omit<TicketType, "sold">[];
};

export type BookingStatus = "confirmed" | "cancelled" | "refund_required" | "refunded";

export type BookingHistoryEntry = { at: string; by: string; action: string; note?: string };

export type Booking = {
  id?:         string;
  eventId:     string;
  sessionId:   string;
  sessionDate: string;
  sessionStartTime: string;
  sessionEndTime: string;
  status:      BookingStatus;
  eventTitle:  string;
  venue?:      string;
  name:        string;
  email:       string;
  phone:       string;
  ticketTypeId: string;
  ticketType:  string;
  unitPrice?:  number;
  quantity:    number;
  amount:      number;
  paymentMethod: "razorpay" | "free" | "offline";
  paymentId?:  string;
  source?:     "website" | "admin";
  /** Set when a paid booking could not get seats; seats were never taken. */
  seatsHeld?:  boolean;
  failureReason?: string;
  cancellationReason?: string;
  history?:    BookingHistoryEntry[];
  confirmationEmailSentAt?: string | null;
  bookedAt?:   Timestamp;
};

// ── Normalisation ────────────────────────────────────────────────────────────

/** Fills derived fields so the rest of the app never reads stale stored copies. */
export function withSessions(raw: Record<string, unknown> & { id: string }): Event {
  const base = { ...raw, ...eventMediaDefaults(raw) } as unknown as Event & { ticketTypes: TicketType[] };
  const sessions = legacySessions({ ...base, ticketTypes: (base.ticketTypes ?? []).map(t => ({ id: t.id, sold: t.sold ?? 0 })) });
  const sorted = [...sessions].sort((a, b) => sessionStart(a) - sessionStart(b));
  const next = sorted.find(s => sessionAvailable(s)) ?? sorted[sorted.length - 1];
  return {
    ...base,
    status: base.status ?? "published",
    sessions,
    gallery: base.gallery ?? [],
    ticketTypes: (base.ticketTypes ?? []).map(t => ({ ...t, sold: sessions.reduce((n, s) => n + (s.sold[t.id] ?? 0), 0) })),
    date: next?.date ?? "", startTime: next?.startTime ?? "", endTime: next?.endTime ?? "",
  };
}

function actor(): string {
  return auth.currentUser?.email ?? "website";
}

function historyEntry(action: string, note?: string): BookingHistoryEntry {
  return { at: new Date().toISOString(), by: actor(), action, ...(note ? { note } : {}) };
}

// ── Admin access ─────────────────────────────────────────────────────────────

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

/** Admins are listed in NEXT_PUBLIC_ADMIN_EMAILS, or have a document at admins/{uid}. */
export async function isAdmin(uid: string): Promise<boolean> {
  const email = auth.currentUser?.email?.toLowerCase();
  if (email && ADMIN_EMAILS.includes(email)) return true;
  try { return (await getDoc(doc(db, "admins", uid))).exists(); }
  catch { return false; }
}

function signedIn() {
  if (!auth.currentUser) throw new Error("Administrator sign-in required.");
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<Event[]> {
  const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => withSessions({ ...d.data(), id: d.id }));
}

/** Events visible on the public site. */
export async function getPublishedEvents(): Promise<Event[]> {
  return (await getEvents()).filter(e => e.status === "published");
}

export async function getEvent(id: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, "events", id));
  if (!snap.exists()) return null;
  return withSessions({ ...snap.data(), id: snap.id });
}

export function validateEventInput(data: EventInput, previous: EventSession[] = []): Record<string, string> {
  const errors: Record<string, string> = {};
  const publishing = data.status === "published";
  if (!data.title.trim()) errors.title = "Enter a title.";
  if (publishing && !data.category) errors.category = "Choose a category.";
  if (publishing && !data.location.trim()) errors.location = "Enter the venue.";
  if (publishing || data.sessions.length) {
    try { validateSessions(data.sessions, previous); } catch (e) { errors.sessions = (e as Error).message; }
  }
  if (!data.ticketTypes.length) errors.tickets = "Add at least one ticket type.";
  else if (data.ticketTypes.some(t => !t.name.trim() || !Number.isInteger(t.available) || t.available < 1 || !Number.isFinite(t.price) || t.price < 0))
    errors.tickets = "Every ticket needs a name, seats (1 or more) and a price (0 for free).";
  else for (const session of previous) for (const [id, sold] of Object.entries(session.sold)) {
    const ticket = data.ticketTypes.find(t => t.id === id);
    if (sold > 0 && (!ticket || ticket.available < sold)) { errors.tickets = "A ticket with bookings can't be removed or set below the seats already sold."; break; }
  }
  if (publishing && !data.image) errors.image = "Add a cover image before publishing.";
  return errors;
}

function eventPayload(data: EventInput, previous: EventSession[] = []) {
  const errors = validateEventInput(data, previous);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
  const sessions = data.sessions.map(s => {
    const old = previous.find(p => p.id === s.id);
    // Seat counts are owned by bookings, never by the editor.
    return old?.status === "cancelled" ? old : { ...s, sold: old?.sold ?? {} };
  });
  return {
    ...data, ...eventMediaDefaults(data as unknown as Record<string, unknown>),
    description: data.descriptionFormat === "html" ? sanitizeDescription(data.description) : data.description,
    sessions, schemaVersion: 3,
    ticketTypes: data.ticketTypes.map(({ id, name, price, available }) => ({ id, name: name.trim(), price, available })),
    updatedAt: serverTimestamp(),
  };
}

const LEGACY_FIELDS = { date: deleteField(), startTime: deleteField(), endTime: deleteField(), selectedSessionId: deleteField() };

export async function createEvent(data: EventInput): Promise<string> {
  signedIn();
  return (await addDoc(collection(db, "events"), { ...eventPayload(data), createdAt: serverTimestamp() })).id;
}

export async function updateEvent(id: string, data: EventInput): Promise<void> {
  signedIn();
  await runTransaction(db, async tx => {
    const ref = doc(db, "events", id); const current = await tx.get(ref);
    if (!current.exists()) throw new Error("Event not found.");
    const prev = withSessions({ ...current.data(), id });
    tx.update(ref, { ...eventPayload(data, prev.sessions), ...LEGACY_FIELDS });
  });
}

export async function setEventStatus(id: string, status: EventStatus): Promise<void> {
  signedIn();
  if (status === "published") {
    const event = await getEvent(id);
    if (!event) throw new Error("Event not found.");
    const errors = validateEventInput({ ...event, status }, event.sessions.filter(s => s.status === "cancelled" || sessionStart(s) <= Date.now() || Object.values(s.sold).some(n => n > 0)));
    delete errors.sessions; // past dates are fine on an existing event
    const first = Object.values(errors)[0];
    if (first) throw new Error(first);
  }
  await updateDoc(doc(db, "events", id), { status, updatedAt: serverTimestamp() });
}

/** Copies an event as a draft with fresh, empty dates. */
export async function duplicateEvent(id: string): Promise<string> {
  signedIn();
  const event = await getEvent(id);
  if (!event) throw new Error("Event not found.");
  const { title, description, descriptionFormat, youtubeUrls, category, location, locationUrl, image, gallery } = event;
  return (await addDoc(collection(db, "events"), {
    title: `${title} (copy)`, description, descriptionFormat: descriptionFormat ?? "text", youtubeUrls: youtubeUrls ?? [null, null],
    category, location, locationUrl, image, gallery,
    ticketTypes: event.ticketTypes.map(t => ({ id: crypto.randomUUID(), name: t.name, price: t.price, available: t.available })),
    sessions: [], status: "draft", schemaVersion: 3, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })).id;
}

export async function deleteEvent(id: string): Promise<void> {
  signedIn();
  const bookings = await getEventBookings(id);
  if (bookings.length) throw new Error("Events with bookings can't be deleted. Archive it instead.");
  await runTransaction(db, async tx => {
    const ref = doc(db, "events", id); const current = await tx.get(ref);
    if (!current.exists()) return;
    if (withSessions({ ...current.data(), id }).sessions.some(s => s.status === "cancelled" || Object.values(s.sold).some(n => n > 0)))
      throw new Error("Events with bookings or cancelled dates can't be deleted. Archive it instead.");
    tx.delete(ref);
  });
}

export async function cancelEventSession(eventId: string, sessionId: string, reason: string): Promise<void> {
  signedIn();
  if (!reason.trim()) throw new Error("Enter a cancellation reason.");
  await runTransaction(db, async tx => {
    const ref = doc(db, "events", eventId); const current = await tx.get(ref);
    if (!current.exists()) throw new Error("Event not found.");
    const sessions = withSessions({ ...current.data(), id: eventId }).sessions;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error("Date not found.");
    if (session.status === "cancelled") return;
    if (!sessionAvailable(session)) throw new Error("Dates that already started can't be cancelled.");
    tx.update(ref, { schemaVersion: 3, sessions: sessions.map(s => s.id === sessionId ? { ...s, status: "cancelled", cancelledAt: new Date().toISOString(), cancellationReason: reason.trim() } : s) });
  });
  // Move every confirmed booking on that date out of "confirmed" straight away,
  // so the refund queue is right even if the cancellation emails fail.
  const affected = (await getEventBookings(eventId)).filter(b => b.sessionId === sessionId && b.status === "confirmed");
  const batch = writeBatch(db);
  for (const b of affected) batch.update(doc(db, "bookings", b.id!), {
    status: b.amount > 0 ? "refund_required" : "cancelled", seatsHeld: false, cancellationReason: reason.trim(),
    history: arrayUnion(historyEntry("date_cancelled", reason.trim())),
  });
  if (affected.length) await batch.commit();
}

/** One-time upgrade of old documents to schema 3 (sessions only, status set, no duplicated counters). */
export async function migrateEvents(): Promise<{ events: number; bookings: number }> {
  signedIn();
  const snap = await getDocs(collection(db, "events"));
  let events = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.schemaVersion === 3 && data.status) continue;
    const e = withSessions({ ...data, id: d.id });
    await updateDoc(d.ref, {
      sessions: e.sessions, status: e.status, schemaVersion: 3,
      ticketTypes: e.ticketTypes.map(({ id, name, price, available }) => ({ id, name, price, available })),
      ...LEGACY_FIELDS,
    });
    events++;
  }
  const eventsById = new Map(snap.docs.map(d => [d.id, withSessions({ ...d.data(), id: d.id })]));
  const bsnap = await getDocs(collection(db, "bookings"));
  let bookings = 0;
  for (const d of bsnap.docs) {
    const b = d.data() as Omit<Booking, "status"> & { status?: string };
    const patch: Record<string, unknown> = {};
    if (!b.status || b.status === "pending") patch.status = b.status === "pending" ? "cancelled" : "confirmed";
    if (!b.sessionId) {
      const ev = eventsById.get(b.eventId);
      const s = ev?.sessions.find(x => x.id === "legacy") ?? ev?.sessions[0];
      if (s) Object.assign(patch, { sessionId: s.id, sessionDate: s.date, sessionStartTime: s.startTime, sessionEndTime: s.endTime });
    }
    if (!b.ticketTypeId) {
      const t = eventsById.get(b.eventId)?.ticketTypes.find(x => x.name === b.ticketType);
      if (t) patch.ticketTypeId = t.id;
    }
    if (!b.paymentMethod) patch.paymentMethod = b.amount > 0 ? "razorpay" : "free";
    if (Object.keys(patch).length) { await updateDoc(d.ref, patch); bookings++; }
  }
  return { events, bookings };
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export type BookingInput = {
  eventId: string; sessionId: string; ticketTypeId: string; quantity: number;
  name: string; email: string; phone: string;
  paymentMethod: Booking["paymentMethod"]; paymentId?: string; amount: number;
  source?: Booking["source"];
};

export type BookingResult = { id: string; booking: Booking };

const BOOKING_ERRORS: Record<string, string> = {
  EVENT_NOT_FOUND: "This event is no longer available.",
  DATE_UNAVAILABLE: "This date is no longer available.",
  TICKET_NOT_FOUND: "This ticket type is no longer available.",
  INVALID_QUANTITY: "Choose between 1 and 10 tickets.",
  SOLD_OUT: "Not enough seats are left for this ticket.",
};

export class BookingError extends Error {
  constructor(public code: string) { super(BOOKING_ERRORS[code] ?? "We couldn't complete your booking."); }
}

/** Re-reads the event right before payment so customers aren't charged for seats that are gone. */
export async function checkAvailability(eventId: string, sessionId: string, ticketTypeId: string, quantity: number): Promise<void> {
  const event = await getEvent(eventId);
  if (!event || event.status !== "published") throw new BookingError("EVENT_NOT_FOUND");
  const code = checkBookable(event, sessionId, ticketTypeId, quantity);
  if (code) throw new BookingError(code);
}

/**
 * Saves the booking and takes the seats atomically.
 * If a paid booking can't get seats (sold out while paying), it is still recorded as
 * `refund_required` so the payment is never lost; `BookingError` is thrown only when nothing was paid.
 */
export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const ref = doc(collection(db, "bookings"));
  let saved: Booking | null = null;
  try {
    await runTransaction(db, async tx => {
      const eventRef = doc(db, "events", input.eventId); const current = await tx.get(eventRef);
      if (!current.exists()) throw new BookingError("EVENT_NOT_FOUND");
      const event = withSessions({ ...current.data(), id: input.eventId });
      if (input.source !== "admin" && event.status !== "published") throw new BookingError("EVENT_NOT_FOUND");
      const code = checkBookable(event, input.sessionId, input.ticketTypeId, input.quantity);
      if (code) throw new BookingError(code);
      const session = event.sessions.find(s => s.id === input.sessionId)!;
      const ticket = event.ticketTypes.find(t => t.id === input.ticketTypeId)!;
      tx.update(eventRef, {
        sessions: event.sessions.map(s => s.id === session.id ? { ...s, sold: { ...s.sold, [ticket.id]: (s.sold[ticket.id] ?? 0) + input.quantity } } : s),
      });
      saved = bookingDoc(input, event, session, ticket, "confirmed", true);
      tx.set(ref, { ...saved, bookedAt: serverTimestamp() });
    });
  } catch (err) {
    if (!input.paymentId) throw err instanceof BookingError ? err : new BookingError("UNKNOWN");
    // Paid but no seats: record it so the admin sees it in the refund queue.
    const event = await getEvent(input.eventId).catch(() => null);
    const session = event?.sessions.find(s => s.id === input.sessionId);
    const ticket = event?.ticketTypes.find(t => t.id === input.ticketTypeId);
    const reason = err instanceof BookingError ? err.message : "Booking could not be saved after payment.";
    saved = {
      ...bookingDoc(input, event, session, ticket, "refund_required", false),
      failureReason: reason,
      history: [historyEntry("payment_received_no_seats", reason)],
    };
    await setDoc(ref, { ...saved, bookedAt: serverTimestamp() });
  }
  return { id: ref.id, booking: saved! };
}

function bookingDoc(input: BookingInput, event: Event | null | undefined, session: EventSession | undefined, ticket: TicketType | undefined, status: BookingStatus, seatsHeld: boolean): Booking {
  return {
    eventId: input.eventId, sessionId: input.sessionId,
    sessionDate: session?.date ?? "", sessionStartTime: session?.startTime ?? "", sessionEndTime: session?.endTime ?? "",
    status, seatsHeld,
    eventTitle: event?.title ?? "", venue: event?.location ?? "",
    name: input.name.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.trim(),
    ticketTypeId: input.ticketTypeId, ticketType: ticket?.name ?? "", unitPrice: ticket?.price ?? 0,
    quantity: input.quantity, amount: input.amount,
    paymentMethod: input.paymentMethod, ...(input.paymentId ? { paymentId: input.paymentId } : {}),
    source: input.source ?? "website",
    history: [historyEntry(input.source === "admin" ? "created_by_admin" : "booked")],
    confirmationEmailSentAt: null,
  };
}

export async function markConfirmationEmailSent(bookingId: string): Promise<void> {
  await updateDoc(doc(db, "bookings", bookingId), { confirmationEmailSentAt: new Date().toISOString() });
}

export async function getBookings(): Promise<Booking[]> {
  const q = query(collection(db, "bookings"), orderBy("bookedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => normaliseBooking({ id: d.id, ...d.data() }));
}

export async function getEventBookings(eventId: string): Promise<Booking[]> {
  const q = query(collection(db, "bookings"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => normaliseBooking({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.bookedAt?.toMillis() ?? 0) - (a.bookedAt?.toMillis() ?? 0));
}

function normaliseBooking(raw: Record<string, unknown>): Booking {
  const b = raw as unknown as Omit<Booking, "status"> & { status?: string };
  return {
    ...b,
    status: (b.status === "pending" || !b.status ? "confirmed" : b.status) as BookingStatus,
    sessionId: b.sessionId ?? "legacy",
    paymentMethod: b.paymentMethod ?? (b.amount > 0 ? "razorpay" : "free"),
  };
}

/** Admin: cancel a confirmed booking and give its seats back (unless the date itself was cancelled). */
export async function cancelBooking(bookingId: string, reason: string): Promise<void> {
  signedIn();
  if (!reason.trim()) throw new Error("Enter a reason.");
  await runTransaction(db, async tx => {
    const bref = doc(db, "bookings", bookingId); const bsnap = await tx.get(bref);
    if (!bsnap.exists()) throw new Error("Booking not found.");
    const b = normaliseBooking({ id: bookingId, ...bsnap.data() });
    if (b.status !== "confirmed") throw new Error("Only confirmed bookings can be cancelled.");
    const eref = doc(db, "events", b.eventId); const esnap = await tx.get(eref);
    if (esnap.exists() && b.seatsHeld !== false) {
      const sessions = withSessions({ ...esnap.data(), id: b.eventId }).sessions;
      tx.update(eref, { sessions: sessions.map(s => s.id === b.sessionId && s.status !== "cancelled"
        ? { ...s, sold: { ...s.sold, [b.ticketTypeId]: Math.max(0, (s.sold[b.ticketTypeId] ?? 0) - b.quantity) } } : s) });
    }
    tx.update(bref, {
      status: b.amount > 0 ? "refund_required" : "cancelled", seatsHeld: false, cancellationReason: reason.trim(),
      history: arrayUnion(historyEntry("cancelled", reason.trim())),
    });
  });
}

export async function markRefunded(bookingId: string, note: string): Promise<void> {
  signedIn();
  await updateDoc(doc(db, "bookings", bookingId), {
    status: "refunded", history: arrayUnion(historyEntry("refunded", note.trim() || undefined)),
  });
}

export async function addBookingNote(bookingId: string, action: string, note?: string): Promise<void> {
  await updateDoc(doc(db, "bookings", bookingId), { history: arrayUnion(historyEntry(action, note)) });
}
