"use client";

import { Eye, HandHeart, Leaf, Users } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Seen, not fixed",
    text: "You are met as you are, never treated as a problem to solve.",
  },
  {
    icon: HandHeart,
    title: "Welcomed, not evaluated",
    text: "No comparison, no judgement, no performance of calmness.",
  },
  {
    icon: Leaf,
    title: "Supported, not pushed",
    text: "You grow at your own pace, in your own season.",
  },
  {
    icon: Users,
    title: "Together, not alone",
    text: "Community that reminds you that you are not carrying life by yourself.",
  },
];

export function WhyDifferent() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="why-different" style={{ backgroundColor: '#C8734F' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-14 flex flex-col items-center gap-4">
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#FBF4E8', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.85 }}>
            WHY AVAL AGAM FEELS DIFFERENT
          </p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: 'clamp(28px, 3.5vw, 46px)', lineHeight: 1.25, fontWeight: 600 }}>
            Here, you are{' '}
            <em style={{ color: '#0F332B', fontStyle: 'italic' }}>seen</em>
            , not fixed.
          </h2>
          <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.85)', fontSize: '17px', lineHeight: 1.7, maxWidth: '480px' }}>
            We do not believe wellness should feel like another pressure. We believe it should feel like a return.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: '#B86F52',
                  borderRadius: '16px',
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(251,244,232,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color: '#FBF4E8' }} />
                </div>
                <h3 style={{ fontFamily: 'Playfair Display, serif', color: '#FBF4E8', fontSize: '18px', fontWeight: 600 }}>
                  {f.title}
                </h3>
                <p style={{ fontFamily: 'Poppins, sans-serif', color: 'rgba(251,244,232,0.8)', fontSize: '14px', lineHeight: 1.7 }}>
                  {f.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <button
            onClick={() => scrollTo('offer')}
            style={{
              backgroundColor: 'transparent',
              color: '#FBF4E8',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.1em',
              fontWeight: 600,
              border: '2px solid #C9A25F',
              cursor: 'pointer',
              borderRadius: '9999px',
              padding: '13px 32px',
            }}
            className="hover:bg-[#C9A25F] hover:text-[#0F332B] transition-all"
          >
            EXPLORE GROUP CIRCLES
          </button>
        </div>
      </div>
    </section>
  );
}
