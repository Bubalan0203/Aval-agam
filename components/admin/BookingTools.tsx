"use client";
import { Fragment, useState } from "react";
import { Copy, Mail, Phone } from "lucide-react";
import {
  addBookingNote, cancelBooking, createBooking, deleteBooking, markConfirmationEmailSent, markRefunded,
  type Booking, type Event,
} from "@/lib/firestore";
import { sendBookingCancellationEmail, sendConfirmationEmail } from "@/lib/email";
import { amountMismatch, downloadCsv, formatDateLong, formatDateShort, formatTime12, maxQuantity, rupees, ticketRemaining, upcomingSessions } from "@/lib/booking-logic";
import { BookingStatusBadge, BOOKING_STATUS_LABEL, Badge, Button, C, ConfirmDialog, Drawer, Field, Select, inputStyle } from "./ui";

export function exportBookingsCsv(filename: string, bookings: Booking[]) {
  downloadCsv(filename, [
    ["Booking ID", "Status", "Event", "Date", "Time", "Name", "Email", "Phone", "Ticket", "Qty", "Amount", "Payment", "Payment ID", "Booked at"],
    ...bookings.map(b => [b.id, BOOKING_STATUS_LABEL[b.status], b.eventTitle, b.sessionDate, `${b.sessionStartTime}-${b.sessionEndTime}`, b.name, b.email, b.phone, b.ticketType, b.quantity, b.amount, b.paymentMethod, b.paymentId, b.bookedAt?.toDate().toISOString()]),
  ]);
}

const PAYMENT_LABEL: Record<string, string> = { razorpay: "Razorpay", free: "Free", offline: "Offline / cash" };

/** Slide-over with a booking's details, history and actions. */
export function BookingDetailDialog({ booking, event, onClose, onChanged }: { booking: Booking | null; event?: Event | null; onClose: () => void; onChanged: (msg: string) => void }) {
  const [confirm, setConfirm] = useState<"cancel" | "refund" | "delete" | null>(null);
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!booking) return null;
  const b = booking;

  async function act(fn: () => Promise<void>, msg: string) {
    setBusy(true); setError("");
    try { await fn(); setConfirm(null); setNote(""); onChanged(msg); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  const resend = () => act(async () => {
    await sendConfirmationEmail({ bookingId: b.id!, name: b.name, email: b.email, phone: b.phone, eventTitle: b.eventTitle, date: b.sessionDate, startTime: b.sessionStartTime, endTime: b.sessionEndTime, venue: b.venue ?? event?.location ?? "", ticketType: b.ticketType, quantity: b.quantity, amount: b.amount });
    if (!b.confirmationEmailSentAt) await markConfirmationEmailSent(b.id!);
    await addBookingNote(b.id!, "email_resent");
  }, `Confirmation sent to ${b.email}.`);

  const section = (title: string, rows: [string, React.ReactNode][]) => (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>{title}</p>
      <dl style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "10px 12px", fontSize: 14 }}>
        {rows.map(([k, v]) => <Fragment key={k}><dt style={{ color: C.ink }}>{k}</dt><dd style={{ fontWeight: 500, color: C.text, wordBreak: "break-word" }}>{v}</dd></Fragment>)}
      </dl>
    </div>
  );

  return (
    <>
      <Drawer open onClose={onClose} title={b.name} subtitle={<span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><BookingStatusBadge status={b.status} />{amountMismatch(b, event) && <Badge tone="bad">Paid below price</Badge>}</span>}
        footer={<>
          {b.status === "confirmed" && <Button variant="danger" disabled={busy} onClick={() => setConfirm("cancel")}>Cancel booking</Button>}
          {b.status === "confirmed" && <Button variant="secondary" disabled={busy} onClick={resend}><Mail size={16} /> {busy ? "Sending…" : b.confirmationEmailSentAt ? "Resend email" : "Send email"}</Button>}
          {b.status === "refund_required" && <Button disabled={busy} onClick={() => setConfirm("refund")}>Mark as refunded</Button>}
          <Button variant="ghost" disabled={busy} onClick={() => setConfirm("delete")} style={{ color: C.red, marginRight: "auto", order: -1 }}>Delete</Button>
        </>}>
        {b.failureReason && <p style={{ background: C.claySoft, color: C.red, borderRadius: 8, padding: "10px 12px", fontSize: 14, marginBottom: 20 }}>{b.failureReason}</p>}
        {error && <p role="alert" style={{ background: C.claySoft, color: C.red, borderRadius: 8, padding: "10px 12px", fontSize: 14, marginBottom: 20 }}>{error}</p>}
        {section("Customer", [
          ["Email", <a key="e" href={`mailto:${b.email}`} style={{ color: C.green }}>{b.email}</a>],
          ["Phone", b.phone ? <span key="p" style={{ display: "inline-flex", gap: 10 }}><a href={`tel:${b.phone}`} style={{ color: C.green }}>{b.phone}</a><a href={`https://wa.me/${b.phone.replace(/\D/g, "").replace(/^(?=\d{10}$)/, "91")}`} target="_blank" rel="noopener noreferrer" style={{ color: C.good, fontSize: 13 }}><Phone size={13} style={{ display: "inline" }} /> WhatsApp</a></span> : "—"],
        ])}
        {section("Booking", [
          ["Event", b.eventTitle],
          ["Date", `${formatDateLong(b.sessionDate)}`],
          ["Time", `${formatTime12(b.sessionStartTime)} – ${formatTime12(b.sessionEndTime)} IST`],
          ["Tickets", `${b.quantity} × ${b.ticketType}`],
          ["Booked", b.bookedAt ? b.bookedAt.toDate().toLocaleString("en-IN") : "—"],
          ["Booking ID", <span key="id" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><code style={{ fontSize: 13 }}>{b.id}</code><button aria-label="Copy booking ID" onClick={() => navigator.clipboard?.writeText(b.id!)} style={{ color: C.muted }}><Copy size={14} /></button></span>],
        ])}
        {section("Payment", [
          ["Amount", rupees(b.amount)],
          ["Method", PAYMENT_LABEL[b.paymentMethod] ?? b.paymentMethod],
          ...(b.paymentId ? [["Payment ID", <code key="pid" style={{ fontSize: 13 }}>{b.paymentId}</code>] as [string, React.ReactNode]] : []),
          ["Confirmation", b.confirmationEmailSentAt ? `Sent ${new Date(b.confirmationEmailSentAt).toLocaleString("en-IN")}` : <span key="ns" style={{ color: C.gold }}>Not sent</span>],
          ...(b.cancellationReason ? [["Cancel reason", b.cancellationReason] as [string, React.ReactNode]] : []),
        ])}
        {!!b.history?.length && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Activity</p>
            <ol style={{ display: "flex", flexDirection: "column", gap: 12, borderLeft: `2px solid ${C.sand}`, paddingLeft: 16 }}>
              {[...b.history].reverse().map((h, i) => (
                <li key={i} style={{ fontSize: 14 }}>
                  <p style={{ fontWeight: 500, textTransform: "capitalize" }}>{h.action.replace(/_/g, " ")}</p>
                  <p style={{ fontSize: 13, color: C.ink }}>{new Date(h.at).toLocaleString("en-IN")} · {h.by}</p>
                  {h.note && <p style={{ fontSize: 13, color: C.text, marginTop: 2 }}>“{h.note}”</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={confirm === "cancel"} danger title="Cancel this booking?" busy={busy} confirmLabel="Cancel booking" confirmDisabled={!note.trim()}
        message={<>{b.quantity} seat{b.quantity === 1 ? "" : "s"} will go back on sale. {b.amount > 0 ? <>The booking moves to <strong>Refund needed</strong> — refund {rupees(b.amount)} in Razorpay, then mark it refunded.</> : null}</>}
        onCancel={() => { setConfirm(null); setNote(""); }} onConfirm={async () => {
          let emailNote = "";
          await act(async () => {
            await cancelBooking(b.id!, note);
            if (notify) {
              try { await sendBookingCancellationEmail({ bookingId: b.id!, name: b.name, email: b.email, phone: b.phone, eventTitle: b.eventTitle, date: b.sessionDate, startTime: b.sessionStartTime, endTime: b.sessionEndTime, venue: b.venue ?? event?.location ?? "", ticketType: b.ticketType, quantity: b.quantity, amount: b.amount, reason: note.trim() }); emailNote = ` Email sent to ${b.email}.`; }
              catch { emailNote = " The cancellation email couldn't be sent."; }
            }
          }, "Booking cancelled.");
          if (emailNote) onChanged(`Booking cancelled.${emailNote}`);
        }}>
        <Field label="Reason (sent to the customer)" required><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} style={inputStyle()} placeholder="e.g. Customer asked to cancel" /></Field>
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, marginTop: 12 }}><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.green }} /> Email the customer</label>
      </ConfirmDialog>
      <ConfirmDialog open={confirm === "delete"} danger title="Delete this booking?" busy={busy} confirmLabel="Delete forever"
        message={<>This permanently removes {b.name}&rsquo;s booking{b.status === "confirmed" ? " and puts its seats back on sale" : ""}. No email is sent. This can&rsquo;t be undone.</>}
        onCancel={() => setConfirm(null)} onConfirm={async () => { await act(() => deleteBooking(b.id!), "Booking deleted."); onClose(); }} />
      <ConfirmDialog open={confirm === "refund"} title="Mark as refunded?" busy={busy} confirmLabel="Mark refunded"
        message={<>Confirm you have refunded {rupees(b.amount)} to {b.name} in Razorpay.</>}
        onCancel={() => { setConfirm(null); setNote(""); }} onConfirm={() => act(() => markRefunded(b.id!, note), "Marked as refunded.")}>
        <Field label="Refund reference" hint="Optional, e.g. Razorpay refund ID"><input value={note} onChange={e => setNote(e.target.value)} style={inputStyle()} /></Field>
      </ConfirmDialog>
    </>
  );
}

/** Admin-created booking (cash, bank transfer, complimentary). Takes seats like a website booking. */
export function ManualBookingDialog({ open, events, defaultEventId, onClose, onCreated }: { open: boolean; events: Event[]; defaultEventId?: string; onClose: () => void; onCreated: (msg: string) => void }) {
  const bookable = events.filter(e => e.status !== "archived" && upcomingSessions(e).length);
  const [f, setF] = useState({ eventId: defaultEventId ?? "", sessionId: "", ticketTypeId: "", quantity: "1", name: "", email: "", phone: "", amount: "", sendEmail: true });
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const event = bookable.find(e => e.id === f.eventId);
  const sessions = event ? upcomingSessions(event) : [];
  const session = sessions.find(s => s.id === f.sessionId);
  const ticket = event?.ticketTypes.find(t => t.id === f.ticketTypeId);
  const max = ticket && session ? maxQuantity(ticket, session) : 10;
  const qty = Number(f.quantity) || 0;

  async function submit() {
    const e: Record<string, string> = {};
    if (!event) e.eventId = "Choose an event";
    if (!session) e.sessionId = "Choose a date";
    if (!ticket) e.ticketTypeId = "Choose a ticket";
    else if (session && (qty < 1 || qty > max)) e.quantity = max ? `Between 1 and ${max}` : "Sold out";
    if (!f.name.trim()) e.name = "Enter a name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) e.email = "Enter a valid email";
    if (f.amount !== "" && (!Number.isFinite(Number(f.amount)) || Number(f.amount) < 0)) e.amount = "Enter 0 or more";
    setErrors(e);
    if (Object.keys(e).length || !event || !session || !ticket) return;
    const amount = f.amount === "" ? ticket.price * qty : Number(f.amount);
    setBusy(true);
    try {
      const { id, booking } = await createBooking({ eventId: event.id, sessionId: session.id, ticketTypeId: ticket.id, quantity: qty, name: f.name, email: f.email, phone: f.phone, paymentMethod: "offline", amount, source: "admin" });
      let emailNote = "";
      if (f.sendEmail) {
        try {
          await sendConfirmationEmail({ bookingId: id, name: booking.name, email: booking.email, phone: booking.phone, eventTitle: event.title, date: session.date, startTime: session.startTime, endTime: session.endTime, venue: event.location, ticketType: ticket.name, quantity: qty, amount });
          await markConfirmationEmailSent(id);
        } catch { emailNote = " Email couldn't be sent — resend it from the booking."; }
      }
      onCreated(`Booking added for ${booking.name}.${emailNote}`);
      setF(p => ({ ...p, name: "", email: "", phone: "", amount: "", quantity: "1" }));
    } catch (err) { setErrors({ form: (err as Error).message }); }
    finally { setBusy(false); }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add a booking" subtitle="For cash, bank transfer or complimentary seats. Seats are taken right away."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={submit}>{busy ? "Saving…" : "Add booking"}</Button></>}>
      {bookable.length === 0 ? <p style={{ fontSize: 14, color: C.ink }}>No events have upcoming dates to book.</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {errors.form && <p role="alert" style={{ background: C.claySoft, color: C.red, borderRadius: 8, padding: "10px 12px", fontSize: 14 }}>{errors.form}</p>}
          <Field label="Event" required error={errors.eventId}>
            <Select ariaLabel="Event" placeholder="Choose an event" error={!!errors.eventId} value={f.eventId} onChange={v => setF({ ...f, eventId: v, sessionId: "", ticketTypeId: "" })}
              options={bookable.map(e => ({ value: e.id, label: e.title }))} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date" required error={errors.sessionId}>
              <Select ariaLabel="Date" placeholder={event ? "Choose a date" : "Pick an event first"} error={!!errors.sessionId} disabled={!event} value={f.sessionId} onChange={v => setF({ ...f, sessionId: v })}
                options={sessions.map(s => ({ value: s.id, label: `${formatDateShort(s.date)} · ${formatTime12(s.startTime)}` }))} />
            </Field>
            <Field label="Ticket" required error={errors.ticketTypeId}>
              <Select ariaLabel="Ticket" placeholder={event ? "Choose a ticket" : "Pick an event first"} error={!!errors.ticketTypeId} disabled={!event} value={f.ticketTypeId} onChange={v => setF({ ...f, ticketTypeId: v })}
                options={(event?.ticketTypes ?? []).map(t => { const left = session ? ticketRemaining(t, session) : null; return { value: t.id, label: `${t.name} · ${rupees(t.price)}`, disabled: left === 0, hint: left === null ? undefined : left ? `${left} left` : "Sold out" }; })} />
            </Field>
            <Field label="Quantity" required error={errors.quantity} hint={ticket && session ? `Up to ${max}` : undefined}><input type="number" min={1} max={max} value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} style={inputStyle(!!errors.quantity)} /></Field>
            <Field label="Amount received (₹)" error={errors.amount} hint={ticket ? `Leave blank for ${rupees(ticket.price * Math.max(qty, 0))}` : "Leave blank to use the ticket price"}><input type="number" min={0} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} style={inputStyle(!!errors.amount)} /></Field>
          </div>
          <Field label="Name" required error={errors.name}><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} style={inputStyle(!!errors.name)} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" required error={errors.email}><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} style={inputStyle(!!errors.email)} /></Field>
            <Field label="Phone"><input type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} style={inputStyle()} /></Field>
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}><input type="checkbox" checked={f.sendEmail} onChange={e => setF({ ...f, sendEmail: e.target.checked })} style={{ width: 16, height: 16, accentColor: C.green }} /> Send confirmation email</label>
        </div>
      )}
    </Drawer>
  );
}
