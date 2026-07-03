"use client";

const pillars = [
  {
    letter: "R",
    eyebrow: "01 · REGULATE",
    title: "Regulate",
    text: "Settle the body and the breath first. Through breathwork and body awareness, learn to calm the nervous system and find your anchor in the middle of a full day.",
  },
  {
    letter: "R",
    eyebrow: "02 · REFLECT",
    title: "Reflect",
    text: "Meet your inner world with kindness. Through mindfulness, journaling and thought observation, understand what you are carrying and why the same patterns repeat.",
  },
  {
    letter: "R",
    eyebrow: "03 · REDIRECT",
    title: "Redirect",
    text: "Move from awareness into intention. Gently redirect your energy towards clarity, steadiness and choices that come from awareness, not pressure.",
  },
];

export function ThreePillars() {
  return (
    <section style={{ backgroundColor: '#FBF4E8' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-14 flex flex-col items-center gap-4">
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            color: '#C9A25F',
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            OUR WAY OF WORKING
          </p>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            color: '#0F332B',
            fontSize: 'clamp(32px, 4vw, 52px)',
            lineHeight: 1.2,
            fontWeight: 600,
            maxWidth: '600px',
          }}>
            Learn to regulate, reflect and{' '}
            <em style={{ color: '#C8734F', fontStyle: 'italic' }}>redirect.</em>
          </h2>
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            color: '#2F3328',
            fontSize: '16px',
            lineHeight: 1.75,
            maxWidth: '520px',
          }}>
            Three gentle movements that hold every practice at Aval Agam. Once you learn them, they quietly change how you meet your day.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '36px 32px',
                boxShadow: '0 4px 24px rgba(15,51,43,0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <p style={{
                fontFamily: 'Playfair Display, serif',
                color: '#C8734F',
                fontSize: '72px',
                fontStyle: 'italic',
                lineHeight: 1,
                fontWeight: 700,
              }}>
                {p.letter}
              </p>
              <p style={{
                fontFamily: 'Poppins, sans-serif',
                color: '#C9A25F',
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                {p.eyebrow}
              </p>
              <h3 style={{
                fontFamily: 'Playfair Display, serif',
                color: '#0F332B',
                fontSize: '22px',
                fontWeight: 600,
              }}>
                {p.title}
              </h3>
              <p style={{
                fontFamily: 'Poppins, sans-serif',
                color: '#2F3328',
                fontSize: '15px',
                lineHeight: 1.75,
              }}>
                {p.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
