"use client";

const WHATSAPP = "https://wa.me/919952697993";
const WHATSAPP_CORPORATE = "https://wa.me/919952697993?text=" + encodeURIComponent("Hi Aval Agam, I'd like to enquire about Corporate Wellness for my team.");

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function WhatWeOffer() {
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
              A ₹699 live online or offline workshop introducing breath awareness, gentle movement, mindfulness, journaling and emotional reflection.
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
              {[["8 circles / month", "₹2,500"], ["16 circles / month", "₹5,000"]].map(([plan, price]) => (
                <div key={plan} style={{ backgroundColor: 'rgba(201,162,95,0.08)', border: '1px solid rgba(201,162,95,0.25)', borderRadius: '12px', padding: '14px 16px' }}>
                  <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.7)', fontSize: '12px', marginBottom: '4px' }}>{plan}</p>
                  <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '16px', fontWeight: 700 }}>{price}</p>
                </div>
              ))}
            </div>
            <p style={{ ...bodyStyle, fontSize: '13px' }}>
              <strong style={{ color: '#C9A25F' }}>Batch timings</strong> — Monday to Thursday: 6:00–7:00 AM · 7:00–8:00 AM · 10:30–11:30 AM · 2:30–3:30 PM · 5:30–6:30 PM<br />
              Each session lasts between 45 minutes and 1 hour.
            </p>
            <CardLink href={WHATSAPP}>Book your Circle →</CardLink>
          </Card>

          {/* 03 — Inner Clarity Program */}
          <Card num="03 · GO DEEPER" title="Inner Clarity Program">
            <p style={bodyStyle}>
              For adults ready to explore recurring emotional patterns through 1:1 psychodynamic-informed and experiential reflective work, supported by regular breath-led group practice.
            </p>
            <p style={bodyStyle}>
              The 1:1 sessions are the core part of the program. Group circles are available for clients who feel comfortable joining a shared practice space. If a client prefers private work only, they may skip the group circles.
            </p>
            <div style={{ backgroundColor: 'rgba(201,162,95,0.08)', border: '1px solid rgba(201,162,95,0.25)', borderRadius: '12px', padding: '14px 16px' }}>
              <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.8)', fontSize: '13px', lineHeight: 1.7 }}>
                <strong style={{ color: '#C9A25F' }}>Includes:</strong><br />
                8 live 1:1 Inner Clarity sessions per month — online or offline, based on client&apos;s availability<br />
                16 Mindful Reset group circles per month — included as an optional add-on for continued breathwork, mindfulness, journaling and group practice
              </p>
              <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '16px', fontWeight: 700, marginTop: '8px' }}>₹20,000</p>
            </div>
            <CardLink onClick={() => scrollTo("why-different")}>Explore Inner Clarity →</CardLink>
          </Card>

          {/* 04 — Corporate Wellness */}
          <Card num="04 · FOR ORGANISATIONS" title="Corporate Wellness">
            <p style={bodyStyle}>
              Structured breathwork, mindful reset, gentle movement, reflection and emotional-regulation practices designed for real workdays.
            </p>
            <p style={bodyStyle}>Available through corporate pilots, team circles, workshops and selected Inner Clarity support.</p>
            <CardLink href={WHATSAPP_CORPORATE}>Enquire for Your Team →</CardLink>
          </Card>
        </div>
      </div>
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
