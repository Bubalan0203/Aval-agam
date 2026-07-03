"use client";

const quotes = [
  "I look strong outside, but I feel tired within.",
  "I hold everyone together, and quietly forget myself.",
  "My days are full, yet I feel scattered and far from myself.",
  "I want to understand my emotions instead of being carried by them.",
  "I wish my family could slow down and breathe together.",
  "I want calm to be a way of living, not another task on my list.",
];

export function DoYouFeel() {
  return (
    <section style={{ backgroundColor: '#EEE2D5' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-12 flex flex-col items-center gap-4">
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            color: '#C9A25F',
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            A QUIET INVENTORY
          </p>
          <h2 style={{
            fontFamily: 'Playfair Display, serif',
            color: '#0F332B',
            fontSize: 'clamp(32px, 4vw, 52px)',
            lineHeight: 1.2,
            fontWeight: 600,
          }}>
            Do you often{' '}
            <em style={{ color: '#C8734F', fontStyle: 'italic' }}>feel…</em>
          </h2>
        </div>

        {/* Quote Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[860px] mx-auto">
          {quotes.map((quote, i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '28px 28px 28px 36px',
                boxShadow: '0 2px 12px rgba(15,51,43,0.06)',
                position: 'relative',
              }}
            >
              <span style={{
                position: 'absolute',
                top: '18px',
                left: '18px',
                fontFamily: 'Playfair Display, serif',
                color: '#C8734F',
                fontSize: '36px',
                lineHeight: 1,
                fontStyle: 'italic',
                opacity: 0.6,
              }}>
                "
              </span>
              <p style={{
                fontFamily: 'Playfair Display, serif',
                color: '#2F3328',
                fontSize: '16px',
                fontStyle: 'italic',
                lineHeight: 1.65,
                paddingTop: '10px',
              }}>
                {quote}
              </p>
            </div>
          ))}
        </div>

        {/* Closing line */}
        <p style={{
          fontFamily: 'Playfair Display, serif',
          color: '#0F332B',
          fontSize: '22px',
          textAlign: 'center',
          marginTop: '48px',
          lineHeight: 1.5,
        }}>
          If yes, you are in the{' '}
          <em style={{ color: '#C8734F', fontStyle: 'italic' }}>right place.</em>
        </p>
      </div>
    </section>
  );
}
