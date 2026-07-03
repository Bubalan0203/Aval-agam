"use client";

const stats = [
  { value: "1:1", label: "Personal sessions" },
  { value: "8–12", label: "Persons per circle" },
  { value: "100%", label: "Judgement-free space" },
];

export function GentleInvitation() {
  return (
    <section style={{ backgroundColor: '#FBF4E8' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <div className="flex flex-col gap-5">
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            color: '#C9A25F',
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            SMALL CIRCLES, HELD WITH CARE
          </p>
          <p style={{
            fontFamily: 'Playfair Display, serif',
            color: '#0F332B',
            fontSize: 'clamp(20px, 2.5vw, 28px)',
            lineHeight: 1.55,
            fontWeight: 400,
          }}>
            Our circles stay small so every person is truly seen. Seats are limited by intention, not by marketing.
          </p>
        </div>

        {/* Right — Stat Tiles */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#0F332B',
                borderRadius: '16px',
                padding: '28px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <p style={{
                fontFamily: 'Playfair Display, serif',
                color: '#C9A25F',
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 700,
                lineHeight: 1,
              }}>
                {s.value}
              </p>
              <p style={{
                fontFamily: 'Poppins, sans-serif',
                color: '#FBF4E8',
                fontSize: '12px',
                lineHeight: 1.4,
                opacity: 0.85,
              }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
