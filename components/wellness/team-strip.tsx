"use client";

const team = [
  {
    name: "Brindha Thiyagarajan",
    role: "FOUNDER",
    desc: "Holds the founding vision, wellness philosophy and every client's journey.",
    initials: "BT",
  },
  {
    name: "Dinesh Prabhakaran",
    role: "MARKETING HEAD",
    desc: "Helps the right people and organisations discover Aval Agam.",
    initials: "DP",
  },
  {
    name: "Divya Shivalingam",
    role: "STRATEGIC GROWTH ADVISOR",
    desc: "Guides growth while protecting the purpose Aval Agam was born from.",
    initials: "DS",
  },
];

export function TeamStrip() {
  return (
    <section id="team" style={{ backgroundColor: '#FBF4E8' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-14 flex flex-col items-center gap-4">
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
            THE PEOPLE WHO HOLD THE SPACE
          </p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1.25, fontWeight: 600 }}>
            A collective, not a{' '}
            <em style={{ color: '#C8734F', fontStyle: 'italic' }}>clinic.</em>
          </h2>
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '16px', lineHeight: 1.75, maxWidth: '500px' }}>
            No single person or method can meet every season of human life. Aval Agam is growing as a multidisciplinary emotional wellness collective.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[860px] mx-auto">
          {team.map((member, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '36px 28px',
                boxShadow: '0 2px 16px rgba(15,51,43,0.07)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#EEE2D5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(201,162,95,0.3)',
              }}>
                <span style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: '20px', fontWeight: 600 }}>
                  {member.initials}
                </span>
              </div>
              <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: '18px', fontWeight: 600 }}>
                {member.name}
              </h3>
              <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>
                {member.role}
              </p>
              <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '14px', lineHeight: 1.65 }}>
                {member.desc}
              </p>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', color: '#2F3328', fontSize: '15px', textAlign: 'center', marginTop: '36px', opacity: 0.7 }}>
          …alongside a growing circle of movement practitioners, counsellors, breathwork and meditation guides, and visiting facilitators.
        </p>
      </div>
    </section>
  );
}
