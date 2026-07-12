"use client";

const FOUNDER_IMAGE = "https://images.unsplash.com/photo-1758274526589-e33e9707ddca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHdlbGxuZXNzJTIwcG9ydHJhaXQlMjB5b2dhJTIwY2FsbSUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3ODMwMTM1MTR8MA&ixlib=rb-4.1.0&q=80&w=1080";

const credentials = [
  "M.A. Yoga for Human Excellence",
  "Diploma in Psychology",
  "B.Tech Biotechnology",
  "Psychodynamics & Experiential Psychotherapy",
  "Founder · Aval Agam",
];

export function FounderSection() {
  return (
    <section id="founder" style={{ backgroundColor: '#0F332B' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Left — Portrait */}
        <div style={{ position: 'relative' }}>
          <div style={{ borderRadius: '24px', overflow: 'hidden', aspectRatio: '3/4' }}>
            <img
              src={FOUNDER_IMAGE}
              alt="Brindha Thiyagarajan, Founder of Aval Agam"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          {/* Floating label */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            backgroundColor: 'rgba(15,51,43,0.92)',
            border: '1px solid rgba(201,162,95,0.4)',
            borderRadius: '9999px',
            padding: '8px 18px',
          }}>
            <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
              YOUR GUIDE — Brindha Thiyagarajan
            </p>
          </div>
        </div>

        {/* Right — Content */}
        <div className="flex flex-col gap-6 justify-center">
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
            HELD BY BRINDHA THIYAGARAJAN
          </p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1.25, fontWeight: 600 }}>
            Walking this path{' '}
            <em style={{ color: '#C8734F', fontStyle: 'italic' }}>beside</em>{' '}
            you.
          </h2>

          {/* Quote */}
          <blockquote style={{
            borderLeft: '3px solid #C9A25F',
            paddingLeft: '20px',
            marginLeft: 0,
          }}>
            <p style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', color: 'rgba(251,244,232,0.85)', fontSize: '16px', lineHeight: 1.8 }}>
              "I didn't create Aval Agam because I had all the answers. I created it because, for a long time, I didn't. I'm not here to preach enlightenment. I'm walking this path beside you — learning, unlearning, creating, and growing. Aval Agam exists because I needed it. And now, I offer it to every woman who needs it too."
            </p>
            <footer style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '13px', marginTop: '12px', fontWeight: 500 }}>
              — Brindha Thiyagarajan, Founder, Aval Agam
            </footer>
          </blockquote>

          <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.75)', fontSize: '15px', lineHeight: 1.75 }}>
            With a B.Tech in Biotechnology, an M.A. in Yoga for Human Excellence and a Diploma in Psychology, she brings together breath awareness, mindfulness, reflective dialogue, journaling and psychology-informed inner work. Her Inner Clarity approach draws from psychodynamic and experiential principles while remaining firmly positioned as non-clinical emotional wellness. Aval Agam — meaning Her Inner World — was born from her own journey of coming home to herself.
          </p>

          {/* Credential chips */}
          <div className="flex flex-wrap gap-2">
            {credentials.map((c, i) => (
              <span
                key={i}
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  color: '#C9A25F',
                  fontSize: '11px',
                  fontWeight: 500,
                  border: '1px solid rgba(201,162,95,0.45)',
                  borderRadius: '9999px',
                  padding: '5px 14px',
                  letterSpacing: '0.03em',
                }}
              >
                {c}
              </span>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
