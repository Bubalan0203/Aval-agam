"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ArrowLeft, CalendarX, Copy, Download, Edit2, ExternalLink, ImageOff, MapPin, MoreHorizontal, Send, Trash2, Undo2, Users } from "lucide-react";
import {
  cancelEventSession, deleteEvent, duplicateEvent, getEvent, getEventBookings, getEvents, setEventStatus,
  type Booking, type Event, type EventStatus,
} from "@/lib/firestore";
import { sendCancellationEmails } from "@/lib/cancellation-email";
import { sessionAvailable, sessionStart, type EventSession } from "@/lib/event-sessions";
import { formatDateLong, formatTime12, rupees, sessionCapacity, sessionSold } from "@/lib/booking-logic";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { exportBookingsCsv } from "@/components/admin/BookingTools";
import { Badge, Button, C, Card, ConfirmDialog, Empty, EventStatusBadge, Field, PageHeader, PageSkeleton, StatCard, inputStyle, useToast } from "@/components/admin/ui";

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { setToast, toastNode } = useToast();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  const [events, setEvents] = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<null | "delete">(null);
  const [typed, setTyped] = useState("");
  const [cancelling, setCancelling] = useState<EventSession | null>(null);
  const [reason, setReason] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(() => {
    Promise.all([getEvent(id), getEventBookings(id), getEvents()]).then(([e, b, all]) => { setEvent(e); setBookings(b); setEvents(all); })
      .catch(() => setEvent(null));
  }, [id]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try { const r = await fn(); setToast({ type: "success", msg: typeof r === "string" ? r : msg }); load(); return true; }
    catch (e) { setToast({ type: "error", msg: (e as Error).message }); return false; }
    finally { setBusy(false); }
  }

  if (event === undefined) return <PageSkeleton />;
  if (!event) return <Card><Empty action={<Link href="/admin/events"><Button variant="secondary">Back to events</Button></Link>}>This event doesn&rsquo;t exist or was deleted.</Empty></Card>;

  const cap = sessionCapacity(event);
  const confirmed = bookings.filter(b => b.status === "confirmed");
  const refundsDue = bookings.filter(b => b.status === "refund_required");
  const sessions = [...event.sessions].sort((a, b) => sessionStart(a) - sessionStart(b));
  const upcoming = sessions.filter(s => sessionAvailable(s));
  const past = sessions.filter(s => !sessionAvailable(s));
  const shownSessions = showPast ? sessions : upcoming;
  const affected = cancelling ? confirmed.filter(b => b.sessionId === cancelling.id) : [];
  const setStatus = (s: EventStatus, msg: string) => run(() => setEventStatus(event.id, s), msg);

  const menuItem = (label: string, Icon: typeof Copy, onSelect: () => void, danger?: boolean, disabled?: boolean) => (
    <Menu.Item disabled={disabled} onSelect={onSelect} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", fontSize: 14, borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", color: danger ? C.red : C.text, opacity: disabled ? 0.45 : 1, outline: "none" }} className="admin-row">
      <Icon size={16} /> {label}
    </Menu.Item>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title={event.title || "Untitled event"} badge={<EventStatusBadge status={event.status} />}
        subtitle={[event.category, event.location].filter(Boolean).join(" · ")}
        back={<Link href="/admin/events" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: C.ink }}><ArrowLeft size={16} /> Events</Link>}
        actions={<>
          {event.status === "draft" && <Button disabled={busy} onClick={() => setStatus("published", "Published — it's now live on the website.")}><Send size={16} /> Publish</Button>}
          <Link href={`/admin/events/${event.id}/edit`}><Button variant={event.status === "draft" ? "secondary" : "primary"}><Edit2 size={16} /> Edit</Button></Link>
          <a href={`/events/${event.id}${event.status === "published" ? "" : "?preview=1"}`} target="_blank" rel="noopener noreferrer"><Button variant="secondary"><ExternalLink size={16} /> {event.status === "published" ? "View" : "Preview"}</Button></a>
          <Menu.Root>
            <Menu.Trigger asChild><Button variant="secondary" aria-label="More actions"><MoreHorizontal size={16} /></Button></Menu.Trigger>
            <Menu.Portal>
              <Menu.Content align="end" sideOffset={6} className="admin-root" style={{ background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 10, padding: 6, minWidth: 220, boxShadow: "0 12px 16px -4px rgba(16,24,40,.08)", zIndex: 100 }}>
                {event.status === "published" && menuItem("Unpublish (hide from site)", Undo2, () => setStatus("draft", "Unpublished — hidden from the website."))}
                {menuItem("Duplicate as draft", Copy, () => run(async () => { const nid = await duplicateEvent(event.id); router.push(`/admin/events/${nid}/edit`); }, "Copied — add dates and publish when ready."))}
                {event.status === "archived" && menuItem("Restore as draft", Undo2, () => setStatus("draft", "Restored as a draft."))}
                <Menu.Separator style={{ height: 1, background: C.sand, margin: "6px 0" }} />
                {menuItem("Delete event", Trash2, () => { setTyped(""); setDialog("delete"); }, true)}
              </Menu.Content>
            </Menu.Portal>
          </Menu.Root>
        </>} />

      {event.status === "published" && upcoming.length === 0 && (
        <div style={{ padding: 14, borderRadius: 10, border: "1px solid #FEDF89", background: C.goldSoft, color: C.gold, fontSize: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          This event is live but has no upcoming dates, so nobody can book it.
          <Link href={`/admin/events/${event.id}/edit#dates`}><Button variant="secondary">Add dates</Button></Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.sand}`, background: "#F2F4F7", aspectRatio: "16/10", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
          {event.image ? <img src={event.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontSize: 13 }}><ImageOff size={22} /> No cover image</span>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Confirmed bookings" value={confirmed.length} hint={`${confirmed.reduce((n, b) => n + b.quantity, 0)} seats`} />
          <StatCard label="Revenue" value={rupees(confirmed.reduce((n, b) => n + b.amount, 0))} />
          <StatCard label="Upcoming dates" value={upcoming.length} hint={upcoming[0] ? `Next: ${formatDateLong(upcoming[0].date)}` : "None scheduled"} />
          <StatCard label="Refunds needed" value={refundsDue.length} tone={refundsDue.length ? "bad" : undefined} hint={refundsDue.length ? rupees(refundsDue.reduce((n, b) => n + b.amount, 0)) : "All clear"} />
        </div>
      </div>

      <Card title="Dates" subtitle={`${event.ticketTypes.map(t => `${t.name} ${rupees(t.price)} · ${t.available} seats`).join("  ·  ")} per date`} padded={false}
        action={<div style={{ display: "flex", gap: 8 }}>
          {past.length > 0 && <Button variant="secondary" onClick={() => setShowPast(v => !v)}>{showPast ? "Hide past" : `Show past (${past.length})`}</Button>}
          <Link href={`/admin/events/${event.id}/edit#dates`}><Button variant="secondary">Add / edit dates</Button></Link>
        </div>}>
        {shownSessions.length === 0 ? <Empty icon={<CalendarX size={22} />}>No upcoming dates.</Empty> : shownSessions.map(s => {
          const sold = sessionSold(s);
          const att = confirmed.filter(b => b.sessionId === s.id);
          const all = bookings.filter(b => b.sessionId === s.id);
          const cancelled = s.status === "cancelled";
          const live = sessionAvailable(s);
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "minmax(200px,1.4fr) minmax(140px,1fr) auto", gap: 16, alignItems: "center", padding: "14px 20px", borderTop: `1px solid ${C.sand}`, opacity: !live && !cancelled ? 0.7 : 1 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{formatDateLong(s.date)}</p>
                <p style={{ fontSize: 13, color: C.ink }}>{formatTime12(s.startTime)} – {formatTime12(s.endTime)} IST</p>
                {cancelled && s.cancellationReason && <p style={{ fontSize: 13, color: C.red, marginTop: 2 }}>Cancelled: {s.cancellationReason}</p>}
              </div>
              <div>
                {cancelled ? <p style={{ fontSize: 13, color: C.ink }}>{all.length} booking{all.length === 1 ? "" : "s"} affected</p> : <>
                  <div style={{ height: 6, background: C.sand, borderRadius: 999 }}><div style={{ width: `${cap ? Math.min(100, sold / cap * 100) : 0}%`, height: "100%", background: sold >= cap ? C.clay : C.green, borderRadius: 999 }} /></div>
                  <p style={{ fontSize: 12, color: C.ink, marginTop: 4 }}>{sold} of {cap} booked{event.ticketTypes.length > 1 ? ` · ${event.ticketTypes.map(t => `${t.name} ${s.sold[t.id] ?? 0}/${t.available}`).join(", ")}` : ""}</p>
                </>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                {cancelled ? <Badge tone="bad">Cancelled</Badge> : !live ? <Badge>Completed</Badge> : sold >= cap ? <Badge tone="bad">Sold out</Badge> : <Badge tone="good" dot>Open</Badge>}
                <Button variant="secondary" size="sm" disabled={!all.length} onClick={() => { setSessionFilter(s.id); document.getElementById("event-bookings")?.scrollIntoView({ behavior: "smooth" }); }}><Users size={14} /> {all.length}</Button>
                <Button variant="secondary" size="sm" aria-label="Download attendee list" disabled={!att.length} onClick={() => exportBookingsCsv(`attendees-${event.title.slice(0, 30)}-${s.date}.csv`, att)}><Download size={14} /></Button>
                {live && <Button variant="danger" size="sm" onClick={() => { setCancelling(s); setReason(""); }}>Cancel date</Button>}
              </div>
            </div>
          );
        })}
        {bookings.some(b => b.status === "refund_required" || b.status === "cancelled") && event.sessions.some(s => s.status === "cancelled") && (
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.sand}`, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(async () => { const r = await sendCancellationEmails(event.id); return `${r.sent} cancellation emails sent${r.failed ? `, ${r.failed} failed` : ""}.`; }, "Done.")}>Resend unsent cancellation emails</Button>
          </div>
        )}
      </Card>

      <div id="event-bookings" style={{ scrollMarginTop: 24 }}>
        <BookingsTable bookings={bookings} events={events} fixedEventId={event.id} sessionFilter={sessionFilter} onSessionFilter={setSessionFilter}
          onChanged={msg => { setToast({ type: "success", msg }); load(); }} />
      </div>

      {event.location && event.locationUrl && <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.ink, display: "inline-flex", gap: 6, alignItems: "center" }}><MapPin size={14} /> Venue map</a>}

      <ConfirmDialog open={!!cancelling} danger busy={busy} confirmLabel="Cancel date" confirmDisabled={!reason.trim()}
        title={cancelling ? `Cancel ${formatDateLong(cancelling.date)}?` : ""}
        message={<>This can&rsquo;t be undone. {affected.length ? <><strong>{affected.length} booking{affected.length === 1 ? "" : "s"}</strong> ({affected.reduce((n, b) => n + b.quantity, 0)} seats) will get a cancellation email{affected.some(b => b.amount > 0) ? <> and paid ones move to <strong>Refund needed</strong> ({rupees(affected.reduce((n, b) => n + b.amount, 0))})</> : null}.</> : "No one has booked this date yet."}</>}
        onCancel={() => setCancelling(null)}
        onConfirm={async () => {
          const c = cancelling!;
          await run(async () => {
            await cancelEventSession(event.id, c.id, reason);
            if (!affected.length) return "Date cancelled.";
            const r = await sendCancellationEmails(event.id);
            return `Date cancelled. ${r.sent} email${r.sent === 1 ? "" : "s"} sent${r.failed ? `, ${r.failed} failed — use "Resend" below` : ""}.`;
          }, "Date cancelled.");
          setCancelling(null);
        }}>
        <Field label="Reason (shown to customers)" required><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} style={inputStyle()} placeholder="e.g. The facilitator is unwell. We're sorry for the inconvenience." /></Field>
      </ConfirmDialog>

      <ConfirmDialog open={dialog === "delete"} danger busy={busy} confirmLabel="Delete forever" title="Delete this event?"
        confirmDisabled={bookings.length > 0 && typed.trim().toUpperCase() !== "DELETE"}
        message={bookings.length ? <>This permanently deletes the event <strong>and its {bookings.length} booking{bookings.length === 1 ? "" : "s"}</strong>. Customers are not notified. This can&rsquo;t be undone.</> : "This permanently deletes the event. It can't be undone."}
        onCancel={() => setDialog(null)} onConfirm={() => run(async () => { await deleteEvent(event.id); router.push("/admin/events"); }, "Event deleted.")}>
        {bookings.length > 0 && <Field label='Type DELETE to confirm'><input value={typed} onChange={e => setTyped(e.target.value)} style={inputStyle()} autoComplete="off" /></Field>}
      </ConfirmDialog>
      {toastNode}
    </div>
  );
}
