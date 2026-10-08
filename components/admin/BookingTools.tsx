"use client";
import { Fragment, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  addBookingNote, cancelBooking, createBooking, markConfirmationEmailSent, markRefunded,
  type Booking, type Event,
} from "@/lib/firestore";
import { sendConfirmationEmail } from "@/lib/email";
import { amountMismatch, downloadCsv, formatDateShort, formatTime12, maxQuantity, rupees, upcomingSessions } from "@/lib/booking-logic";
import { BookingStatusBadge, BOOKING_STATUS_LABEL, Badge, Button, C, Field, inputStyle } from "./ui";

export function exportBookingsCsv(filename: string, bookings: Booking[]) {
  downloadCsv(filename, [
    ["Booking ID", "Status", "Event", "Date", "Time", "Name", "Email", "Phone", "Ticket", "Qty", "Amount", "Payment", "Payment ID", "Booked at"],
    ...bookings.map(b => [b.id, BOOKING_STATUS_LABEL[b.status], b.eventTitle, b.sessionDate, `${b.sessionStartTime}-${b.sessionEndTime}`, b.name, b.email, b.phone, b.ticketType, b.quantity, b.amount, b.paymentMethod, b.paymentId, b.bookedAt?.toDate().toISOString()]),
  ]);
}

function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(15,51,43,.5)", zIndex: 120 }} />
        <Dialog.Content style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 121, width: `min(${wide ? 640 : 480}px, calc(100vw - 24px))`, maxHeight: "90vh", overflowY: "auto", background: C.cream, borderRadius: 18, padding: 22, fontFamily: "Poppins, sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Dialog.Title style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{title}</Dialog.Title>
            <Dialog.Close aria-label="Close"><X size={18} /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Row-level actions and history for one booking. */
export function BookingDetailDialog({ booking, event, onClose, onChanged }: { booking: Booking | null; event?: Event | null; onClose: () => void; onChanged: (msg: string) => void }) {
  const [mode, setMode] = useState<"view" | "cancel" | "refund">("view");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!booking) return null;
  const b = booking;

  async function act(fn: () => Promise<void>, msg: string) {
    setBusy(true); setError("");
    try { await fn(); onChanged(msg); setMode("view"); setNote(""); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const resend = () => act(async () => {
    await sendConfirmationEmail({ bookingId: b.id!, name: b.name, email: b.email, phone: b.phone, eventTitle: b.eventTitle, date: b.sessionDate, startTime: b.sessionStartTime, endTime: b.sessionEndTime, venue: b.venue ?? event?.location ?? "", ticketType: b.ticketType, quantity: b.quantity, amount: b.amount });
    if (!b.confirmationEmailSentAt) await markConfirmationEmailSent(b.id!);
    await addBookingNote(b.id!, "email_resent");
  }, "Confirmation email sent.");

  const rows: [string, React.ReactNode][] = [
    ["Booking ID", <code key="id" style={{ fontSize: 12 }}>{b.id}</code>],
    ["Event", b.eventTitle],
    ["Date", `${formatDateShort(b.sessionDate)} · ${formatTime12(b.sessionStartTime)}–${formatTime12(b.sessionEndTime)}`],
    ["Name", b.name], ["Email", <a key="e" href={`mailto:${b.email}`}>{b.email}</a>], ["Phone", <a key="p" href={`tel:${b.phone}`}>{b.phone}</a>],
    ["Ticket", `${b.ticketType} × ${b.quantity}`],
    ["Amount", <span key="a">{rupees(b.amount)} {amountMismatch(b, event) && <Badge tone="bad">Below ticket price</Badge>}</span>],
    ["Payment", `${b.paymentMethod}${b.paymentId ? ` · ${b.paymentId}` : ""}`],
    ["Email sent", b.confirmationEmailSentAt ? new Date(b.confirmationEmailSentAt).toLocaleString("en-IN") : "Not sent"],
    ...(b.failureReason ? [["Problem", b.failureReason] as [string, React.ReactNode]] : []),
    ...(b.cancellationReason ? [["Cancel reason", b.cancellationReason] as [string, React.ReactNode]] : []),
  ];

  return (
    <Modal open onClose={onClose} title="Booking" wide>
      <div style={{ marginBottom: 12 }}><BookingStatusBadge status={b.status} /></div>
      <dl style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px 12px", fontSize: 13, color: C.ink }}>
        {rows.map(([k, v]) => <Fragment key={k}><dt style={{ opacity: 0.6 }}>{k}</dt><dd style={{ fontWeight: 500, wordBreak: "break-word" }}>{v}</dd></Fragment>)}
      </dl>

      {!!b.history?.length && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>History</p>
          <ul style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            {b.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString("en-IN")} · {h.action.replace(/_/g, " ")} · {h.by}{h.note ? ` — ${h.note}` : ""}</li>)}
          </ul>
        </div>
      )}

      {mode !== "view" && (
        <div style={{ marginTop: 16 }}>
          <Field label={mode === "cancel" ? "Reason for cancelling" : "Refund reference / note"} required={mode === "cancel"}>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} style={inputStyle()} />
          </Field>
          {mode === "cancel" && <p style={{ fontSize: 12, marginTop: 6 }}>Seats go back on sale. {b.amount > 0 ? "The booking moves to Refund needed." : ""}</p>}
        </div>
      )}
      {error && <p role="alert" style={{ color: C.clay, fontSize: 12, marginTop: 10 }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 18 }}>
        {mode === "view" ? (
          <>
            {b.status === "confirmed" && <Button variant="secondary" disabled={busy} onClick={resend}>{busy ? "Sending…" : "Resend email"}</Button>}
            {b.status === "confirmed" && <Button variant="danger" onClick={() => setMode("cancel")}>Cancel booking</Button>}
            {b.status === "refund_required" && <Button onClick={() => setMode("refund")}>Mark refunded</Button>}
          </>
        ) : (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => { setMode("view"); setNote(""); }}>Back</Button>
            {mode === "cancel"
              ? <Button variant="danger" disabled={busy || !note.trim()} onClick={() => act(() => cancelBooking(b.id!, note), "Booking cancelled.")}>{busy ? "Working…" : "Confirm cancel"}</Button>
              : <Button disabled={busy} onClick={() => act(() => markRefunded(b.id!, note), "Marked as refunded.")}>{busy ? "Working…" : "Confirm refund"}</Button>}
          </>
        )}
      </div>
    </Modal>
  );
}

/** Admin-created booking (cash, bank transfer, complimentary). Takes seats like a website booking. */
export function ManualBookingDialog({ open, events, defaultEventId, onClose, onCreated }: { open: boolean; events: Event[]; defaultEventId?: string; onClose: () => void; onCreated: (msg: string) => void }) {
  const bookable = events.filter(e => e.status !== "archived" && upcomingSessions(e).length);
  const [f, setF] = useState({ eventId: defaultEventId ?? "", sessionId: "", ticketTypeId: "", quantity: "1", name: "", email: "", phone: "", amount: "", sendEmail: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const event = bookable.find(e => e.id === f.eventId);
  const sessions = event ? upcomingSessions(event) : [];
  const session = sessions.find(s => s.id === f.sessionId);
  const ticket = event?.ticketTypes.find(t => t.id === f.ticketTypeId);
  const max = ticket && session ? maxQuantity(ticket, session) : 10;

  async function submit() {
    setError("");
    if (!event || !session || !ticket) return setError("Choose event, date and ticket.");
    if (!f.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) return setError("Enter name and a valid email.");
    const quantity = Number(f.quantity);
    const amount = f.amount === "" ? ticket.price * quantity : Number(f.amount);
    setBusy(true);
    try {
      const { id, booking } = await createBooking({ eventId: event.id, sessionId: session.id, ticketTypeId: ticket.id, quantity, name: f.name, email: f.email, phone: f.phone, paymentMethod: "offline", amount, source: "admin" });
      if (f.sendEmail) {
        await sendConfirmationEmail({ bookingId: id, name: booking.name, email: booking.email, phone: booking.phone, eventTitle: event.title, date: session.date, startTime: session.startTime, endTime: session.endTime, venue: event.location, ticketType: ticket.name, quantity, amount })
          .then(() => markConfirmationEmailSent(id)).catch(() => {});
      }
      onCreated("Booking added.");
      setF(p => ({ ...p, name: "", email: "", phone: "", amount: "", quantity: "1" }));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add booking manually" wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Field label="Event" required>
          <select value={f.eventId} onChange={e => setF({ ...f, eventId: e.target.value, sessionId: "", ticketTypeId: "" })} style={inputStyle()}>
            <option value="">Choose…</option>{bookable.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select></Field></div>
        <Field label="Date" required>
          <select value={f.sessionId} onChange={e => setF({ ...f, sessionId: e.target.value })} style={inputStyle()} disabled={!event}>
            <option value="">Choose…</option>{sessions.map(s => <option key={s.id} value={s.id}>{formatDateShort(s.date)} · {formatTime12(s.startTime)}</option>)}
          </select></Field>
        <Field label="Ticket" required>
          <select value={f.ticketTypeId} onChange={e => setF({ ...f, ticketTypeId: e.target.value })} style={inputStyle()} disabled={!event}>
            <option value="">Choose…</option>{event?.ticketTypes.map(t => <option key={t.id} value={t.id}>{t.name} · {rupees(t.price)}{session ? ` · ${maxQuantity(t, session)} left` : ""}</option>)}
          </select></Field>
        <Field label="Quantity" required><input type="number" min={1} max={max} value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} style={inputStyle()} /></Field>
        <Field label="Amount received (₹)" hint={ticket ? `Default ${rupees(ticket.price * Number(f.quantity || 0))}` : undefined}><input type="number" min={0} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} style={inputStyle()} /></Field>
        <Field label="Name" required><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} style={inputStyle()} /></Field>
        <Field label="Email" required><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} style={inputStyle()} /></Field>
        <Field label="Phone"><input type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} style={inputStyle()} /></Field>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, alignSelf: "end" }}><input type="checkbox" checked={f.sendEmail} onChange={e => setF({ ...f, sendEmail: e.target.checked })} /> Send confirmation email</label>
      </div>
      {error && <p role="alert" style={{ color: C.clay, fontSize: 12, marginTop: 10 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button disabled={busy} onClick={submit}>{busy ? "Saving…" : "Add booking"}</Button>
      </div>
    </Modal>
  );
}
