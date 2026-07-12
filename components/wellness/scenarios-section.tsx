"use client";

const scenarios = [
  {
    num: "01",
    text: "A familiar disagreement begins. Instead of immediately defending, withdrawing or overexplaining, you recognise the old response beginning and create a little more",
    highlight: "space",
    end: "before speaking.",
  },
  {
    num: "02",
    text: "A pressured afternoon at work. You take a two-minute mindful reset, and the",
    highlight: "clarity",
    end: "returns before the next meeting.",
  },
  {
    num: "03",
    text: "Your daughter is overwhelmed. Because you've practiced together, she names her feeling instead of hiding it — and you meet her with",
    highlight: "calm.",
    end: "",
  },
  {
    num: "04",
    text: "A difficult emotion returns. Instead of treating it as a problem to remove, you become curious about what it may be protecting, understand the pattern beneath, and finally hear what your inner world is",
    highlight: "asking",
    end: "for.",
  },
];

export function ScenariosSection() {
  return (
    <section style={{ backgroundColor: '#FBF4E8' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
        {/* Header */}
        <div className="text-center mb-14 flex flex-col items-center gap-4">
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 600 }}>
            WHERE IT LANDS IN LIFE
          </p>
          <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#0F332B', fontSize: 'clamp(28px, 3.5vw, 46px)', lineHeight: 1.25, fontWeight: 600 }}>
            How it shows up in{' '}
            <em style={{ color: '#C8734F', fontStyle: 'italic' }}>real life.</em>
          </h2>
          <p style={{ fontFamily: 'Poppins, sans-serif', color: '#C9A25F', fontSize: '12px', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600 }}>
            From automatic reaction to greater choice
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-[900px] mx-auto">
          {scenarios.map((s, i) => (
            <div key={i} className="flex gap-5 items-start">
              <p style={{
                fontFamily: 'Playfair Display, serif',
                color: '#C8734F',
                fontSize: 'clamp(48px, 5vw, 64px)',
                fontStyle: 'italic',
                fontWeight: 700,
                lineHeight: 1,
                flexShrink: 0,
              }}>
                {s.num}
              </p>
              <p style={{ fontFamily: 'Poppins, sans-serif', color: '#2F3328', fontSize: '15px', lineHeight: 1.8, paddingTop: '10px' }}>
                {s.text}{' '}
                <span style={{
                  backgroundColor: '#C8734F',
                  color: '#FBF4E8',
                  borderRadius: '4px',
                  padding: '1px 7px',
                  fontWeight: 600,
                  fontSize: '13px',
                }}>
                  {s.highlight}
                </span>
                {s.end ? ` ${s.end}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
