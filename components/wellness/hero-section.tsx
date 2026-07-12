"use client";

import { MapPin, Leaf, Sparkles } from "lucide-react";

const HERO_IMAGE = "https://images.unsplash.com/photo-1571935538821-8ecb6b4dea17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxJbmRpYW4lMjB3b21hbiUyMG1lZGl0YXRpbmclMjBzZXJlbmUlMjB3YXJtJTIwbGlnaHQlMjBsb3R1c3xlbnwxfHx8fDE3ODMwMTM1MDl8MA&ixlib=rb-4.1.0&q=80&w=1080";

export function HeroSection() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="about" style={{ backgroundColor: '#FBF4E8' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left */}
        <div className="flex flex-col gap-6">
          {/* Eyebrow */}
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            color: '#C9A25F',
            fontSize: '11px',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            AVAL AGAM · HER INNER WORLD
          </p>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            color: '#0F332B',
            fontSize: 'clamp(40px, 5vw, 64px)',
            lineHeight: 1.15,
            fontWeight: 600,
          }}>
            A soulspace to know yourself,<br />
            grow with awareness &{' '}
            <em style={{ color: '#C8734F', fontStyle: 'italic' }}>thrive.</em>
          </h1>

          {/* Subtext */}
          <p style={{
            fontFamily: 'Poppins, sans-serif',
            color: '#2F3328',
            fontSize: '17px',
            lineHeight: 1.75,
            maxWidth: '520px',
          }}>
            The world inside us is often louder than the world outside. We carry thoughts we do not speak, emotions we do not fully understand, roles we move through every day. Aval Agam was born for that return — a gentle space to pause, breathe, listen inward and return to yourself with greater awareness, steadiness and inner clarity.
          </p>

          {/* Info Pills */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            {[
              { icon: <Sparkles size={13} style={{ color: '#C9A25F' }} />, text: 'Non-clinical and psychology-informed' },
              { icon: <Leaf size={13} style={{ color: '#C9A25F' }} />, text: 'Beginner-friendly' },
              { icon: <MapPin size={13} style={{ color: '#C9A25F' }} />, text: 'Online and Coimbatore' },
            ].map(({ icon, text }) => (
              <span key={text} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', borderRadius: '9999px', padding: '8px 16px', fontFamily: 'Poppins, sans-serif', fontSize: '13px', color: '#2F3328', boxShadow: '0 2px 10px rgba(15,51,43,0.07)', whiteSpace: 'nowrap' }}>
                {icon}{text}
              </span>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-4 mt-2">
            <button
              onClick={() => scrollTo("all-events")}
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
                padding: '14px 28px',
              }}
              className="hover:opacity-90 transition-opacity"
            >
              BEGIN WITH THE ₹699 MINDFUL RESET WORKSHOP →
            </button>
            <button
              onClick={() => scrollTo("offer")}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#C8734F',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Explore Aval Agam Programs →
            </button>
          </div>

          {/* Small Note */}
          <p style={{ fontFamily: 'Poppins, sans-serif', fontSize: '13px', color: '#2F3328', opacity: 0.7, margin: 0, marginTop: '4px' }}>
            You do not need to arrive with all the answers. You only need the willingness to look within.
          </p>
        </div>

        {/* Right — Hero Image */}
        <div style={{ position: 'relative' }}>
          <div style={{
            borderRadius: '24px',
            overflow: 'hidden',
            aspectRatio: '4/5',
            position: 'relative',
          }}>
            {/* Radial glow behind */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(200,115,79,0.15) 0%, transparent 70%)',
              zIndex: 1,
              pointerEvents: 'none',
            }} />
            <img
              src={HERO_IMAGE}
              alt="Serene woman meditating in warm light"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
