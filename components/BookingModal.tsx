"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle2, AlertCircle, User, Mail, Phone, Ticket } from "lucide-react";
import emailjs from "@emailjs/browser";
import { createBooking } from "@/lib/firestore";
import type { Event } from "@/lib/firestore";

const EMAILJS_SERVICE_ID  = "service_29vl9xk";
const EMAILJS_TEMPLATE_ID = "template_vjypp5e";
const EMAILJS_PUBLIC_KEY  = "2_h1Ru1ihbvs3-2yg";

type Props = { event: Event; open: boolean; onOpenChange: (v: boolean) => void };
type Step = "form" | "success" | "error";

export function BookingModal({ event, open, onOpenChange }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: "", email: "", phone: "", ticketTypeId: event.ticketTypes[0]?.id ?? "", quantity: 1 });
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const selectedTicket = event.ticketTypes.find((t) => t.id === form.ticketTypeId);
  const total = (selectedTicket?.price ?? 0) * form.quantity;

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.phone.trim() || form.phone.length < 10) e.phone = "Valid phone required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePay() {
    if (!validate()) return;
    setSending(true);
    try {
      await Promise.all([
        createBooking({
          eventId:      event.id,
          eventTitle:   event.title,
          name:         form.name,
          email:        form.email,
          phone:        form.phone,
          ticketType:   selectedTicket?.name ?? "",
          ticketTypeId: form.ticketTypeId,
          quantity:     form.quantity,
          amount:       total,
        }),
        emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            customer_name:  form.name,
            customer_email: form.email,
            customer_phone: form.phone,
            event_title:    event.title,
            event_date:     new Date(event.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
            event_time:     `${event.startTime} — ${event.endTime}`,
            event_venue:    event.location,
            ticket_type:    selectedTicket?.name ?? "",
            quantity:       String(form.quantity),
            amount:         total === 0 ? "Free" : `₹${total.toLocaleString()}`,
            to_email:       form.email,
          },
          EMAILJS_PUBLIC_KEY
        ),
      ]);
      setSending(false);
      setStep("success");
    } catch (err) {
      console.error("EmailJS error:", err);
      setSending(false);
      setStep("error");
    }
  }
  function handleClose() {
    if (step === "success") {
      onOpenChange(false);
      router.push("/");
    } else {
      onOpenChange(false);
      setTimeout(() => { setStep("form"); setErrors({}); }, 300);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,51,43,0.45)", zIndex: 50, backdropFilter: "blur(4px)" }} />
        <Dialog.Content style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", backgroundColor: "#FBF4E8", borderRadius: "20px", padding: "0", width: "min(560px, 95vw)", maxHeight: "90vh", overflowY: "auto", zIndex: 51, boxShadow: "0 20px 60px rgba(15,51,43,0.25)" }}>
          <div style={{ position: "relative" }}>
          {step === "success" ? (
            <div style={{ padding: "48px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <CheckCircle2 size={56} style={{ color: "#0F332B" }} />
              <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "26px", fontWeight: 700 }}>Booking Confirmed!</h2>
              <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "15px", lineHeight: 1.7 }}>A confirmation email has been sent to <strong>{form.email}</strong>. See you at the event!</p>
              <div style={{ backgroundColor: "#EEE2D5", borderRadius: "12px", padding: "20px 24px", width: "100%", marginTop: "8px", textAlign: "left" }}>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#C9A25F", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: "14px" }}>Booking Summary</p>
                {[["Event", event.title], ["Name", form.name], ["Email", form.email], ["Ticket", selectedTicket?.name ?? "—"], ["Quantity", String(form.quantity)], ["Total Paid", total === 0 ? "Free" : `₹${total.toLocaleString()}`]].map(([k, v]) => (
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
              <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", lineHeight: 1.7, maxWidth: "340px" }}>We couldn&apos;t send your confirmation email. Please try again or contact us directly.</p>
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
                  <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: 600 }}>Confirming your booking…</p>
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
                            <input type="radio" name="ticketType" value={tt.id} checked={selected} disabled={soldOut} onChange={() => !soldOut && setForm({ ...form, ticketTypeId: tt.id })} style={{ accentColor: "#0F332B" }} />
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
                    <button onClick={() => setForm({ ...form, quantity: Math.min(10, form.quantity + 1) })} style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #EEE2D5", background: "#fff", cursor: "pointer", fontSize: "18px", color: "#0F332B", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </Field>
                <div style={{ backgroundColor: "#EEE2D5", borderRadius: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px" }}>Total Amount</span>
                  <span style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "22px", fontWeight: 700 }}>{total === 0 ? "Free" : `₹${total.toLocaleString()}`}</span>
                </div>
                <button onClick={handlePay} disabled={sending} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", border: "none", borderRadius: "9999px", padding: "16px", cursor: sending ? "not-allowed" : "pointer", textTransform: "uppercase", opacity: sending ? 0.7 : 1 }}>
                  {sending ? "SENDING…" : total === 0 ? "CONFIRM RESERVATION" : `PAY ₹${total.toLocaleString()}`}
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

function inputStyle(error: boolean): React.CSSProperties {
  return { width: "100%", padding: "11px 14px", borderRadius: "10px", border: `1.5px solid ${error ? "#C8734F" : "#EEE2D5"}`, backgroundColor: "#ffffff", fontFamily: "Poppins, sans-serif", fontSize: "14px", color: "#2F3328", outline: "none", boxSizing: "border-box" };
}
