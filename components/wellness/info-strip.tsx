"use client";

const items = [
  { label: "INNER CLARITY", value: "Psychodynamic-informed reflection and experiential inner work" },
  { label: "GROUP PRACTICE", value: "Breathwork · Movement · Journaling · Mindfulness" },
  { label: "OUR METHOD", value: "Regulate · Reflect · Redirect" },
  { label: "OUR PATHWAYS", value: "Workshop · Mindful Reset Circle · Inner Clarity" },
];

export function InfoStrip() {
  return (
    <section style={{ backgroundColor: '#0F332B' }} className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col gap-2 items-center text-center lg:items-start lg:text-left" style={{ padding: '0 16px' }}>
            {i > 0 && (
              <div
                className="hidden lg:block absolute"
                style={{ width: '1px', height: '60px', backgroundColor: 'rgba(201,162,95,0.3)', left: 0, top: '50%', transform: 'translateY(-50%)' }}
              />
            )}
            <p style={{
              fontFamily: 'Poppins, sans-serif',
              color: '#C9A25F',
              fontSize: '10px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              {item.label}
            </p>
            <p style={{
              fontFamily: 'Playfair Display, serif',
              color: '#FBF4E8',
              fontSize: '17px',
              lineHeight: 1.5,
              fontWeight: 400,
            }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
