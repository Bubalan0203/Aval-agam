"use client";

const WHATSAPP = "https://wa.me/919952697993";

export function FinalCTA() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

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
          READY TO LOOK BENEATH WHAT KEEPS REPEATING?
        </p>
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: 'clamp(36px, 5vw, 60px)', lineHeight: 1.15, fontWeight: 600 }}>
          Begin with{' '}
          <em style={{ color: '#C8734F', fontStyle: 'italic' }}>Inner Clarity.</em>
        </h2>
        <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.75)', fontSize: '17px', lineHeight: 1.8, maxWidth: '540px' }}>
          You do not need to wait until life feels unbearable. You can begin because you are curious. Because the same pattern has returned. Because understanding yourself matters. Because you are ready to practise a different way of meeting your life.
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 justify-center mt-2">
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
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
              textDecoration: 'none',
              display: 'inline-block',
            }}
            className="hover:opacity-90 transition-opacity"
          >
            BOOK INNER CLARITY PROGRAM
          </a>
          <button
            onClick={() => scrollTo('all-events')}
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
            }}
            className="hover:border-[#FBF4E8] transition-all"
          >
            BEGIN WITH THE ₹699 WORKSHOP →
          </button>
          <a
            href={WHATSAPP}
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
          Coimbatore · Online Worldwide · Women-centered & family-inclusive · Know, Grow & Thrive — together.
        </p>
      </div>
    </section>
  );
}
