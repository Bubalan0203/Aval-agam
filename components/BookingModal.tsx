"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle2, AlertCircle, User, Mail, Phone, Ticket, CreditCard, Zap } from "lucide-react";
import type { Event } from "@/lib/firestore";

type Props = { event: Event; open: boolean; onOpenChange: (v: boolean) => void };
type Step = "form" | "success" | "error";

const PAYMENT_METHODS = [
  { id: "razorpay", label: "Razorpay", Icon: Zap,        disabled: false },
  { id: "stripe",   label: "Stripe",   Icon: CreditCard, disabled: true  },
];

// Loads Razorpay's checkout.js once and reuses it afterwards. The promise is cached at
// module level so two overlapping calls share one <script> tag instead of racing.
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
    script.onerror = () => {
      razorpayScriptPromise = null; // let the next attempt retry
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

export function BookingModal({ event, open, onOpenChange }: Props) {
  const router = useRouter();
  const requestId = useRef(crypto.randomUUID());
  const [step, setStep] = useState<Step>("form");
  // Pre-select the first ticket that still has seats, not just the first one
  const firstAvailable = event.ticketTypes.find(t => t.sold < t.available) ?? event.ticketTypes[0];
  const [form, setForm] = useState({ name: "", email: "", phone: "", ticketTypeId: firstAvailable?.id ?? "", quantity: 1, paymentMethod: "razorpay" });
  // Both must be ticked before payment can be started
  const [consent, setConsent] = useState({ terms: false, workshop: false });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [sending, setSending]   = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // While the Razorpay window is open, our dialog must release its focus trap
  // so the user can type inside the payment form
  const [payWindowOpen, setPayWindowOpen] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Confirming your booking…");

  // Warm up checkout.js as soon as the modal opens, so the round-trip to Razorpay's CDN
  // happens while the user is still filling the form rather than after they press Pay.
  useEffect(() => {
    if (open) void loadRazorpayScript();
  }, [open]);

  const selectedTicket = event.ticketTypes.find((t) => t.id === form.ticketTypeId);
  const remaining = selectedTicket ? Math.max(0, selectedTicket.available - selectedTicket.sold) : 0;
  const maxQty = Math.min(10, remaining);
  const total = (selectedTicket?.price ?? 0) * form.quantity;

  function clearError(key: string) {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  useEffect(() => { requestId.current = crypto.randomUUID(); }, [form.name, form.email, form.phone, form.ticketTypeId, form.quantity]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = "Valid email required";
    if (!/^\d{10}$/.test(form.phone.replace(/[\s\-+]/g, "").replace(/^91/, "").replace(/^0/, ""))) e.phone = "Valid 10-digit phone required";
    if (!consent.terms)    e.terms    = "Please accept the Terms & Conditions to continue";
    if (!consent.workshop) e.workshop = "Please confirm you understand the session format and fee policy";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /** Opens Razorpay checkout; resolves with the payment id once verified, null if cancelled */
  async function collectPayment(): Promise<string | null> {
    const res = await fetch("/api/create-order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, sessionId: event.selectedSessionId ?? "legacy", ticketTypeId: form.ticketTypeId, quantity: form.quantity, name: form.name, email: form.email, phone: form.phone, requestId: requestId.current }),
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error ?? "ORDER_FAILED");
    if (Math.round(order.amount * 100) !== Math.round(total * 100)) throw new Error("Ticket prices have changed. Reload the event before paying.");
    if (order.status === "confirmed") return "confirmed";
    if (order.status !== "pending") throw new Error("This booking needs attention. Please contact us.");
    const { orderId, bookingId, token } = order;
    const loaded = await loadRazorpayScript();
    if (!loaded) throw new Error("PAYMENT_LOAD_FAILED");

    return new Promise((resolve, reject) => {
      const RazorpayCtor = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void } }).Razorpay;
      // Every exit path must put the dialog back into modal mode, otherwise it stays
      // dismissable-on-outside-click after the payment window is gone.
      const settle = (fn: () => void) => {
        setPayWindowOpen(false);
        fn();
      };
      const rzp = new RazorpayCtor({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: orderId,
        name: "Aval Agam",
        description: event.title,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#0F332B" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...response, bookingId, token }),
            });
            const data = await verifyRes.json();
            if (data.verified) settle(() => resolve(response.razorpay_payment_id));
            else settle(() => reject(new Error("VERIFY_FAILED")));
          } catch {
            settle(() => reject(new Error("VERIFY_FAILED")));
          }
        },
        modal: { ondismiss: () => settle(() => resolve(null)) },
      });
      rzp.on("payment.failed", () => settle(() => reject(new Error("PAYMENT_FAILED"))));

      // Radix's modal Dialog sets `pointer-events: none` on <body> and re-enables it only
      // inside its own portal. Razorpay mounts checkout as a direct child of <body>, so it
      // inherits that and every click falls straight through to the form behind it — the
      // window looks live but nothing is clickable. Leave modal mode while it's up.
      setPayWindowOpen(true);
      rzp.open();
    });
  }

  async function handlePay() {
    if (sending || !validate()) return;
    setSending(true);
    setErrorMsg("");
    setBusyLabel(total > 0 ? "Opening secure payment…" : "Confirming your booking…");

    try {
      const result = await collectPayment();
      if (result === null) { setSending(false); return; }
    } catch (error) {
      setErrorMsg((error as Error).message || "Could not confirm your booking. Please contact us if payment was deducted.");
      setSending(false); setStep("error"); return;
    }
    setSending(false);
    setStep("success");
  }
  function handleClose() {
    // Non-modal mode lets outside clicks reach us; ignore them while Razorpay is up so a
    // tap on its backdrop can't tear this dialog down mid-payment.
    if (payWindowOpen) return;
    if (step === "success") {
      onOpenChange(false);
      router.push("/");
    } else {
      onOpenChange(false);
      setTimeout(() => { setStep("form"); setErrors({}); setConsent({ terms: false, workshop: false }); }, 300);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose} modal={!payWindowOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,51,43,0.45)", zIndex: 50, backdropFilter: "blur(4px)" }} />
        <Dialog.Content
          onInteractOutside={(e) => { if (payWindowOpen) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (payWindowOpen) e.preventDefault(); }}
          style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#FBF4E8", borderRadius: "20px", padding: "0", width: "min(560px, 95vw)", maxHeight: "90vh", overflowY: "auto", zIndex: 51, boxShadow: "0 20px 60px rgba(15,51,43,0.25)" }}>
          <div style={{ position: "relative" }}>
          {step === "success" ? (
            <div style={{ padding: "48px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <CheckCircle2 size={56} style={{ color: "#0F332B" }} />
              <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "26px", fontWeight: 700 }}>Booking Confirmed!</h2>
              <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "15px", lineHeight: 1.7 }}>Your confirmation email is queued for <strong>{form.email}</strong>. See you at the event!</p>
              <div style={{ backgroundColor: "#EEE2D5", borderRadius: "12px", padding: "20px 24px", width: "100%", marginTop: "8px", textAlign: "left" }}>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#C9A25F", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: "14px" }}>Booking Summary</p>
                {[["Event", event.title], ["Date", event.date], ["Time", `${event.startTime}–${event.endTime} IST`], ["Name", form.name], ["Email", form.email], ["Ticket", selectedTicket?.name ?? "—"], ["Quantity", String(form.quantity)], ...(total > 0 ? [["Payment", PAYMENT_METHODS.find(p => p.id === form.paymentMethod)?.label ?? "—"]] : []), ["Total Paid", total === 0 ? "Free" : `₹${total.toLocaleString()}`]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <span style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "13px", opacity: 0.7 }}>{k}</span>
                    <span style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "13px", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleClose} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", border: "none", borderRadius: "9999px", padding: "13px 32px", cursor: "pointer" }}>BACK TO HOME</button>
            </div>
          ) : step === "error" ? (
            <div style={{ padding: "48px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <AlertCircle size={56} style={{ color: "#C8734F" }} />
              <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "24px", fontWeight: 700 }}>Something went wrong</h2>
              <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", lineHeight: 1.7, maxWidth: "340px" }}>{errorMsg || "We couldn't complete your booking. Please try again."}</p>
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <button onClick={() => setStep("form")} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", border: "none", borderRadius: "9999px", padding: "13px 28px", cursor: "pointer" }}>TRY AGAIN</button>
                <button onClick={handleClose} style={{ backgroundColor: "transparent", color: "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "1.5px solid #EEE2D5", borderRadius: "9999px", padding: "13px 28px", cursor: "pointer" }}>CLOSE</button>
              </div>
            </div>
          ) : (
            <>
              {sending && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(251,244,232,0.85)", borderRadius: "20px", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #EEE2D5", borderTopColor: "#0F332B", animation: "spin 0.8s linear infinite" }} />
                  <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: 600 }}>{busyLabel}</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid #EEE2D5", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div>
                  <p style={{ fontFamily: "Poppins, sans-serif", color: "#C9A25F", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>Reserve a Seat</p>
                  <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "20px", fontWeight: 700, lineHeight: 1.3 }}>{event.title}</h2>
                </div>
                <Dialog.Close asChild>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#2F3328", opacity: 0.5, flexShrink: 0 }}><X size={20} /></button>
                </Dialog.Close>
              </div>
              <p style={{ padding: "16px 32px 0", fontWeight: 600 }}>{event.date} · {event.startTime}–{event.endTime} IST</p>
              <div style={{ padding: "24px 32px 32px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <Field label="Full Name" icon={<User size={14} />} error={errors.name}>
                  <input type="text" placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle(!!errors.name)} />
                </Field>
                <Field label="Email Address" icon={<Mail size={14} />} error={errors.email}>
                  <input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle(!!errors.email)} />
                </Field>
                <Field label="Phone Number" icon={<Phone size={14} />} error={errors.phone}>
                  <input type="tel" placeholder="10-digit mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle(!!errors.phone)} />
                </Field>
                <Field label="Ticket Type" icon={<Ticket size={14} />}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {event.ticketTypes.map((tt) => {
                      const soldOut = tt.sold >= tt.available;
                      const selected = form.ticketTypeId === tt.id;
                      return (
                        <label key={tt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "10px", cursor: soldOut ? "not-allowed" : "pointer", border: `1.5px solid ${selected ? "#0F332B" : "#EEE2D5"}`, backgroundColor: selected ? "rgba(15,51,43,0.05)" : "#ffffff", opacity: soldOut ? 0.5 : 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <input type="radio" name="ticketType" value={tt.id} checked={selected} disabled={soldOut} onChange={() => !soldOut && setForm({ ...form, ticketTypeId: tt.id, quantity: Math.min(form.quantity, Math.max(1, tt.available - tt.sold)) })} style={{ accentColor: "#0F332B" }} />
                            <span style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: selected ? 600 : 400 }}>{tt.name}{soldOut && <span style={{ color: "#C8734F", fontSize: "11px", marginLeft: "8px" }}> Sold Out</span>}</span>
                          </div>
                          <span style={{ fontFamily: "Poppins, sans-serif", color: "#C8734F", fontSize: "14px", fontWeight: 700 }}>{tt.price === 0 ? "Free" : `₹${tt.price}`}</span>
                        </label>
                      );
                    })}
                  </div>
                </Field>
                <Field label="Number of Tickets">
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button onClick={() => setForm({ ...form, quantity: Math.max(1, form.quantity - 1) })} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #EEE2D5", background: "#fff", cursor: "pointer", fontSize: "18px", color: "#0F332B", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "16px", fontWeight: 600, color: "#0F332B", minWidth: "24px", textAlign: "center" }}>{form.quantity}</span>
                    <button onClick={() => setForm({ ...form, quantity: Math.min(maxQty, form.quantity + 1) })} disabled={form.quantity >= maxQty} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #EEE2D5", background: "#fff", cursor: form.quantity >= maxQty ? "not-allowed" : "pointer", fontSize: "18px", color: "#0F332B", display: "flex", alignItems: "center", justifyContent: "center", opacity: form.quantity >= maxQty ? 0.4 : 1 }}>+</button>
                    {remaining > 0 && remaining <= 10 && (
                      <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "12px", color: "#C8734F", fontWeight: 500 }}>Only {remaining} seat{remaining > 1 ? "s" : ""} left</span>
                    )}
                  </div>
                </Field>
                {total > 0 && (
                  <Field label="Payment Method" icon={<CreditCard size={14} />}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                      {PAYMENT_METHODS.map(({ id, label, Icon, disabled }) => {
                        const selected = form.paymentMethod === id;
                        return (
                          <button key={id} type="button" disabled={disabled} onClick={() => !disabled && setForm({ ...form, paymentMethod: id })} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "12px 6px", borderRadius: "10px", border: `1.5px solid ${selected ? "#0F332B" : "#EEE2D5"}`, backgroundColor: selected ? "rgba(15,51,43,0.05)" : "#ffffff", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}>
                            <Icon size={18} style={{ color: selected ? "#0F332B" : "#C9A25F" }} />
                            <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "11px", fontWeight: selected ? 600 : 400, color: "#0F332B", whiteSpace: "nowrap" }}>{label}{disabled ? " · Coming soon" : ""}</span>
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                )}
                <div style={{ backgroundColor: "#EEE2D5", borderRadius: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px" }}>Total Amount</span>
                  <span style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "22px", fontWeight: 700 }}>{total === 0 ? "Free" : `₹${total.toLocaleString()}`}</span>
                </div>

                {/* Mandatory consent — both boxes must be ticked before payment */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <Consent
                    checked={consent.terms}
                    error={errors.terms}
                    onChange={(v) => { setConsent((c) => ({ ...c, terms: v })); clearError("terms"); }}
                  >
                    I have read and agree to the Aval Agam&rsquo;s{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#C8734F", fontWeight: 600, textDecoration: "underline" }}>
                      Terms &amp; Conditions
                    </a>
                    .
                  </Consent>
                  <Consent
                    checked={consent.workshop}
                    error={errors.workshop}
                    onChange={(v) => { setConsent((c) => ({ ...c, workshop: v })); clearError("workshop"); }}
                  >
                    I understand that this is a live, non-clinical emotional wellness workshop, the fee is
                    non-refundable and non-transferable, no recording or replay will be provided, and no
                    recordings of the session are allowed by the participants.
                  </Consent>
                </div>

                <button onClick={handlePay} disabled={sending || !consent.terms || !consent.workshop} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", border: "none", borderRadius: "9999px", padding: "16px", cursor: sending || !consent.terms || !consent.workshop ? "not-allowed" : "pointer", textTransform: "uppercase", opacity: sending || !consent.terms || !consent.workshop ? 0.55 : 1, transition: "opacity 0.15s" }}>
                  {sending ? "PLEASE WAIT…" : total === 0 ? "CONFIRM RESERVATION" : `PAY ₹${total.toLocaleString()}`}
                </button>
              </div>
            </>
          )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, icon, error, children }: { label: string; icon?: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
        {icon && <span style={{ color: "#C9A25F" }}>{icon}</span>}{label}
      </label>
      {children}
      {error && <span style={{ fontFamily: "Poppins, sans-serif", color: "#C8734F", fontSize: "11px" }}>{error}</span>}
    </div>
  );
}

function Consent({ checked, error, onChange, children }: { checked: boolean; error?: string; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", backgroundColor: "#ffffff", border: `1.5px solid ${error ? "#C8734F" : checked ? "#0F332B" : "#EEE2D5"}`, borderRadius: "10px", padding: "12px 14px", transition: "border-color 0.15s" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: "#0F332B", width: "16px", height: "16px", marginTop: "2px", flexShrink: 0, cursor: "pointer" }}
        />
        <span style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "12.5px", lineHeight: 1.6 }}>{children}</span>
      </label>
      {error && <span style={{ fontFamily: "Poppins, sans-serif", color: "#C8734F", fontSize: "11px", display: "block", marginTop: "5px" }}>{error}</span>}
    </div>
  );
}

function inputStyle(error: boolean): React.CSSProperties {
  return { width: "100%", padding: "11px 14px", borderRadius: "10px", border: `1.5px solid ${error ? "#C8734F" : "#EEE2D5"}`, backgroundColor: "#ffffff", fontFamily: "Poppins, sans-serif", fontSize: "14px", color: "#2F3328", outline: "none", boxSizing: "border-box" };
}
