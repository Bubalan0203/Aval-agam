import { legacySessions, validateSessions, sessionAvailable, type EventSession } from "./event-sessions";
import {
  collection, doc, getDocs, getDoc,
  query, orderBy, where, Timestamp, runTransaction, serverTimestamp, addDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { eventMediaDefaults, sanitizeDescription, type DescriptionFormat, type YouTubeUrls } from "./event-content";

// ── Types ────────────────────────────────────────────────────────────────────

export type TicketType = {
  id:        string;
  name:      string;
  price:     number;
  available: number;
  sold:      number;
};

export type Event = {
  id:          string;
  sessions?: EventSession[];
  selectedSessionId?: string;
  schemaVersion?: number;
  title:       string;
  description: string;
  descriptionFormat?: DescriptionFormat;
  youtubeUrls?: YouTubeUrls;
  category:    string;
  date:        string;
  startTime:   string;
  endTime:     string;
  location:    string;
  locationUrl: string;
  image:       string;
  gallery:     string[];
  ticketTypes: TicketType[];
  createdAt?:  Timestamp;
};

export type Booking = {
  id?:         string;
  eventId:     string;
  sessionId?: string;
  sessionDate?: string;
  sessionStartTime?: string;
  sessionEndTime?: string;
  status?: "pending" | "confirmed" | "cancelled" | "refund_required" | "refunded";
  eventTitle:  string;
  name:        string;
  email:       string;
  phone:       string;
  ticketType:  string;
  quantity:    number;
  amount:      number;
  paymentMethod?: string;
  paymentId?:  string;
  bookedAt?:   Timestamp;
};

export function withSessions(event: Event): Event {
  const sessions = legacySessions(event);
  const next = sessions.filter(s => sessionAvailable(s)).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  return { ...event, sessions, ...(next ? { date: next.date, startTime: next.startTime, endTime: next.endTime } : {}) };
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<Event[]> {
  const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => withSessions({ ...d.data(), ...eventMediaDefaults(d.data()), id: d.id } as Event));
}

export async function getEvent(id: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, "events", id));
  if (!snap.exists()) return null;
  return withSessions({ ...snap.data(), ...eventMediaDefaults(snap.data()), id: snap.id } as Event);
}

function signedIn() {
  if (!auth.currentUser) throw new Error("Administrator sign-in required.");
}
function eventPayload(data: Omit<Event, "id" | "createdAt">, previous: EventSession[] = []) {
  validateSessions(data.sessions ?? [], previous);
  if (!data.ticketTypes.length || data.ticketTypes.some(t => !t.name.trim() || !Number.isInteger(t.available) || t.available < 1 || !Number.isFinite(t.price) || t.price < 0)) throw new Error("Enter valid ticket names, quantities and prices.");
  for (const session of previous) for (const [id, sold] of Object.entries(session.sold)) {
    const ticket = data.ticketTypes.find(t => t.id === id);
    if (sold > 0 && (!ticket || ticket.available < sold)) throw new Error("Cannot remove a booked ticket or reduce capacity below seats sold.");
  }
  const sessions = data.sessions!.map(s => {
    const old = previous.find(p => p.id === s.id);
    return old?.status === "cancelled" ? old : { ...s, sold: old?.sold ?? {} };
  });
  return { ...data, ...eventMediaDefaults(data),
    description: data.descriptionFormat === "html" ? sanitizeDescription(data.description) : data.description,
    sessions, schemaVersion: 2,
    ticketTypes: data.ticketTypes.map(t => ({ ...t, sold: previous.reduce((n,s) => n + (s.sold[t.id] ?? 0),0) })),
  };
}
export async function createEvent(data: Omit<Event, "id" | "createdAt">): Promise<string> {
  signedIn();
  return (await addDoc(collection(db, "events"), { ...eventPayload(data), createdAt: serverTimestamp() })).id;
}
export async function updateEvent(id: string, data: Omit<Event, "id" | "createdAt">): Promise<void> {
  signedIn();
  await runTransaction(db, async tx => {
    const ref = doc(db, "events", id); const current = await tx.get(ref);
    if (!current.exists()) throw new Error("Event not found.");
    tx.update(ref, eventPayload(data, legacySessions(current.data() as Event)));
  });
}
export async function deleteEvent(id: string): Promise<void> {
  signedIn();
  const bookings = await getEventBookings(id);
  if (bookings.length) throw new Error("Events with bookings cannot be deleted. Cancel dates to preserve booking history.");
  await runTransaction(db, async tx => {
    const ref = doc(db, "events", id); const current = await tx.get(ref);
    if (!current.exists()) return;
    if (legacySessions(current.data() as Event).some(s => s.status === "cancelled" || Object.values(s.sold).some(n => n > 0))) throw new Error("Events with bookings or cancelled history cannot be deleted.");
    tx.delete(ref);
  });
}
export async function cancelEventSession(eventId: string, sessionId: string, reason: string): Promise<void> {
  signedIn();
  if (!reason.trim()) throw new Error("Enter a cancellation reason.");
  await runTransaction(db, async tx => {
    const ref = doc(db, "events", eventId); const current = await tx.get(ref);
    if (!current.exists()) throw new Error("Event not found.");
    const sessions = legacySessions(current.data() as Event);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error("Date not found.");
    if (session.status === "cancelled") return;
    if (!sessionAvailable(session)) throw new Error("Started dates cannot be cancelled.");
    tx.update(ref, { schemaVersion: 2, sessions: sessions.map(s => s.id === sessionId ? { ...s, status: "cancelled", cancelledAt: new Date().toISOString(), cancellationReason: reason.trim() } : s) });
  });
}

/** Original payment-first flow; seats and booking are saved atomically after verification. */
export async function createBooking(data: Omit<Booking, "id" | "bookedAt"> & { ticketTypeId: string }): Promise<string> {
  const ref = doc(collection(db, "bookings"));
  await runTransaction(db, async tx => {
    const eventRef = doc(db, "events", data.eventId); const current = await tx.get(eventRef);
    if (!current.exists()) throw new Error("EVENT_NOT_FOUND");
    const event = current.data() as Event;
    const sessions = legacySessions(event);
    const session = sessions.find(s => s.id === (data.sessionId ?? "legacy"));
    if (!session || !sessionAvailable(session)) throw new Error("This date is no longer available.");
    const ticket = event.ticketTypes.find(t => t.id === data.ticketTypeId);
    if (!ticket) throw new Error("TICKET_NOT_FOUND");
    if (!Number.isInteger(data.quantity) || data.quantity < 1 || data.quantity > 10) throw new Error("Invalid quantity.");
    if ((session.sold[ticket.id] ?? 0) + data.quantity > ticket.available) throw new Error("SOLD_OUT");
    tx.update(eventRef, { schemaVersion: 2,
      sessions: sessions.map(s => s.id === session.id ? { ...s, sold: { ...s.sold, [ticket.id]: (s.sold[ticket.id] ?? 0) + data.quantity } } : s),
      ticketTypes: event.ticketTypes.map(t => t.id === ticket.id ? { ...t, sold: t.sold + data.quantity } : t),
    });
    tx.set(ref, { ...data, sessionId: session.id, sessionDate: session.date, sessionStartTime: session.startTime, sessionEndTime: session.endTime, status: "confirmed", bookedAt: serverTimestamp() });
  });
  return ref.id;
}

export async function getBookings(): Promise<Booking[]> {
  const q = query(collection(db, "bookings"), orderBy("bookedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)).filter(b => b.status !== "pending");
}

export async function getEventBookings(eventId: string): Promise<Booking[]> {
  const q = query(collection(db, "bookings"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Booking))
    .filter(b => b.status !== "pending")
    .sort((a, b) => (b.bookedAt?.toMillis() ?? 0) - (a.bookedAt?.toMillis() ?? 0));
}
