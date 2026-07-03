"use client";

const programs = [
  {
    num: "01 · ONE-TO-ONE",
    title: "Inner Clarity Program",
    text: "A guided 1:1 reflective space for adults seeking deeper self-awareness. Breathwork, reflective listening, guided journaling and clarity prompts — a gentle space to meet yourself.",
    link: "Know more →",
  },
  {
    num: "02 · TOGETHER",
    title: "Group Circles",
    text: "For women, mothers, families and adolescents. Breath-led gentle movement, meditation, journaling and shared reflection — including our Mindful Reset Circle.",
    link: "Explore circles →",
  },
  {
    num: "03 · COMMUNITY",
    title: "Workshops & Activities",
    text: "Real-life themes: emotional boundaries, self-respect, stress recovery, mindful communication, motherhood and adolescent wellness. Some short and simple, some deeper — all created with care.",
    link: "View workshops →",
  },
  {
    num: "04 · WORKPLACES",
    title: "Corporate Wellness",
    text: "Breathwork, mindful reset practices, emotional regulation and stress awareness for teams — helping employees pause, regulate, and return with steadier awareness.",
    link: "Enquire for your team →",
  },
];

export function WhatWeOffer() {
  return (
    <section id="offer" style={{ backgroundColor: '#0F332B' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-14 flex flex-col items-center gap-4">
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
            WHAT WE OFFER
          </p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: 'clamp(28px, 3.5vw, 46px)', lineHeight: 1.25, fontWeight: 600 }}>
            Four ways to begin your{' '}
            <em style={{ color: '#C9A25F', fontStyle: 'italic' }}>return.</em>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {programs.map((p, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#16362C',
                borderRadius: '16px',
                border: '1px solid rgba(201,162,95,0.25)',
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
                {p.num}
              </p>
              <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: '20px', fontWeight: 600, lineHeight: 1.3 }}>
                {p.title}
              </h3>
              <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.7)', fontSize: '14px', lineHeight: 1.75, flexGrow: 1 }}>
                {p.text}
              </p>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8734F', fontFamily: 'Poppins, sans-serif', fontSize: '13px', fontWeight: 500, textAlign: 'left', padding: 0 }}>
                {p.link}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
