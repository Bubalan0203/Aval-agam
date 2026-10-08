"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Archive, ArrowLeft, Copy, Download, Edit2, Eye, Send, Trash2, Undo2 } from "lucide-react";
import {
  cancelEventSession, deleteEvent, duplicateEvent, getEvent, getEventBookings, getEvents, setEventStatus,
  type Booking, type Event, type EventStatus,
} from "@/lib/firestore";
import { sendCancellationEmails } from "@/lib/cancellation-email";
import { sessionAvailable, sessionStart, type EventSession } from "@/lib/event-sessions";
import { formatDateShort, formatTime12, rupees, sessionCapacity, sessionSold } from "@/lib/booking-logic";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { exportBookingsCsv } from "@/components/admin/BookingTools";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Badge, Button, C, Card, Empty, EventStatusBadge, Field, inputStyle, useToast } from "@/components/admin/ui";

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { setToast, toastNode } = useToast();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancelling, setCancelling] = useState<EventSession | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    Promise.all([getEvent(id), getEventBookings(id), getEvents()]).then(([e, b, all]) => { setEvent(e); setBookings(b); setEvents(all); })
      .catch(() => setEvent(null));
  }, [id]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try { const r = await fn(); setToast({ type: "success", msg: typeof r === "string" ? r : msg }); load(); }
    catch (e) { setToast({ type: "error", msg: (e as Error).message }); }
    finally { setBusy(false); }
  }

  if (event === undefined) return <Empty>Loading…</Empty>;
  if (!event) return <Empty>Event not found.</Empty>;

  const cap = sessionCapacity(event);
  const confirmed = bookings.filter(b => b.status === "confirmed");
  const revenue = confirmed.reduce((n, b) => n + b.amount, 0);
  const refundsDue = bookings.filter(b => b.status === "refund_required").length;
  const sessions = [...event.sessions].sort((a, b) => sessionStart(a) - sessionStart(b));
  const affected = cancelling ? confirmed.filter(b => b.sessionId === cancelling.id) : [];
  const status = (s: EventStatus, msg: string) => run(() => setEventStatus(event.id, s), msg);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/events"><Button variant="secondary"><ArrowLeft size={14} /> Events</Button></Link>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: C.green }}>{event.title}</h1>
          <EventStatusBadge status={event.status} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/admin/events/${event.id}/edit`}><Button variant="secondary"><Edit2 size={14} /> Edit</Button></Link>
          <Link href={`/events/${event.id}?preview=1`} target="_blank"><Button variant="secondary"><Eye size={14} /> View</Button></Link>
          {event.status === "draft" && <Button disabled={busy} onClick={() => status("published", "Published.")}><Send size={14} /> Publish</Button>}
          {event.status === "published" && <Button variant="secondary" disabled={busy} onClick={() => status("draft", "Moved to drafts — hidden from the site.")}><Undo2 size={14} /> Unpublish</Button>}
          {event.status !== "archived" ? <Button variant="secondary" disabled={busy} onClick={() => status("archived", "Archived.")}><Archive size={14} /> Archive</Button>
            : <Button variant="secondary" disabled={busy} onClick={() => status("draft", "Restored as draft.")}><Undo2 size={14} /> Restore</Button>}
          <Button variant="secondary" disabled={busy} onClick={() => run(async () => { const nid = await duplicateEvent(event.id); router.push(`/admin/events/${nid}/edit`); }, "Copied as a draft.")}><Copy size={14} /> Duplicate</Button>
          <Button variant="danger" disabled={busy || bookings.length > 0} title={bookings.length ? "Has bookings — archive instead" : undefined} onClick={() => setConfirmDelete(true)}><Trash2 size={14} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Confirmed bookings", confirmed.length], ["Seats sold", confirmed.reduce((n, b) => n + b.quantity, 0)], ["Revenue", rupees(revenue)], ["Refunds needed", refundsDue]].map(([k, v]) => (
          <div key={k as string} style={{ background: C.cream, borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 12, opacity: 0.6 }}>{k}</p>
            <p style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: k === "Refunds needed" && refundsDue ? C.clay : C.green }}>{v}</p>
          </div>
        ))}
      </div>

      <Card title="Dates" subtitle="Seats per date. Download the attendee list for each date, or cancel a date that hasn't started."
        action={<Button variant="secondary" disabled={busy} onClick={() => run(async () => { const r = await sendCancellationEmails(event.id); return `${r.sent} cancellation emails sent, ${r.failed} failed.`; }, "Done.")}>Retry cancellation emails</Button>}>
        {sessions.length === 0 ? <Empty>No dates yet. Edit the event to add some.</Empty> : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {sessions.map(s => {
              const sold = sessionSold(s);
              const att = confirmed.filter(b => b.sessionId === s.id);
              return (
                <div key={s.id} style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${C.sand}`, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 200 }}>
                    <p style={{ fontWeight: 600, color: C.green }}>{formatDateShort(s.date)} · {formatTime12(s.startTime)}–{formatTime12(s.endTime)}</p>
                    <p style={{ fontSize: 12, opacity: 0.7 }}>{event.ticketTypes.map(t => `${t.name}: ${s.sold[t.id] ?? 0}/${t.available}`).join(" · ")}</p>
                    {s.cancellationReason && <p style={{ fontSize: 12, color: C.clay }}>Reason: {s.cancellationReason}</p>}
                  </div>
                  <div style={{ flex: "1 1 160px", maxWidth: 240 }}>
                    <div style={{ height: 8, background: C.sand, borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${cap ? Math.min(100, (sold / cap) * 100) : 0}%`, height: "100%", background: sold >= cap ? C.clay : C.green }} /></div>
                    <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{sold}/{cap} seats</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {s.status === "cancelled" ? <Badge tone="warn">Cancelled</Badge> : sessionAvailable(s) ? (sold >= cap ? <Badge tone="warn">Sold out</Badge> : <Badge tone="good">Upcoming</Badge>) : <Badge>Completed</Badge>}
                    <Button variant="secondary" disabled={!att.length} onClick={() => exportBookingsCsv(`attendees-${s.date}-${s.startTime.replace(":", "")}.csv`, att)}><Download size={14} /> {att.length}</Button>
                    {sessionAvailable(s) && <Button variant="danger" onClick={() => { setCancelling(s); setReason(""); }}>Cancel date</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {cancelling && (
        <Card title={`Cancel ${formatDateShort(cancelling.date)} · ${formatTime12(cancelling.startTime)}?`} subtitle="This is permanent. Customers get a cancellation email; paid bookings move to Refund needed.">
          <p style={{ fontSize: 13, marginBottom: 10 }}>{affected.length} booking{affected.length === 1 ? "" : "s"} affected ({affected.reduce((n, b) => n + b.quantity, 0)} seats, {rupees(affected.reduce((n, b) => n + b.amount, 0))}).</p>
          {affected.length > 0 && <ul style={{ fontSize: 12, marginBottom: 12, maxHeight: 160, overflowY: "auto" }}>{affected.map(b => <li key={b.id}>{b.name} · {b.email} · {b.quantity} × {b.ticketType} · {rupees(b.amount)}</li>)}</ul>}
          <Field label="Reason (sent to customers)" required><textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} style={inputStyle()} /></Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <Button variant="secondary" disabled={busy} onClick={() => setCancelling(null)}>Keep date</Button>
            <Button variant="danger" disabled={busy || !reason.trim()} onClick={() => run(async () => {
              await cancelEventSession(event.id, cancelling.id, reason);
              setCancelling(null);
              const r = await sendCancellationEmails(event.id);
              return `Date cancelled. ${r.sent} emails sent, ${r.failed} failed.`;
            }, "Date cancelled.")}>{busy ? "Cancelling…" : "Cancel date permanently"}</Button>
          </div>
        </Card>
      )}

      <BookingsTable bookings={bookings} events={events} fixedEventId={event.id} onChanged={msg => { setToast({ type: "success", msg }); load(); }} />

      <ConfirmModal open={confirmDelete} title="Delete this event?" message="This can't be undone." requiredText={event.title} busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => run(async () => { await deleteEvent(event.id); router.push("/admin/events"); }, "Deleted.")} />
      {toastNode}
    </div>
  );
}
