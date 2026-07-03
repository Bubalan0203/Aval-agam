"use client";

const listItems = [
  { text: "to pause", highlight: false },
  { text: "to breathe", highlight: false },
  { text: "to be seen", highlight: true },
  { text: "to reflect", highlight: false },
  { text: "to belong", highlight: false },
  { text: "to bloom", highlight: false },
];

export function WhoItsFor() {
  return (
    <section id="why" style={{ backgroundColor: '#FBF4E8' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
        {/* Left — Dark green card */}
        <div style={{
          background: 'linear-gradient(160deg, #0F332B 0%, #1a4a3d 100%)',
          borderRadius: '24px',
          padding: '56px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '20px',
          minHeight: '400px',
        }}>
          {listItems.map((item, i) => (
            <p
              key={i}
              style={{
                fontFamily: 'Playfair Display, serif',
                fontStyle: 'italic',
                fontSize: 'clamp(22px, 3vw, 30px)',
                color: item.highlight ? '#C9A25F' : 'rgba(251,244,232,0.75)',
                lineHeight: 1.3,
                fontWeight: item.highlight ? 600 : 400,
              }}
            >
              {item.text}
            </p>
          ))}
        </div>

        {/* Right */}
        <div className="flex flex-col gap-6 justify-center">
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            color: '#C9A25F',
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            FOR WHOM
          </p>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            color: '#0F332B',
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            lineHeight: 1.25,
            fontWeight: 600,
          }}>
            Still wondering if this{' '}
            <em style={{ color: '#C8734F', fontStyle: 'italic' }}>soulspace</em>{' '}
            is for you?
          </h2>
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '16px', lineHeight: 1.75 }}>
            Aval Agam is created for people who are carrying life silently. You do not need to be flexible. You do not need prior experience. You do not need to arrive with all the answers.
          </p>
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '16px', lineHeight: 1.75 }}>
            Founded by Brindha Thiyagarajan — with a background in Biotechnology, an M.A. in Yoga for Human Excellence and a Diploma in Psychology — Aval Agam brings together breathwork, mindfulness, meditation, gentle movement, journaling and reflective community practice.
          </p>
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '16px', lineHeight: 1.75 }}>
            Whether you are a woman carrying invisible weight, a mother, a student, a family, or a team — this space was made with you in mind.
          </p>
        </div>
      </div>
    </section>
  );
}
