"use client";

export function OnePointClear() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="one-point-clear" style={{ backgroundColor: '#FBF4E8' }} className="w-full">
      <div className="max-w-[720px] mx-auto px-6 py-20 lg:py-28 flex flex-col items-center gap-6 text-center">
        <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
          A QUIET ASIDE
        </p>
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1.25, fontWeight: 600 }}>
          We want to make{' '}
          <em style={{ color: '#C8734F', fontStyle: 'italic' }}>one thing</em>{' '}
          clear.
        </h2>
        <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '17px', lineHeight: 1.8, maxWidth: '600px' }}>
          Aval Agam is a non-clinical emotional wellness space where you are welcomed without pressure to perform. Aval Agam is not a clinic and not a therapy replacement — it is a soulspace where breath becomes an anchor, movement becomes listening, journaling becomes clarity, and community becomes a reminder that you are not alone.
        </p>
        <button
          onClick={() => scrollTo('all-events')}
          style={{
            backgroundColor: '#0F332B',
            color: '#FBF4E8',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '12px',
            letterSpacing: '0.1em',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            borderRadius: '9999px',
            padding: '14px 32px',
            marginTop: '8px',
          }}
          className="hover:opacity-90 transition-opacity"
        >
          BEGIN WITH ONE GUIDED PAUSE
        </button>
      </div>
    </section>
  );
}
