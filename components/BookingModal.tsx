"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock, MapPin, Minus, Plus, X } from "lucide-react";
import { BookingError, checkAvailability, createBooking, markConfirmationEmailSent, type Event } from "@/lib/firestore";
import { sendConfirmationEmail } from "@/lib/email";
import { formatDateLong, formatDateShort, formatTime12, maxQuantity, rupees, sessionRemaining, ticketRemaining, upcomingSessions } from "@/lib/booking-logic";

type Props = { event: Event; open: boolean; onOpenChange: (v: boolean) => void; onBooked?: () => void };
type Step = "date" | "tickets" | "details" | "review" | "success" | "refund" | "error";

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

const STEPS: { id: Step; label: string }[] = [
  { id: "date", label: "Date" }, { id: "tickets", label: "Tickets" }, { id: "details", label: "Details" }, { id: "review", label: "Pay" },
];

export function BookingModal({ event, open, onOpenChange, onBooked }: Props) {
  const sessions = useMemo(() => upcomingSessions(event), [event]);
  const singleDate = sessions.length === 1;
  const firstStep: Step = singleDate ? "tickets" : "date";

  const [step, setStep] = useState<Step>(firstStep);
  const [sessionId, setSessionId] = useState(singleDate ? sessions[0].id : "");
  const [ticketTypeId, setTicketTypeId] = useState(() => singleDate ? event.ticketTypes.find(t => ticketRemaining(t, sessions[0]) > 0)?.id ?? "" : "");
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
    setStep(firstStep); if (singleDate) chooseSession(sessions[0].id); else setSessionId(""); setQuantity(1);
    setErrors({}); setNotice(""); setErrorMsg(""); setResult(null); setConsent({ terms: false, workshop: false });
  }

  function validateDetails() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Enter your name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) e.email = "Enter a valid email";
    if (!/^\d{10}$/.test(form.phone.replace(/[\s\-+]/g, "").replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, ""))) e.phone = "Enter a 10-digit mobile number";
    setErrors(e);
    return !Object.keys(e).length;
  }

  function validateConsent() {
    const e: Record<string, string> = {};
    if (!consent.terms) e.terms = "Please accept the Terms & Conditions";
    if (!consent.workshop) e.workshop = "Please confirm you understand the session format and fee policy";
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
    if (busy || !validateConsent() || !session || !ticket) return;
    setNotice("");
    // 1. Re-check seats so nobody pays for seats that are gone.
    setBusy("Checking seats…");
    try { await checkAvailability(event.id, session.id, ticket.id, quantity); }
    catch (err) {
      setBusy("");
      setNotice(err instanceof BookingError ? `${err.message} Please choose another option.` : "We couldn't reach the server. Check your connection and try again.");
      setStep(err instanceof BookingError && err.code === "DATE_UNAVAILABLE" && !singleDate ? "date" : "tickets");
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
      setStep("tickets");
    } finally {
      setBusy("");
      onBooked?.();
    }
  }

  function handleClose(v: boolean) {
    if (v || payWindowOpen || busy) return;
    onOpenChange(false);
    if (step === "success" || step === "refund" || step === "error") setTimeout(reset, 300);
  }

  function next() {
    setNotice("");
    if (step === "date" && session) setStep("tickets");
    else if (step === "tickets" && ticket && quantity >= 1 && quantity <= maxQty) setStep("details");
    else if (step === "details" && validateDetails()) setStep("review");
  }
  function back() {
    setNotice(""); setErrors({});
    const order: Step[] = singleDate ? ["tickets", "details", "review"] : ["date", "tickets", "details", "review"];
    const i = order.indexOf(step);
    if (i > 0) setStep(order[i - 1]);
  }

  const flowStep = STEPS.findIndex(s => s.id === step);
  const visibleSteps = singleDate ? STEPS.slice(1) : STEPS;
  const canNext = step === "date" ? !!session : step === "tickets" ? !!ticket && maxQty > 0 : true;
  const calendarUrl = session ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${session.date.replace(/-/g, "")}T${session.startTime.replace(":", "")}00/${session.date.replace(/-/g, "")}T${session.endTime.replace(":", "")}00&ctz=Asia/Kolkata&location=${encodeURIComponent(event.location)}` : "";

  return (
    <Dialog.Root open={open} onOpenChange={handleClose} modal={!payWindowOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,51,43,0.45)", zIndex: 50, backdropFilter: "blur(4px)" }} />
        <Dialog.Content
          onInteractOutside={e => { if (payWindowOpen || busy) e.preventDefault(); }}
          onEscapeKeyDown={e => { if (payWindowOpen || busy) e.preventDefault(); }}
          className="booking-modal"
          style={{ position: "fixed", backgroundColor: CREAM, zIndex: 51, display: "flex", flexDirection: "column", fontFamily: "Poppins, sans-serif", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
          <style>{`
            .booking-modal { left: 0; right: 0; bottom: 0; max-height: 92vh; border-radius: 20px 20px 0 0; }
            @media (min-width: 640px) { .booking-modal { left: 50%; right: auto; bottom: auto; top: 50%; transform: translate(-50%, -50%); width: min(560px, 95vw); max-height: 90vh; border-radius: 20px; } }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>

          {/* Header */}
          <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${SAND}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: GOLD, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600 }}>Reserve a seat</p>
                <Dialog.Title style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 19, fontWeight: 700, lineHeight: 1.3 }}>{event.title}</Dialog.Title>
              </div>
              <Dialog.Close asChild><button aria-label="Close" disabled={!!busy || payWindowOpen} style={{ color: INK, opacity: 0.5, alignSelf: "flex-start" }}><X size={20} /></button></Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Choose a date, tickets and pay to book {event.title}.</Dialog.Description>
            {flowStep >= 0 && (
              <ol style={{ display: "flex", gap: 6, marginTop: 14 }}>
                {visibleSteps.map((s) => {
                  const idx = STEPS.findIndex(x => x.id === s.id);
                  const done = idx < flowStep, active = idx === flowStep;
                  return (
                    <li key={s.id} style={{ flex: 1 }}>
                      <div style={{ height: 4, borderRadius: 999, background: done || active ? G : SAND }} />
                      <span style={{ fontSize: 11, color: active ? G : INK, opacity: active ? 1 : 0.55, fontWeight: active ? 600 : 400 }}>{s.label}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1, position: "relative" }}>
            {busy && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(251,244,232,0.88)", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${SAND}`, borderTopColor: G, animation: "spin 0.8s linear infinite" }} />
                <p style={{ color: G, fontSize: 14, fontWeight: 600 }}>{busy}</p>
              </div>
            )}
            {notice && <p role="alert" style={{ background: "#FDE8D5", color: "#8B3516", borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>{notice}</p>}

            {step === "date" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 13, color: INK, marginBottom: 4 }}>Choose a date</p>
                {sessions.map(s => {
                  const left = sessionRemaining(event, s);
                  const selected = s.id === sessionId;
                  return (
                    <button key={s.id} type="button" disabled={left === 0} onClick={() => chooseSession(s.id)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", padding: "12px 16px", borderRadius: 12, background: selected ? "#fff" : left === 0 ? SAND : "#fff", border: `1.5px solid ${selected ? G : SAND}`, opacity: left === 0 ? 0.6 : 1, cursor: left === 0 ? "not-allowed" : "pointer" }}>
                      <span>
                        <span style={{ display: "block", fontWeight: 600, color: G, fontSize: 14 }}>{formatDateLong(s.date)}</span>
                        <span style={{ fontSize: 12, color: INK, opacity: 0.7 }}>{formatTime12(s.startTime)} – {formatTime12(s.endTime)} IST</span>
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: left === 0 ? INK : left <= 10 ? CLAY : G, whiteSpace: "nowrap" }}>{left === 0 ? "Sold out" : left <= 10 ? `${left} left` : "Available"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === "tickets" && session && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <SessionLine session={session} venue={event.location} onChange={singleDate ? undefined : () => setStep("date")} />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {event.ticketTypes.map(t => {
                    const left = ticketRemaining(t, session);
                    const selected = t.id === ticketTypeId;
                    return (
                      <label key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderRadius: 12, background: "#fff", border: `1.5px solid ${selected ? G : SAND}`, opacity: left === 0 ? 0.55 : 1, cursor: left === 0 ? "not-allowed" : "pointer" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <input type="radio" name="ticket" checked={selected} disabled={left === 0} onChange={() => { setTicketTypeId(t.id); setQuantity(q => Math.min(q, maxQuantity(t, session)) || 1); }} style={{ accentColor: G }} />
                          <span><span style={{ display: "block", fontSize: 14, fontWeight: 600, color: G }}>{t.name}</span><span style={{ fontSize: 11, color: left === 0 ? CLAY : INK, opacity: left === 0 ? 1 : 0.6 }}>{left === 0 ? "Sold out" : left <= 10 ? `Only ${left} left` : `${left} available`}</span></span>
                        </span>
                        <span style={{ fontWeight: 700, color: CLAY }}>{rupees(t.price)}</span>
                      </label>
                    );
                  })}
                </div>
                {ticket && maxQty > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>Number of tickets</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <RoundBtn label="Fewer" disabled={quantity <= 1} onClick={() => setQuantity(q => q - 1)}><Minus size={14} /></RoundBtn>
                      <span style={{ minWidth: 20, textAlign: "center", fontWeight: 600, color: G }}>{quantity}</span>
                      <RoundBtn label="More" disabled={quantity >= maxQty} onClick={() => setQuantity(q => q + 1)}><Plus size={14} /></RoundBtn>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === "details" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Input label="Full name" value={form.name} error={errors.name} autoComplete="name" onChange={v => setForm({ ...form, name: v })} />
                <Input label="Email" type="email" value={form.email} error={errors.email} autoComplete="email" onChange={v => setForm({ ...form, email: v })} hint="Your confirmation is sent here." />
                <Input label="Mobile number" type="tel" value={form.phone} error={errors.phone} autoComplete="tel" onChange={v => setForm({ ...form, phone: v })} />
              </div>
            )}

            {step === "review" && session && ticket && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Summary rows={[
                  ["Date", `${formatDateShort(session.date)} · ${formatTime12(session.startTime)}`],
                  ["Venue", event.location],
                  ["Tickets", `${quantity} × ${ticket.name}`],
                  ["Name", form.name], ["Email", form.email], ["Mobile", form.phone],
                ]} total={total} />
                <Consent checked={consent.terms} error={errors.terms} onChange={v => setConsent(c => ({ ...c, terms: v }))}>
                  I have read and agree to Aval Agam&rsquo;s <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: CLAY, fontWeight: 600, textDecoration: "underline" }}>Terms &amp; Conditions</a>.
                </Consent>
                <Consent checked={consent.workshop} error={errors.workshop} onChange={v => setConsent(c => ({ ...c, workshop: v }))}>
                  I understand that this is a live, non-clinical emotional wellness workshop, the fee is non-refundable and non-transferable, no recording or replay will be provided, and no recordings of the session are allowed by the participants.
                </Consent>
              </div>
            )}

            {step === "success" && session && ticket && result && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <CheckCircle2 size={52} color={G} />
                <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 24, fontWeight: 700 }}>You&rsquo;re booked!</h2>
                <p style={{ fontSize: 14, color: INK }}>{result.emailed ? <>A confirmation was sent to <strong>{form.email}</strong>.</> : <>Your booking is saved. We couldn&rsquo;t send the email right now — please save your booking ID.</>}</p>
                <Summary rows={[["Booking ID", result.id], ["Date", `${formatDateShort(session.date)} · ${formatTime12(session.startTime)}`], ["Venue", event.location], ["Tickets", `${quantity} × ${ticket.name}`]]} total={total} />
                <a href={calendarUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: CLAY, fontWeight: 600, textDecoration: "underline" }}>Add to Google Calendar</a>
              </div>
            )}

            {step === "refund" && result && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <AlertCircle size={52} color={CLAY} />
                <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 22, fontWeight: 700 }}>Seats ran out while you were paying</h2>
                <p style={{ fontSize: 14, color: INK, lineHeight: 1.7 }}>We&rsquo;re sorry. Your payment of <strong>{rupees(total)}</strong> was received and recorded. Our team will refund it in full — you don&rsquo;t need to do anything. Reference: <strong>{result.id}</strong>.</p>
              </div>
            )}

            {step === "error" && (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <AlertCircle size={52} color={CLAY} />
                <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 22, fontWeight: 700 }}>Something went wrong</h2>
                <p style={{ fontSize: 14, color: INK, lineHeight: 1.7 }}>{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "14px 24px 18px", borderTop: `1px solid ${SAND}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {["date", "tickets", "details", "review"].includes(step) ? (
              <>
                <div>
                  {step !== firstStep ? <button type="button" onClick={back} disabled={!!busy} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: INK }}><ArrowLeft size={14} /> Back</button>
                    : ticket && step !== "date" ? <span style={{ fontSize: 13, color: INK }}>Total <strong style={{ color: G }}>{rupees(total)}</strong></span> : <span />}
                </div>
                {step === "review"
                  ? <Primary onClick={confirmAndPay} disabled={!!busy}>{total === 0 ? "Confirm booking" : `Pay ${rupees(total)}`}</Primary>
                  : <Primary onClick={next} disabled={!canNext}>{step === "tickets" && ticket ? `Continue · ${rupees(total)}` : "Continue"}</Primary>}
              </>
            ) : step === "error" ? (
              <>
                <button type="button" onClick={() => handleClose(false)} style={{ fontSize: 13, color: INK }}>Close</button>
                <Primary onClick={() => { setErrorMsg(""); setStep("review"); }}>Try again</Primary>
              </>
            ) : (
              <>
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: INK, textDecoration: "underline" }}>Need help?</a>
                <Primary onClick={() => handleClose(false)}>Done</Primary>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SessionLine({ session, venue, onChange }: { session: { date: string; startTime: string; endTime: string }; venue: string; onChange?: () => void }) {
  return (
    <div style={{ background: SAND, borderRadius: 12, padding: "12px 14px", fontSize: 13, color: INK, display: "flex", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600, color: G }}><Calendar size={13} color={GOLD} />{formatDateLong(session.date)}</span>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Clock size={13} color={GOLD} />{formatTime12(session.startTime)} – {formatTime12(session.endTime)} IST</span>
        {venue && <span style={{ display: "flex", gap: 8, alignItems: "center" }}><MapPin size={13} color={GOLD} />{venue}</span>}
      </div>
      {onChange && <button type="button" onClick={onChange} style={{ color: CLAY, fontSize: 12, fontWeight: 600, alignSelf: "flex-start" }}>Change</button>}
    </div>
  );
}

function Summary({ rows, total }: { rows: [string, string][]; total: number }) {
  return (
    <div style={{ background: SAND, borderRadius: 12, padding: "14px 18px", width: "100%", textAlign: "left" }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, fontSize: 13 }}>
          <span style={{ color: INK, opacity: 0.7 }}>{k}</span><span style={{ color: G, fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(15,51,43,0.12)", paddingTop: 8, marginTop: 8 }}>
        <span style={{ fontSize: 14, color: INK }}>Total</span><span style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: G }}>{rupees(total)}</span>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, error, type = "text", hint, autoComplete }: { label: string; value: string; onChange: (v: string) => void; error?: string; type?: string; hint?: string; autoComplete?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: INK }}>
      {label}
      <input type={type} value={value} autoComplete={autoComplete} onChange={e => onChange(e.target.value)} aria-invalid={!!error}
        style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${error ? CLAY : SAND}`, background: "#fff", fontSize: 14, fontWeight: 400, color: INK, outline: "none" }} />
      {error ? <span style={{ color: CLAY, fontSize: 11, fontWeight: 500 }}>{error}</span> : hint && <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6 }}>{hint}</span>}
    </label>
  );
}

function Consent({ checked, error, onChange, children }: { checked: boolean; error?: string; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", background: "#fff", border: `1.5px solid ${error ? CLAY : checked ? G : SAND}`, borderRadius: 10, padding: "12px 14px" }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: G, width: 16, height: 16, marginTop: 2, flexShrink: 0 }} />
        <span style={{ color: INK, fontSize: 12.5, lineHeight: 1.6 }}>{children}</span>
      </label>
      {error && <span style={{ color: CLAY, fontSize: 11, display: "block", marginTop: 5 }}>{error}</span>}
    </div>
  );
}

function RoundBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${SAND}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", color: G, opacity: disabled ? 0.4 : 1 }}>{children}</button>;
}

function Primary({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ background: disabled ? SAND : G, color: disabled ? INK : CREAM, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", borderRadius: 999, padding: "12px 24px", cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}
