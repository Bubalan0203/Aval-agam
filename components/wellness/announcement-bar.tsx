"use client";

export function AnnouncementBar() {
  return (
    <div style={{ backgroundColor: '#0F332B', fontFamily: 'Poppins, sans-serif' }} className="w-full py-2.5 px-4 text-center">
      <p style={{ color: '#FBF4E8', fontSize: '13px', letterSpacing: '0.02em' }}>
        A soulspace for women, families & mindful workplaces in Coimbatore.{' '}
        <span style={{ color: '#EEE2D5' }}>—</span>{' '}
        <a href="#all-events" onClick={(e) => { e.preventDefault(); document.getElementById('all-events')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ color: '#C8734F', textDecoration: 'none', fontWeight: 600 }}>
          Begin with the ₹699 Mindful Reset Workshop →
        </a>
      </p>
    </div>
  );
}
