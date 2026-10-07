import { legacySessions, sessionAvailable, type EventSession } from "./event-sessions";
import {
  collection, doc, getDocs, getDoc,
  query, orderBy, where, Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { eventMediaDefaults, type DescriptionFormat, type YouTubeUrls } from "./event-content";

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

async function adminAction(body: unknown): Promise<{id: string}> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Administrator sign-in required.");
  const response = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not update event.");
  return result;
}
export async function createEvent(data: Omit<Event, "id" | "createdAt">): Promise<string> {
  return (await adminAction({ action: "create", data })).id;
}
export async function updateEvent(id: string, data: Omit<Event, "id" | "createdAt">): Promise<void> {
  await adminAction({ action: "update", id, data });
}
export async function deleteEvent(id: string): Promise<void> {
  await adminAction({ action: "delete", id });
}
export async function cancelEventSession(eventId: string, sessionId: string, reason: string): Promise<void> {
  await adminAction({ action: "cancel", id: eventId, sessionId, reason });
}

// ── Bookings ─────────────────────────────────────────────────────────────────

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
