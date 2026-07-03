import {
  collection, doc, getDocs, getDoc, addDoc, deleteDoc, updateDoc,
  query, orderBy, serverTimestamp, Timestamp,
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
  await deleteDoc(doc(db, "events", id));
}

export async function updateEvent(id: string, data: Omit<Event, "id" | "createdAt">): Promise<void> {
  await updateDoc(doc(db, "events", id), { ...data });
}

// ── Bookings ─────────────────────────────────────────────────────────────────

export async function createBooking(data: Omit<Booking, "id" | "bookedAt"> & { ticketTypeId: string }): Promise<string> {
  const ref = await addDoc(collection(db, "bookings"), {
    ...data,
    bookedAt: serverTimestamp(),
  });

  // Increment sold count — match by id first, fall back to name
  const eventSnap = await getDoc(doc(db, "events", data.eventId));
  if (eventSnap.exists()) {
    const eventData = eventSnap.data() as Event;
    const updatedTickets = eventData.ticketTypes.map(t => {
      const match = t.id === data.ticketTypeId || t.name === data.ticketType;
      return match ? { ...t, sold: t.sold + data.quantity } : t;
    });
    await updateDoc(doc(db, "events", data.eventId), { ticketTypes: updatedTickets });
  }

  return ref.id;
}

export async function getBookings(): Promise<Booking[]> {
  const q = query(collection(db, "bookings"), orderBy("bookedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
}

export async function getEventBookings(eventId: string): Promise<Booking[]> {
  const all = await getBookings();
  return all.filter(b => b.eventId === eventId);
}
