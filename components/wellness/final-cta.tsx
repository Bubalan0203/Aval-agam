"use client";

export function FinalCTA() {
  return (
    <section id="final-cta" style={{ backgroundColor: '#0F332B', position: 'relative', overflow: 'hidden' }} className="w-full">
      {/* Radial glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse at center, rgba(200,115,79,0.22) 0%, rgba(201,162,95,0.08) 50%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      <div className="max-w-[720px] mx-auto px-6 py-24 lg:py-32 flex flex-col items-center gap-6 text-center" style={{ position: 'relative' }}>
        <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
          BEGIN WITH ONE GUIDED PAUSE
        </p>
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: 'clamp(36px, 5vw, 60px)', lineHeight: 1.15, fontWeight: 600 }}>
          Begin the return,{' '}
          <em style={{ color: '#C8734F', fontStyle: 'italic' }}>gently.</em>
        </h2>
        <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.75)', fontSize: '17px', lineHeight: 1.8, maxWidth: '520px' }}>
          You do not have to wait until life feels too heavy. Start with one breath. One reflection. One session. One circle. One meaningful pause.
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mt-2">
          <button
            style={{
              backgroundColor: '#C9A25F',
              color: '#0F332B',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.1em',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              borderRadius: '9999px',
              padding: '15px 32px',
            }}
            className="hover:opacity-90 transition-opacity"
          >
            BOOK AN INNER CLARITY SESSION
          </button>
          <a
            href="https://wa.me/919999999999"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: 'transparent',
              color: '#FBF4E8',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.1em',
              fontWeight: 600,
              border: '1px solid rgba(251,244,232,0.4)',
              cursor: 'pointer',
              borderRadius: '9999px',
              padding: '15px 32px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
            className="hover:border-[#FBF4E8] transition-all"
          >
            WHATSAPP AVAL AGAM
          </a>
        </div>

        <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.45)', fontSize: '13px', marginTop: '4px', letterSpacing: '0.05em' }}>
          Coimbatore · Women-centered & family-inclusive · Know, Grow & Thrive — together.
        </p>
      </div>
    </section>
  );
}
