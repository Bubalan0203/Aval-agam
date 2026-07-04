import {
  collection, doc, getDocs, getDoc, addDoc, deleteDoc, updateDoc,
  query, orderBy, where, serverTimestamp, Timestamp, runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";

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
  title:       string;
  description: string;
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
  eventTitle:  string;
  name:        string;
  email:       string;
  phone:       string;
  ticketType:  string;
  quantity:    number;
  amount:      number;
  paymentMethod?: string;
  bookedAt?:   Timestamp;
};

// ── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<Event[]> {
  const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Event));
}

export async function getEvent(id: string): Promise<Event | null> {
  const snap = await getDoc(doc(db, "events", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Event;
}

export async function createEvent(data: Omit<Event, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "events"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteEvent(id: string): Promise<void> {
  // Delete the event's bookings first so stats stay accurate
  const snap = await getDocs(query(collection(db, "bookings"), where("eventId", "==", id)));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "events", id));
}

export async function updateEvent(id: string, data: Omit<Event, "id" | "createdAt">): Promise<void> {
  await updateDoc(doc(db, "events", id), { ...data });
}

// ── Bookings ─────────────────────────────────────────────────────────────────

/**
 * Creates a booking atomically: re-reads the event inside a transaction,
 * verifies enough seats remain, increments `sold`, and saves the booking.
 * Throws Error("SOLD_OUT") if not enough seats are left.
 */
export async function createBooking(data: Omit<Booking, "id" | "bookedAt"> & { ticketTypeId: string }): Promise<string> {
  const bookingRef = doc(collection(db, "bookings"));
  const eventRef   = doc(db, "events", data.eventId);

  await runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists()) throw new Error("EVENT_NOT_FOUND");

    const eventData = eventSnap.data() as Event;
    const ticket = eventData.ticketTypes.find(
      t => t.id === data.ticketTypeId || t.name === data.ticketType
    );
    if (!ticket) throw new Error("TICKET_NOT_FOUND");
    if (ticket.sold + data.quantity > ticket.available) throw new Error("SOLD_OUT");

    const updatedTickets = eventData.ticketTypes.map(t =>
      t === ticket ? { ...t, sold: t.sold + data.quantity } : t
    );
    tx.update(eventRef, { ticketTypes: updatedTickets });
    tx.set(bookingRef, { ...data, bookedAt: serverTimestamp() });
  });

  return bookingRef.id;
}

export async function getBookings(): Promise<Booking[]> {
  const q = query(collection(db, "bookings"), orderBy("bookedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

export async function getEventBookings(eventId: string): Promise<Booking[]> {
  const q = query(collection(db, "bookings"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Booking))
    .sort((a, b) => (b.bookedAt?.toMillis() ?? 0) - (a.bookedAt?.toMillis() ?? 0));
}
