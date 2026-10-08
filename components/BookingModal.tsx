"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock, Lock, MapPin, Minus, Plus, X } from "lucide-react";
import { BookingError, checkAvailability, createBooking, markConfirmationEmailSent, type Event } from "@/lib/firestore";
import { sendConfirmationEmail } from "@/lib/email";
import { formatDateLong, formatDateShort, formatTime12, maxQuantity, rupees, sessionRemaining, ticketRemaining, upcomingSessions } from "@/lib/booking-logic";

type Props = { event: Event; open: boolean; onOpenChange: (v: boolean) => void; onBooked?: () => void; initialSessionId?: string };
type Step = "form" | "success" | "refund" | "error";

const G = "#0F332B", CREAM = "#FBF4E8", SAND = "#EEE2D5", GOLD = "#C9A25F", CLAY = "#C8734F", INK = "#2F3328";
const WHATSAPP = "https://wa.me/919952697993";

// Loads Razorpay's checkout.js once; overlapping calls share one <script> tag.
let razorpayScriptPromise: Promise<boolean> | null = null;
function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => { razorpayScriptPromise = null; resolve(false); };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

export function BookingModal({ event, open, onOpenChange, onBooked, initialSessionId }: Props) {
  const sessions = useMemo(() => upcomingSessions(event), [event]);
  const singleDate = sessions.length === 1;
  const firstOpen = sessions.find(s => s.id === initialSessionId && sessionRemaining(event, s) > 0) ?? sessions.find(s => sessionRemaining(event, s) > 0);

  const [step, setStep] = useState<Step>("form");
  const [sessionId, setSessionId] = useState(firstOpen?.id ?? "");
  const [ticketTypeId, setTicketTypeId] = useState(() => firstOpen ? event.ticketTypes.find(t => ticketRemaining(t, firstOpen) > 0)?.id ?? "" : "");
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [consent, setConsent] = useState({ terms: false, workshop: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ id: string; emailed: boolean } | null>(null);
  // Radix modal mode blocks clicks on Razorpay's iframe; release it while checkout is open.
  const [payWindowOpen, setPayWindowOpen] = useState(false);

  const session = sessions.find(s => s.id === sessionId);
  const datesRef = useRef<HTMLDivElement>(null);
  const openIds = sessions.filter(s => sessionRemaining(event, s) > 0).map(s => s.id);
  const openIdx = openIds.indexOf(sessionId);
  useEffect(() => {
    const box = datesRef.current, el = box?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (box && el) box.scrollTo({ left: el.offsetLeft - box.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [sessionId]);
  const ticket = event.ticketTypes.find(t => t.id === ticketTypeId);
  const maxQty = ticket && session ? maxQuantity(ticket, session) : 0;
  const total = (ticket?.price ?? 0) * quantity;

  useEffect(() => { if (open) void loadRazorpayScript(); }, [open]);

  // Choosing a date keeps the current ticket if it still has seats, otherwise picks the first available.
  function chooseSession(id: string) {
    const s = sessions.find(x => x.id === id);
    setSessionId(id);
    if (!s) return;
    const current = event.ticketTypes.find(t => t.id === ticketTypeId && ticketRemaining(t, s) > 0)
      ?? event.ticketTypes.find(t => ticketRemaining(t, s) > 0);
    setTicketTypeId(current?.id ?? "");
    setQuantity(q => Math.max(1, Math.min(q, current ? maxQuantity(current, s) : 1)));
  }

  function reset() {
    setStep("form"); chooseSession(firstOpen?.id ?? ""); setQuantity(1);
    setErrors({}); setNotice(""); setErrorMsg(""); setResult(null); setConsent({ terms: false, workshop: false });
  }

  /** Everything is on one screen, so details and consent are checked together. */
  function validateAll() {
    const e: Record<string, string> = {};
    if (!session) e.session = "Choose a date";
    else if (!ticket || maxQty < 1) e.ticket = "Choose a ticket";
    if (!form.name.trim()) e.name = "Enter your name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = "Enter a valid email";
    if (!/^\d{10}$/.test(form.phone.replace(/[\s\-+]/g, "").replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, ""))) e.phone = "Enter a 10-digit mobile number";
    if (!consent.terms || !consent.workshop) e.terms = "Tick the box to accept the terms";
    setErrors(e);
    return !Object.keys(e).length;
  }

  /** Opens Razorpay; resolves with the verified payment id, or null if the customer closed it. */
  async function collectPayment(): Promise<string | null> {
    const orderReq = (async () => {
      const res = await fetch("/api/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, receipt: `evt_${event.id.slice(0, 12)}_${Date.now()}` }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error("ORDER_FAILED");
      return res.json() as Promise<{ orderId: string }>;
    })();
    const [loaded, { orderId }] = await Promise.all([loadRazorpayScript(), orderReq]);
    if (!loaded) throw new Error("PAYMENT_LOAD_FAILED");
    return new Promise((resolve, reject) => {
      const RazorpayCtor = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void } }).Razorpay;
      const settle = (fn: () => void) => { setPayWindowOpen(false); fn(); };
      const rzp = new RazorpayCtor({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: orderId,
        name: "Aval Agam",
        description: `${event.title} · ${session ? formatDateShort(session.date) : ""}`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: G },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(response) });
            const data = await verifyRes.json();
            settle(() => data.verified ? resolve(response.razorpay_payment_id) : reject(new Error("VERIFY_FAILED")));
          } catch { settle(() => reject(new Error("VERIFY_FAILED"))); }
        },
        modal: { ondismiss: () => settle(() => resolve(null)) },
      });
      rzp.on("payment.failed", () => settle(() => reject(new Error("PAYMENT_FAILED"))));
      setPayWindowOpen(true);
      rzp.open();
    });
  }

  async function confirmAndPay() {
    if (busy || !validateAll() || !session || !ticket) return;
    setNotice("");
    // 1. Re-check seats so nobody pays for seats that are gone.
    setBusy("Checking seats…");
    try { await checkAvailability(event.id, session.id, ticket.id, quantity); }
    catch (err) {
      setBusy("");
      setNotice(err instanceof BookingError ? `${err.message} Please choose another option.` : "We couldn't reach the server. Check your connection and try again.");
      onBooked?.();
      return;
    }

    // 2. Payment (paid tickets only).
    let paymentId: string | undefined;
    if (total > 0) {
      setBusy("Opening secure payment…");
      try {
        const id = await collectPayment();
        if (!id) { setBusy(""); setNotice("Payment window closed. Your details are saved — you can pay when ready."); return; }
        paymentId = id;
      } catch (err) {
        const code = err instanceof Error ? err.message : "";
        setBusy("");
        if (code === "PAYMENT_FAILED") { setNotice("Your payment didn't go through and no money was taken. Please try again."); return; }
        setErrorMsg(code === "VERIFY_FAILED"
          ? "We couldn't verify your payment. If money was deducted, contact us with your payment receipt and we'll sort it out."
          : "We couldn't start the payment. Check your connection and try again.");
        setStep("error");
        return;
      }
    }

    // 3. Save the booking (takes seats atomically).
    setBusy("Confirming your booking…");
    try {
      const { id, booking } = await createBooking({
        eventId: event.id, sessionId: session.id, ticketTypeId: ticket.id, quantity,
        name: form.name, email: form.email, phone: form.phone,
        paymentMethod: total > 0 ? "razorpay" : "free", paymentId, amount: total, source: "website",
      });
      if (booking.status !== "confirmed") { setResult({ id, emailed: false }); setStep("refund"); return; }
      // 4. Email — the booking is already saved, so a failure here is not fatal.
      let emailed = false;
      try {
        await sendConfirmationEmail({ bookingId: id, name: booking.name, email: booking.email, phone: booking.phone, eventTitle: event.title, date: session.date, startTime: session.startTime, endTime: session.endTime, venue: event.location, ticketType: ticket.name, quantity, amount: total });
        await markConfirmationEmailSent(id);
        emailed = true;
      } catch (e) { console.error("Confirmation email failed (booking saved):", e); }
      setResult({ id, emailed });
      setStep("success");
    } catch (err) {
      // Only reached for free bookings (paid ones are always recorded).
      setNotice(err instanceof BookingError ? `${err.message} Please choose another option.` : "We couldn't complete your booking. Please try again.");
    } finally {
      setBusy("");
      onBooked?.();
    }
  }

  function handleClose(v: boolean) {
    if (v || payWindowOpen || busy) return;
    onOpenChange(false);
    if (step !== "form") setTimeout(reset, 300);
  }
  const clearErr = (k: string) => setErrors(e => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n; });

  const calendarUrl = session ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${session.date.replace(/-/g, "")}T${session.startTime.replace(":", "")}00/${session.date.replace(/-/g, "")}T${session.endTime.replace(":", "")}00&ctz=Asia/Kolkata&location=${encodeURIComponent(event.location)}` : "";
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: GOLD, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "baseline" };

  return (
    <Dialog.Root open={open} onOpenChange={handleClose} modal={!payWindowOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,51,43,0.5)", zIndex: 50, backdropFilter: "blur(4px)" }} />
        <Dialog.Content
          onInteractOutside={e => { if (payWindowOpen || busy) e.preventDefault(); }}
          onEscapeKeyDown={e => { if (payWindowOpen || busy) e.preventDefault(); }}
          className="booking-modal"
          style={{ position: "fixed", backgroundColor: "#fff", zIndex: 51, display: "flex", flexDirection: "column", fontFamily: "Poppins, sans-serif", boxShadow: "0 24px 64px rgba(15,51,43,0.28)", overflow: "hidden" }}>
          <style>{`
            .booking-modal { left: 0; right: 0; bottom: 0; max-height: 94vh; border-radius: 22px 22px 0 0; }
            @media (min-width: 640px) { .booking-modal { left: 50%; right: auto; bottom: auto; top: 50%; transform: translate(-50%, -50%); width: min(480px, 95vw); max-height: 90vh; border-radius: 22px; } }
            @keyframes spin { to { transform: rotate(360deg); } }
            .bm-dates { display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 6px; scroll-snap-type: x mandatory; }
            .bm-dates::-webkit-scrollbar { height: 4px; } .bm-dates::-webkit-scrollbar-thumb { background: ${SAND}; border-radius: 4px; }
            .bm-date { flex: 0 0 auto; min-width: 82px; scroll-snap-align: start; text-align: left; padding: 7px 10px; border-radius: 12px; border: 1.5px solid ${SAND}; background: #fff; transition: border-color .15s, background .15s; }
            .bm-arrow { flex: 0 0 auto; width: 32px; height: 32px; border-radius: 999px; border: 1.5px solid ${SAND}; background: #fff; color: ${G}; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
            .bm-arrow:hover:not(:disabled) { border-color: ${G}; } .bm-arrow:disabled { opacity: .35; cursor: default; }
            .bm-date:hover:not(:disabled) { border-color: ${GOLD}; }
            .bm-date[aria-checked="true"] { border-color: ${G}; background: ${G}; }
            .bm-date[aria-checked="true"] * { color: ${CREAM} !important; }
            .bm-date:disabled { opacity: .45; cursor: not-allowed; background: ${CREAM}; }
            .bm-in { width: 100%; height: 42px; padding: 0 14px; border-radius: 10px; border: 1.5px solid ${SAND}; background: #fff; font-size: 14px; color: ${INK}; outline: none; transition: border-color .15s, box-shadow .15s; }
            .bm-in:focus { border-color: ${G}; box-shadow: 0 0 0 3px rgba(15,51,43,.08); }
            .bm-in[aria-invalid="true"] { border-color: ${CLAY}; }
            .bm-grid2 { display: grid; grid-template-columns: 1fr; gap: 10px; }
            @media (min-width: 480px) { .bm-grid2 { grid-template-columns: 1fr 1fr; } }
          `}</style>

          {/* Header */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "16px 18px", borderBottom: `1px solid ${SAND}` }}>
            {event.image ? <img src={event.image} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: 52, height: 52, borderRadius: 12, background: SAND, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <Dialog.Title style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 17, fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{event.title}</Dialog.Title>
              <p style={{ fontSize: 12, color: INK, opacity: 0.7, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}><MapPin size={12} />{event.location}</p>
            </div>
            <Dialog.Close asChild><button aria-label="Close" disabled={!!busy || payWindowOpen} style={{ width: 34, height: 34, borderRadius: 999, background: CREAM, color: INK, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={18} /></button></Dialog.Close>
            <Dialog.Description className="sr-only">Choose a date and tickets, add your details and pay to book {event.title}.</Dialog.Description>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 18px 8px", overflowY: "auto", flex: 1, position: "relative" }}>
            {busy && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.9)", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${SAND}`, borderTopColor: G, animation: "spin 0.8s linear infinite" }} />
                <p style={{ color: G, fontSize: 14, fontWeight: 600 }}>{busy}</p>
              </div>
            )}

            {step === "form" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {notice && <p role="alert" style={{ background: "#FDE8D5", color: "#8B3516", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>{notice}</p>}

                {/* 1. Date */}
                <section>
                  <p style={label}><span>{singleDate ? "Date" : "1 · Choose a date"}</span>{!singleDate && <span style={{ fontSize: 11, letterSpacing: 0, textTransform: "none", color: INK, opacity: 0.6, fontWeight: 500 }}>{sessions.length} dates</span>}</p>
                  {singleDate && session ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: CREAM }}>
                      <DateTile date={session.date} />
                      <div><p style={{ fontSize: 14, fontWeight: 600, color: G }}>{formatDateLong(session.date)}</p><p style={{ fontSize: 12, color: INK, opacity: 0.7 }}>{formatTime12(session.startTime)} – {formatTime12(session.endTime)} IST</p></div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {sessions.length > 5 && <button type="button" className="bm-arrow" aria-label="Previous date" disabled={openIdx <= 0} onClick={() => { chooseSession(openIds[openIdx - 1]); setNotice(""); }}><ChevronLeft size={16} /></button>}
                      <div ref={datesRef} className="bm-dates" role="radiogroup" aria-label="Dates" style={{ flex: 1, minWidth: 0 }}>
                        {sessions.map(s => {
                          const left = sessionRemaining(event, s);
                          const d = new Date(`${s.date}T00:00:00+05:30`);
                          return (
                            <button key={s.id} type="button" role="radio" aria-checked={s.id === sessionId} disabled={left === 0} className="bm-date" onClick={() => { chooseSession(s.id); clearErr("session"); setNotice(""); }}>
                              <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: INK, opacity: 0.65 }}>{d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" }).toUpperCase()}</span>
                              <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: G }}>{d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}</span>
                              <span style={{ display: "block", fontSize: 11, fontWeight: 600, marginTop: 2, color: left === 0 ? INK : left <= 10 ? CLAY : "#2F7A55" }}>{left === 0 ? "Sold out" : left <= 10 ? `${left} left` : formatTime12(s.startTime)}</span>
                            </button>
                          );
                        })}
                      </div>
                      {sessions.length > 5 && <button type="button" className="bm-arrow" aria-label="Next date" disabled={openIdx < 0 || openIdx >= openIds.length - 1} onClick={() => { chooseSession(openIds[openIdx + 1]); setNotice(""); }}><ChevronRight size={16} /></button>}
                      </div>
                      {session && <p style={{ fontSize: 12, color: INK, opacity: 0.75, display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}><Clock size={13} />{formatDateLong(session.date)} · {formatTime12(session.startTime)} – {formatTime12(session.endTime)} IST</p>}
                      {errors.session && <p style={{ color: CLAY, fontSize: 12, marginTop: 4 }}>{errors.session}</p>}
                    </>
                  )}
                </section>

                {/* 2. Tickets */}
                <section>
                  <p style={label}><span>{singleDate ? "1" : "2"} · Tickets</span></p>
                  <div style={{ border: `1.5px solid ${errors.ticket ? CLAY : SAND}`, borderRadius: 14, overflow: "hidden" }}>
                    {event.ticketTypes.map((t, i) => {
                      const left = session ? ticketRemaining(t, session) : 0;
                      const selected = t.id === ticketTypeId;
                      const max = session ? maxQuantity(t, session) : 0;
                      return (
                        <div key={t.id} role="radio" aria-checked={selected} tabIndex={left === 0 ? -1 : 0}
                          onClick={() => { if (left > 0 && session && !selected) { setTicketTypeId(t.id); setQuantity(q => Math.min(q, max) || 1); clearErr("ticket"); } }}
                          onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && left > 0 && session) { e.preventDefault(); setTicketTypeId(t.id); setQuantity(q => Math.min(q, max) || 1); } }}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? `1px solid ${SAND}` : "none", background: selected ? "#F4F8F6" : "#fff", cursor: left === 0 ? "not-allowed" : "pointer", opacity: left === 0 ? 0.5 : 1 }}>
                          <span style={{ width: 18, height: 18, borderRadius: 999, border: `2px solid ${selected ? G : "#C9C2B6"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{selected && <span style={{ width: 8, height: 8, borderRadius: 999, background: G }} />}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: G }}>{t.name}</span>
                            <span style={{ fontSize: 12, color: left === 0 ? CLAY : INK, opacity: left === 0 ? 1 : 0.65 }}>{!session ? "Pick a date first" : left === 0 ? "Sold out" : left <= 10 ? `Only ${left} left` : `${left} available`}</span>
                          </span>
                          {selected && max > 0 ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={e => e.stopPropagation()}>
                              <RoundBtn label="Fewer" disabled={quantity <= 1} onClick={() => setQuantity(q => q - 1)}><Minus size={14} /></RoundBtn>
                              <span style={{ minWidth: 18, textAlign: "center", fontWeight: 700, color: G }}>{quantity}</span>
                              <RoundBtn label="More" disabled={quantity >= max} onClick={() => setQuantity(q => q + 1)}><Plus size={14} /></RoundBtn>
                            </span>
                          ) : null}
                          <span style={{ minWidth: 56, textAlign: "right", fontWeight: 700, color: t.price ? G : "#2F7A55" }}>{t.price ? rupees(t.price) : "Free"}</span>
                        </div>
                      );
                    })}
                  </div>
                  {errors.ticket && <p style={{ color: CLAY, fontSize: 12, marginTop: 4 }}>{errors.ticket}</p>}
                </section>

                {/* 3. Details */}
                <section>
                  <p style={label}><span>{singleDate ? "2" : "3"} · Your details</span></p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field error={errors.name}><input className="bm-in" placeholder="Full name" autoComplete="name" value={form.name} aria-invalid={!!errors.name} onChange={e => { setForm({ ...form, name: e.target.value }); clearErr("name"); }} /></Field>
                    <div className="bm-grid2">
                      <Field error={errors.email}><input className="bm-in" type="email" placeholder="Email for your ticket" autoComplete="email" value={form.email} aria-invalid={!!errors.email} onChange={e => { setForm({ ...form, email: e.target.value }); clearErr("email"); }} /></Field>
                      <Field error={errors.phone}><input className="bm-in" type="tel" placeholder="Mobile (10 digits)" autoComplete="tel" value={form.phone} aria-invalid={!!errors.phone} onChange={e => { setForm({ ...form, phone: e.target.value }); clearErr("phone"); }} /></Field>
                    </div>
                  </div>
                </section>

                {/* Terms (one tick covers both) */}
                <Consent checked={consent.terms && consent.workshop} error={errors.terms || errors.workshop} onChange={v => { setConsent({ terms: v, workshop: v }); clearErr("terms"); clearErr("workshop"); }}>
                  I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: CLAY, fontWeight: 600, textDecoration: "underline" }}>Terms &amp; Conditions</a> and understand this is a live, non-clinical session. The fee is non-refundable and non-transferable, with no recording.
                </Consent>
              </div>
            )}

            {step === "success" && session && ticket && result && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "10px 0 6px" }}>
                <span style={{ width: 64, height: 64, borderRadius: 999, background: "#E7F4EC", display: "flex", alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={36} color="#2F7A55" /></span>
                <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 24, fontWeight: 700 }}>You&rsquo;re booked!</h2>
                <p style={{ fontSize: 14, color: INK }}>{result.emailed ? <>Your ticket was emailed to <strong>{form.email}</strong>.</> : <>Your booking is saved. We couldn&rsquo;t send the email right now, so please note your booking ID.</>}</p>
                <Summary rows={[["Booking ID", result.id], ["Date", `${formatDateShort(session.date)} · ${formatTime12(session.startTime)}`], ["Venue", event.location], ["Tickets", `${quantity} × ${ticket.name}`]]} total={total} />
                <a href={calendarUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: G, fontWeight: 600, padding: "8px 14px", borderRadius: 999, border: `1.5px solid ${SAND}` }}><CalendarPlus size={15} /> Add to Google Calendar</a>
              </div>
            )}

            {step === "refund" && result && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "10px 0" }}>
                <AlertCircle size={52} color={CLAY} />
                <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 22, fontWeight: 700 }}>Seats ran out while you were paying</h2>
                <p style={{ fontSize: 14, color: INK, lineHeight: 1.7 }}>We&rsquo;re sorry. Your payment of <strong>{rupees(total)}</strong> was received and recorded, and our team will refund it in full. You don&rsquo;t need to do anything. Reference: <strong>{result.id}</strong>.</p>
              </div>
            )}

            {step === "error" && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "10px 0" }}>
                <AlertCircle size={52} color={CLAY} />
                <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 22, fontWeight: 700 }}>Something went wrong</h2>
                <p style={{ fontSize: 14, color: INK, lineHeight: 1.7 }}>{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 18px calc(12px + env(safe-area-inset-bottom))", borderTop: `1px solid ${SAND}`, background: CREAM }}>
            {step === "form" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: INK, opacity: 0.7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session ? formatDateShort(session.date) : "No date"}{ticket ? ` · ${quantity} × ${ticket.name}` : ""}</p>
                    <p style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: G, lineHeight: 1.2 }}>{total ? rupees(total) : "Free"}</p>
                  </div>
                  <button type="button" onClick={confirmAndPay} disabled={!!busy || !session || !ticket}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 22px", borderRadius: 999, background: !session || !ticket ? SAND : G, color: !session || !ticket ? INK : CREAM, fontSize: 14, fontWeight: 700, flexShrink: 0, boxShadow: !session || !ticket ? "none" : "0 8px 20px -8px rgba(15,51,43,.6)" }}>
                    {total > 0 && <Lock size={15} />}{total > 0 ? `Pay ${rupees(total)}` : "Reserve my seat"}
                  </button>
                </div>
                {total > 0 && <p style={{ fontSize: 11, color: INK, opacity: 0.6, textAlign: "center", marginTop: 8 }}>Secure payment by Razorpay · UPI, cards and netbanking</p>}
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                {step === "error"
                  ? <><button type="button" onClick={() => handleClose(false)} style={{ fontSize: 13, color: INK }}>Close</button><Primary onClick={() => { setErrorMsg(""); setStep("form"); }}>Try again</Primary></>
                  : <><a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: INK, textDecoration: "underline" }}>Need help?</a><Primary onClick={() => handleClose(false)}>Done</Primary></>}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DateTile({ date }: { date: string }) {
  const d = new Date(`${date}T00:00:00+05:30`);
  return (
    <span style={{ width: 46, flexShrink: 0, borderRadius: 10, overflow: "hidden", textAlign: "center", background: "#fff", border: `1px solid ${SAND}` }}>
      <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", background: G, color: CREAM, padding: "2px 0" }}>{d.toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).toUpperCase()}</span>
      <span style={{ display: "block", fontSize: 17, fontWeight: 700, color: G, padding: "2px 0" }}>{d.toLocaleDateString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" })}</span>
    </span>
  );
}

function Field({ error, children }: { error?: string; children: React.ReactNode }) {
  return <div>{children}{error && <p style={{ color: CLAY, fontSize: 12, marginTop: 4 }}>{error}</p>}</div>;
}

function Summary({ rows, total }: { rows: [string, string][]; total: number }) {
  return (
    <div style={{ background: CREAM, borderRadius: 14, padding: "14px 18px", width: "100%", textAlign: "left" }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, fontSize: 13 }}>
          <span style={{ color: INK, opacity: 0.7 }}>{k}</span><span style={{ color: G, fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(15,51,43,0.12)", paddingTop: 8, marginTop: 8 }}>
        <span style={{ fontSize: 14, color: INK }}>Total</span><span style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: G }}>{total ? rupees(total) : "Free"}</span>
      </div>
    </div>
  );
}

function Consent({ checked, error, onChange, children }: { checked: boolean; error?: string; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", borderRadius: 10, padding: "10px 12px", background: error ? "#FDF1EC" : checked ? "#F4F8F6" : CREAM, border: `1px solid ${error ? CLAY : "transparent"}` }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: G, width: 17, height: 17, marginTop: 1, flexShrink: 0 }} />
        <span style={{ color: INK, fontSize: 12.5, lineHeight: 1.55 }}>{children}</span>
      </label>
      {error && <span style={{ color: CLAY, fontSize: 11.5, display: "block", marginTop: 4 }}>{error}</span>}
    </div>
  );
}

function RoundBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${SAND}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: G, opacity: disabled ? 0.35 : 1 }}>{children}</button>;
}

function Primary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ background: disabled ? SAND : G, color: disabled ? INK : CREAM, fontSize: 14, fontWeight: 700, borderRadius: 999, padding: "12px 26px", cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}
