"use client";
import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const WHATSAPP = "https://wa.me/919952697993";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function WhatWeOffer() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  return (
    <section id="offer" style={{ backgroundColor: '#0F332B' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-14 flex flex-col items-center gap-4">
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
            OUR PATHWAYS
          </p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: 'clamp(28px, 3.5vw, 46px)', lineHeight: 1.25, fontWeight: 600 }}>
            Four ways to begin with{' '}
            <em style={{ color: '#C9A25F', fontStyle: 'italic' }}>Aval Agam.</em>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* 01 — Mindful Reset Workshop */}
          <Card num="01 · BEGIN HERE" title="Mindful Reset Workshop">
            <p style={bodyStyle}>
              A ₹699 live workshop introducing breath awareness, gentle movement, mindfulness, journaling and emotional reflection.
            </p>
            <p style={bodyStyle}>A simple first experience before choosing a longer Aval Agam program.</p>
            <CardLink onClick={() => scrollTo("all-events")}>Explore the Workshop →</CardLink>
          </Card>

          {/* 02 — Mindful Reset Circle */}
          <Card num="02 · PRACTISE TOGETHER" title="Mindful Reset Circle">
            <p style={bodyStyle}>
              A regular emotional wellness circle for people who want consistency, guided practice and the support of the community. Each session begins with breathwork and includes mindfulness, gentle movement, reflection and journaling to help you regulate, reflect and reconnect.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[["8 circles / month", "₹2,500 + 18% GST"], ["16 circles / month", "₹5,000 + 18% GST"]].map(([plan, price]) => (
                <div key={plan} style={{ backgroundColor: 'rgba(201,162,95,0.08)', border: '1px solid rgba(201,162,95,0.25)', borderRadius: '12px', padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.7)', fontSize: '12px', marginBottom: '4px' }}>{plan}</p>
                  <p style={{ fontFamily: 'Playfair Display, serif', color: '#C9A25F', fontSize: '17px', fontWeight: 700 }}>{price}</p>
                </div>
              ))}
            </div>
            <p style={{ ...bodyStyle, fontSize: '13px' }}>
              <strong style={{ color: '#C9A25F' }}>Batch timings</strong> — Monday to Thursday: 6:00–7:00 AM · 7:00–8:00 AM · 10:30–11:30 AM · 5:30–6:30 PM<br />
              Each session lasts between 45 minutes and 1 hour.
            </p>
            <CardLink href={WHATSAPP}>Book your Circle →</CardLink>
          </Card>

          {/* 03 — Inner Clarity Program */}
          <Card num="03 · GO DEEPER" title="Inner Clarity Program">
            <p style={bodyStyle}>
              For adults ready to explore recurring emotional patterns through 1:1 psychodynamic-informed and experiential reflective work, supported by regular breath-led group practice.
            </p>
            <div style={{ backgroundColor: 'rgba(201,162,95,0.08)', border: '1px solid rgba(201,162,95,0.25)', borderRadius: '12px', padding: '14px 16px' }}>
              <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.8)', fontSize: '13px', lineHeight: 1.7 }}>
                Includes: 8 live 1:1 sessions per month · 16 Mindful Reset group circles per month
              </p>
              <p style={{ fontFamily: 'Playfair Display, serif', color: '#C9A25F', fontSize: '17px', fontWeight: 700, marginTop: '6px' }}>₹20,000 + 18% GST</p>
            </div>
            <CardLink onClick={() => scrollTo("why-different")}>Explore Inner Clarity →</CardLink>
          </Card>

          {/* 04 — Corporate Wellness */}
          <Card num="04 · FOR ORGANISATIONS" title="Corporate Wellness">
            <p style={bodyStyle}>
              Structured breathwork, mindful reset, gentle movement, reflection and emotional-regulation practices designed for real workdays.
            </p>
            <p style={bodyStyle}>Available through corporate pilots, team circles, workshops and selected Inner Clarity support.</p>
            <CardLink onClick={() => setEnquiryOpen(true)}>Enquire for Your Team →</CardLink>
          </Card>
        </div>
      </div>

      <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
    </section>
  );
}

const bodyStyle: React.CSSProperties = {
  fontFamily: 'Poppins, sans-serif',
  color: 'rgba(251,244,232,0.7)',
  fontSize: '14px',
  lineHeight: 1.75,
};

function Card({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#16362C', borderRadius: '16px', border: '1px solid rgba(201,162,95,0.25)', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>{num}</p>
      <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: '22px', fontWeight: 600, lineHeight: 1.3 }}>{title}</h3>
      {children}
    </div>
  );
}

function CardLink({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const style: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#C8734F', fontFamily: 'Poppins, sans-serif', fontSize: '14px', fontWeight: 600, textAlign: 'left', padding: 0, marginTop: 'auto', textDecoration: 'none' };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={style}>{children}</a>;
  return <button onClick={onClick} style={style}>{children}</button>;
}

// ── Corporate enquiry form ────────────────────────────────────────────────────

function EnquiryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await addDoc(collection(db, "enquiries"), { ...form, type: "corporate", createdAt: serverTimestamp() });
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again or reach us on WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  function close() {
    onClose();
    setTimeout(() => { setDone(false); setForm({ name: "", company: "", email: "", phone: "", message: "" }); }, 300);
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #EEE2D5', backgroundColor: '#fff', fontFamily: 'Poppins, sans-serif', fontSize: '14px', color: '#2F3328', outline: 'none', boxSizing: 'border-box' };

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,51,43,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#FBF4E8', borderRadius: '20px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
        {done ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '16px 0' }}>
            <CheckCircle2 size={48} style={{ color: '#0F332B' }} />
            <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: '22px', fontWeight: 700 }}>Enquiry received!</h3>
            <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '14px', lineHeight: 1.7, opacity: 0.75 }}>Thank you, {form.name.split(" ")[0]}. Our team will get back to you shortly to plan wellness for your workplace.</p>
            <button onClick={close} style={{ backgroundColor: '#0F332B', color: '#FBF4E8', fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em', border: 'none', borderRadius: '9999px', padding: '12px 28px', cursor: 'pointer', marginTop: '6px' }}>CLOSE</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Corporate Wellness</p>
                <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: '22px', fontWeight: 700 }}>Enquire for your team</h3>
              </div>
              <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2F3328', opacity: 0.5 }}><X size={18} /></button>
            </div>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input required placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
              <input required placeholder="Company / organisation" value={form.company} onChange={e => set('company', e.target.value)} style={inputStyle} />
              <input required type="email" placeholder="Work email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} />
              <input required type="tel" placeholder="Phone number" value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} />
              <textarea rows={3} placeholder="Tell us a little about your team (optional)" value={form.message} onChange={e => set('message', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
              {error && <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C8734F', fontSize: '13px' }}>{error}</p>}
              <button type="submit" disabled={sending} style={{ backgroundColor: '#0F332B', color: '#FBF4E8', fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', border: 'none', borderRadius: '9999px', padding: '14px', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1 }}>
                {sending ? 'SENDING…' : 'SEND ENQUIRY'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
