"use client";
import { useState } from "react";
import { Menu, X, BookOpen } from "lucide-react";
import Image from "next/image";

const NAV = [
  { label: "Events", anchor: "all-events" },
  { label: "About", anchor: "about" },
  { label: "Contact", anchor: "final-cta" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{ backgroundColor: "#FBF4E8", borderBottom: "1px solid #EEE2D5" }} className="sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-[68px]">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo("about")}>
          <Image src="/logo.png" alt="ChapterOne" width={48} height={48} style={{ objectFit: "contain" }} />
          <div>
            <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "17px", fontWeight: 700, lineHeight: 1.1 }}>ChapterOne</p>
            <p style={{ color: "#C9A25F", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Literary Events</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {NAV.map((n) => (
            <button key={n.label} onClick={() => scrollTo(n.anchor)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2F3328", fontSize: "14px", fontWeight: 400 }} className="hover:opacity-70 transition-opacity">
              {n.label}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => scrollTo("all-events")} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", border: "none", borderRadius: "9999px", padding: "10px 22px", cursor: "pointer" }}>BROWSE EVENTS</button>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer" }} className="md:hidden">
          {menuOpen ? <X size={22} color="#0F332B" /> : <Menu size={22} color="#0F332B" />}
        </button>
      </div>
      {menuOpen && (
        <div style={{ backgroundColor: "#FBF4E8", borderTop: "1px solid #EEE2D5" }} className="md:hidden px-6 py-4 flex flex-col gap-4">
          {NAV.map((n) => (
            <button key={n.label} onClick={() => { scrollTo(n.anchor); setMenuOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2F3328", fontSize: "15px", textAlign: "left" }}>{n.label}</button>
          ))}
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  return (
    <footer style={{ backgroundColor: "#0B2621" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={22} style={{ color: "#C9A25F" }} />
            <p style={{ fontFamily: "Playfair Display, serif", color: "#FBF4E8", fontSize: "18px", fontWeight: 700 }}>ChapterOne</p>
          </div>
          <p style={{ color: "rgba(251,244,232,0.6)", fontSize: "14px", lineHeight: 1.75 }}>Coimbatore&apos;s home for literary events — author talks, workshops, retreats, and more.</p>
        </div>
        <div>
          <p style={{ color: "#C9A25F", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: "16px" }}>Quick Links</p>
          {[["Browse Events", "all-events"], ["About Us", "about"], ["Contact", "final-cta"]].map(([l, id]) => (
            <button key={l} onClick={() => scrollTo(id)} style={{ display: "block", background: "none", border: "none", cursor: "pointer", color: "rgba(251,244,232,0.6)", fontSize: "14px", textAlign: "left", marginBottom: "8px" }}>{l}</button>
          ))}
        </div>
        <div>
          <p style={{ color: "#C9A25F", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: "16px" }}>Contact</p>
          <p style={{ color: "rgba(251,244,232,0.6)", fontSize: "14px", lineHeight: 1.75 }}>hello@chapterone.in<br />Coimbatore, Tamil Nadu</p>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(201,162,95,0.15)" }} className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p style={{ color: "rgba(251,244,232,0.35)", fontSize: "12px" }}>© 2026 ChapterOne · All rights reserved</p>
        <p style={{ fontFamily: "Playfair Display, serif", fontStyle: "italic", color: "rgba(201,162,95,0.5)", fontSize: "13px" }}>Read · Connect · Discover</p>
      </div>
    </footer>
  );
}
