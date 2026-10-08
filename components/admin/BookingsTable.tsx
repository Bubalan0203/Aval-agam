"use client";
import { useMemo, useState } from "react";
import { Download, Plus, Search, Ticket } from "lucide-react";
import type { Booking, BookingStatus, Event } from "@/lib/firestore";
import { amountMismatch, formatDateShort, formatTime12, rupees } from "@/lib/booking-logic";
import { BookingDetailDialog, ManualBookingDialog, exportBookingsCsv } from "./BookingTools";
import { Badge, BookingStatusBadge, BOOKING_STATUS_LABEL, Button, C, Card, Empty, Select, inputStyle } from "./ui";

export type BookingFlag = "" | "amount" | "email";

export function BookingsTable({ bookings, events, fixedEventId, onChanged, title = "Bookings", initialStatus = "", initialFlag = "", initialOpenId, sessionFilter, onSessionFilter }: {
  bookings: Booking[]; events: Event[]; fixedEventId?: string;
  onChanged: (msg: string) => void; title?: string; initialStatus?: BookingStatus | "";
  initialFlag?: BookingFlag; initialOpenId?: string;
  sessionFilter?: string; onSessionFilter?: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [eventId, setEventId] = useState(fixedEventId ?? "");
  const [ownSession, setOwnSession] = useState("");
  const sessionId = sessionFilter ?? ownSession;
  const setSessionId = onSessionFilter ?? setOwnSession;
  const [status, setStatus] = useState<BookingStatus | "">(initialStatus);
  const [flag, setFlag] = useState<BookingFlag>(initialFlag);
  const [openId, setOpenId] = useState<string | undefined>(initialOpenId);
  const [manual, setManual] = useState(false);
  const eventsById = useMemo(() => new Map(events.map(e => [e.id, e])), [events]);
  const sessions = eventId ? [...(eventsById.get(eventId)?.sessions ?? [])].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)) : [];
  const open = bookings.find(b => b.id === openId) ?? null;

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return bookings.filter(b =>
      (!eventId || b.eventId === eventId) && (!sessionId || b.sessionId === sessionId) && (!status || b.status === status) &&
      (flag !== "amount" || (b.status === "confirmed" && amountMismatch(b, eventsById.get(b.eventId)))) &&
      (flag !== "email" || (b.status === "confirmed" && !b.confirmationEmailSentAt && b.source === "website" && !!b.history?.length)) &&
      (!s || [b.id, b.name, b.email, b.phone, b.paymentId, b.eventTitle].some(v => v?.toLowerCase().includes(s))));
  }, [bookings, q, eventId, sessionId, status, flag, eventsById]);

  const confirmed = rows.filter(b => b.status === "confirmed");
  const seats = confirmed.reduce((n, b) => n + b.quantity, 0);
  const revenue = confirmed.reduce((n, b) => n + b.amount, 0);
  const filtered = !!(q || (!fixedEventId && eventId) || sessionId || status || flag);

  return (
    <Card padded={false} title={title} subtitle={`${rows.length} booking${rows.length === 1 ? "" : "s"} · ${seats} confirmed seat${seats === 1 ? "" : "s"} · ${rupees(revenue)}`}
      action={<div style={{ display: "flex", gap: 8 }}>
        <Button variant="secondary" disabled={!rows.length} onClick={() => exportBookingsCsv(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, rows)}><Download size={16} /> Export</Button>
        <Button onClick={() => setManual(true)}><Plus size={16} /> Add booking</Button>
      </div>}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 16, borderBottom: `1px solid ${C.sand}` }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={16} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email, phone or ID" style={{ ...inputStyle(), paddingLeft: 38 }} />
        </div>
        {!fixedEventId && (
          <Select width={240} ariaLabel="Event" value={eventId} onChange={v => { setEventId(v); setSessionId(""); }}
            options={[{ value: "", label: "All events" }, ...events.map(e => ({ value: e.id, label: e.title || "Untitled", hint: e.sessions[0] ? `${e.sessions.length} date${e.sessions.length === 1 ? "" : "s"}` : undefined }))]} />
        )}
        {eventId && (
          <Select width={200} ariaLabel="Date" value={sessionId} onChange={setSessionId}
            options={[{ value: "", label: "All dates" }, ...sessions.map(s => ({ value: s.id, label: `${formatDateShort(s.date)} · ${formatTime12(s.startTime)}`, hint: s.status === "cancelled" ? "Cancelled" : undefined }))]} />
        )}
        <Select width={170} ariaLabel="Status" value={status} onChange={v => setStatus(v as BookingStatus | "")}
          options={[{ value: "", label: "All statuses" }, ...Object.entries(BOOKING_STATUS_LABEL).map(([k, v]) => ({ value: k, label: v }))]} />
        {flag && <Button variant="secondary" onClick={() => setFlag("")}>{flag === "amount" ? "Below price only" : "Email not sent only"} ✕</Button>}
        {filtered && <Button variant="ghost" onClick={() => { setQ(""); if (!fixedEventId) setEventId(""); setSessionId(""); setStatus(""); setFlag(""); }}>Clear filters</Button>}
      </div>

      {rows.length === 0 ? <Empty icon={<Ticket size={22} />}>{filtered ? "No bookings match these filters." : "No bookings yet."}</Empty> : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg, textAlign: "left", fontSize: 12, color: C.ink }}>
                  <th style={{ padding: "12px 20px", fontWeight: 500 }}>Customer</th>
                  {!fixedEventId && <th style={{ padding: "12px 16px", fontWeight: 500 }}>Event</th>}
                  <th style={{ padding: "12px 16px", fontWeight: 500 }}>Date</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500 }}>Tickets</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500 }}>Amount</th>
                  <th style={{ padding: "12px 20px", fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(b => (
                  <tr key={b.id} className="admin-row" onClick={() => setOpenId(b.id)} style={{ borderTop: `1px solid ${C.sand}`, cursor: "pointer", fontSize: 14 }}>
                    <td style={{ padding: "14px 20px" }}><p style={{ fontWeight: 500 }}>{b.name}</p><p style={{ fontSize: 13, color: C.ink }}>{b.email}</p></td>
                    {!fixedEventId && <td style={{ padding: "14px 16px", maxWidth: 240, color: C.ink }}><span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.eventTitle}</span></td>}
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>{formatDateShort(b.sessionDate)}<p style={{ fontSize: 13, color: C.ink }}>{formatTime12(b.sessionStartTime)}</p></td>
                    <td style={{ padding: "14px 16px", color: C.ink }}>{b.quantity} × {b.ticketType}</td>
                    <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                      <p style={{ fontWeight: 500 }}>{rupees(b.amount)}</p>
                      {amountMismatch(b, eventsById.get(b.eventId)) ? <Badge tone="bad">Below price</Badge> : <p style={{ fontSize: 13, color: C.ink }}>{b.paymentMethod === "offline" ? "Offline" : b.paymentMethod === "free" ? "—" : "Razorpay"}</p>}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <BookingStatusBadge status={b.status} />
                      {b.status === "confirmed" && !b.confirmationEmailSentAt && b.history?.length ? <p style={{ fontSize: 12, color: C.gold, marginTop: 4 }}>Email not sent</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden">
            {rows.map(b => (
              <button key={b.id} onClick={() => setOpenId(b.id)} className="admin-row" style={{ display: "block", width: "100%", textAlign: "left", padding: 16, borderTop: `1px solid ${C.sand}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</p><p style={{ fontWeight: 600, fontSize: 14 }}>{rupees(b.amount)}</p>
                </div>
                <p style={{ fontSize: 13, color: C.ink, margin: "2px 0 8px" }}>{!fixedEventId && `${b.eventTitle} · `}{formatDateShort(b.sessionDate)} · {b.quantity} × {b.ticketType}</p>
                <BookingStatusBadge status={b.status} />
              </button>
            ))}
          </div>
        </>
      )}

      {open && <BookingDetailDialog key={open.id} booking={open} event={eventsById.get(open.eventId)} onClose={() => setOpenId(undefined)} onChanged={msg => onChanged(msg)} />}
      <ManualBookingDialog open={manual} events={events} defaultEventId={fixedEventId} onClose={() => setManual(false)} onCreated={msg => { setManual(false); onChanged(msg); }} />
    </Card>
  );
}
