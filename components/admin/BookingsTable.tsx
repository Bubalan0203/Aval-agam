"use client";
import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import type { Booking, BookingStatus, Event } from "@/lib/firestore";
import { amountMismatch, formatDateShort, formatTime12, rupees } from "@/lib/booking-logic";
import { BookingDetailDialog, ManualBookingDialog, exportBookingsCsv } from "./BookingTools";
import { Badge, BookingStatusBadge, BOOKING_STATUS_LABEL, Button, C, Card, Empty, inputStyle } from "./ui";

export function BookingsTable({ bookings, events, fixedEventId, onChanged, title = "Bookings", initialStatus = "" }: {
  bookings: Booking[]; events: Event[]; fixedEventId?: string;
  onChanged: (msg: string) => void; title?: string; initialStatus?: BookingStatus | "";
}) {
  const [q, setQ] = useState("");
  const [eventId, setEventId] = useState(fixedEventId ?? "");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState<BookingStatus | "">(initialStatus);
  const [open, setOpen] = useState<Booking | null>(null);
  const [manual, setManual] = useState(false);
  const eventsById = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);
  const sessions = eventId ? eventsById.get(eventId)?.sessions ?? [] : [];

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return bookings.filter(b =>
      (!eventId || b.eventId === eventId) && (!sessionId || b.sessionId === sessionId) && (!status || b.status === status) &&
      (!s || [b.id, b.name, b.email, b.phone, b.paymentId].some(v => v?.toLowerCase().includes(s))));
  }, [bookings, q, eventId, sessionId, status]);

  const seats = rows.filter(b => b.status === "confirmed").reduce((n, b) => n + b.quantity, 0);
  const revenue = rows.filter(b => b.status === "confirmed").reduce((n, b) => n + b.amount, 0);

  return (
    <Card title={title} subtitle={`${rows.length} bookings · ${seats} confirmed seats · ${rupees(revenue)} confirmed`}
      action={<div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" disabled={!rows.length} onClick={() => exportBookingsCsv(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, rows)}><Download size={14} /> CSV</Button>
        <Button onClick={() => setManual(true)}><Plus size={14} /> Add booking</Button>
      </div>}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email, phone, booking or payment ID" style={{ ...inputStyle(), paddingLeft: 34 }} />
        </div>
        {!fixedEventId && (
          <select value={eventId} onChange={e => { setEventId(e.target.value); setSessionId(""); }} style={{ ...inputStyle(), width: "auto", maxWidth: 260 }}>
            <option value="">All events</option>{events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        )}
        {eventId && (
          <select value={sessionId} onChange={e => setSessionId(e.target.value)} style={{ ...inputStyle(), width: "auto" }}>
            <option value="">All dates</option>{sessions.map(s => <option key={s.id} value={s.id}>{formatDateShort(s.date)} · {formatTime12(s.startTime)}{s.status === "cancelled" ? " (cancelled)" : ""}</option>)}
          </select>
        )}
        <select value={status} onChange={e => setStatus(e.target.value as BookingStatus | "")} style={{ ...inputStyle(), width: "auto" }}>
          <option value="">All statuses</option>{Object.entries(BOOKING_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {rows.length === 0 ? <Empty>No bookings match.</Empty> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: C.ink, minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 11, letterSpacing: "0.06em", opacity: 0.6 }}>
                <th style={{ padding: 8 }}>CUSTOMER</th>{!fixedEventId && <th style={{ padding: 8 }}>EVENT</th>}<th style={{ padding: 8 }}>DATE</th><th style={{ padding: 8 }}>TICKET</th><th style={{ padding: 8 }}>AMOUNT</th><th style={{ padding: 8 }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(b => (
                <tr key={b.id} onClick={() => setOpen(b)} style={{ borderTop: `1px solid ${C.sand}`, cursor: "pointer" }}>
                  <td style={{ padding: 8 }}><p style={{ fontWeight: 600, color: C.green }}>{b.name}</p><p style={{ fontSize: 12, opacity: 0.65 }}>{b.email} · {b.phone}</p></td>
                  {!fixedEventId && <td style={{ padding: 8, maxWidth: 220 }}>{b.eventTitle}</td>}
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>{formatDateShort(b.sessionDate)}<p style={{ fontSize: 12, opacity: 0.65 }}>{formatTime12(b.sessionStartTime)}</p></td>
                  <td style={{ padding: 8 }}>{b.ticketType} × {b.quantity}</td>
                  <td style={{ padding: 8, fontWeight: 600 }}>{rupees(b.amount)} {amountMismatch(b, eventsById.get(b.eventId)) && <Badge tone="bad">Check amount</Badge>}<p style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>{b.paymentMethod}</p></td>
                  <td style={{ padding: 8 }}><BookingStatusBadge status={b.status} />{b.status === "confirmed" && !b.confirmationEmailSentAt && <p style={{ fontSize: 11, color: C.clay }}>Email not sent</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <BookingDetailDialog booking={open} event={eventsById.get(open.eventId)} onClose={() => setOpen(null)} onChanged={msg => { setOpen(null); onChanged(msg); }} />}
      <ManualBookingDialog open={manual} events={events} defaultEventId={fixedEventId} onClose={() => setManual(false)} onCreated={msg => { setManual(false); onChanged(msg); }} />
    </Card>
  );
}
