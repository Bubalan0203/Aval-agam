"use client";
import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { getEvents } from "@/lib/firestore";
import type { Event } from "@/lib/firestore";
import { EventCard } from "@/components/EventCard";

import { AnnouncementBar } from "@/components/wellness/announcement-bar";
import { HeroSection } from "@/components/wellness/hero-section";
import { InfoStrip } from "@/components/wellness/info-strip";
import { OnePointClear } from "@/components/wellness/one-point-clear";
import { DoYouFeel } from "@/components/wellness/do-you-feel";
import { WhoItsFor } from "@/components/wellness/who-its-for";
import { ThreePillars } from "@/components/wellness/three-pillars";
import { ScenariosSection } from "@/components/wellness/scenarios-section";
import { WhatWeOffer } from "@/components/wellness/what-we-offer";
import { WhyDifferent } from "@/components/wellness/why-different";
import { FounderSection } from "@/components/wellness/founder-section";
import { TeamStrip } from "@/components/wellness/team-strip";
import { GentleInvitation } from "@/components/wellness/gentle-invitation";
import { FAQSection } from "@/components/wellness/faq-section";
import { FinalCTA } from "@/components/wellness/final-cta";

const CATEGORIES = ["All", "Author Talk", "Workshop", "Panel Event", "Open Mic", "Family", "Retreat"];

export default function HomePage() {
  const [category, setCategory] = useState("All");
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => { getEvents().then(setEvents); }, []);

  const filtered = events.filter((e) => category === "All" || e.category === category);

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* ── Wellness sections ── */}
      <AnnouncementBar />
      <HeroSection />

      {/* ── Events listing ── */}
      <InfoStrip />

      {/* All Events */}
      <section id="all-events" style={{ backgroundColor: "#FBF4E8", padding: "64px 24px" }}>
        <div className="max-w-7xl mx-auto">
          <div style={{ marginBottom: "24px" }}>
            <p style={{ color: "#C9A25F", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>DISCOVER</p>
            <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 700 }}>All upcoming events</h2>
          </div>

          {/* Category filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{ backgroundColor: category === cat ? "#0F332B" : "#ffffff", color: category === cat ? "#FBF4E8" : "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "12px", fontWeight: 500, border: `1.5px solid ${category === cat ? "#0F332B" : "#EEE2D5"}`, borderRadius: "9999px", padding: "7px 18px", cursor: "pointer", transition: "all 0.15s" }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Event grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((event) => <EventCard key={event.id} event={event} />)}
            </div>
          ) : (
            <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", opacity: 0.45, padding: "8px 0 16px" }}>No events found.</p>
          )}
        </div>
      </section>

      {/* ── Wellness sections ── */}
      <OnePointClear />
      <DoYouFeel />
      <WhoItsFor />
      <ThreePillars />
      <ScenariosSection />
      <WhatWeOffer />
      <WhyDifferent />
      <FounderSection />
      <TeamStrip />
      <GentleInvitation />
      <FAQSection />
      <FinalCTA />
    </div>
  );
}
