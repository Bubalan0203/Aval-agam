"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, ArrowLeft, X } from "lucide-react";
import { getEvent, getEvents } from "@/lib/firestore";
import type { Event } from "@/lib/firestore";
import { legacySessions, sessionAvailable } from "@/lib/event-sessions";
import { BookingModal } from "@/components/BookingModal";
import { EventDescription } from "@/components/EventDescription";
import { EventMediaGallery } from "@/components/EventMediaGallery";
import { EventCard } from "@/components/EventCard";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}


export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [otherEvents, setOtherEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getEvent(id), getEvents()]).then(([evt, all]) => {
      setEvent(evt);

      setOtherEvents(
        all
          .filter(e => e.id !== id && legacySessions(e).some(s => sessionAvailable(s)))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3)
      );
      setLoading(false);
    });
  }, [id]);

  // Reset after async content mounts as well as when navigating between events.
  useEffect(() => {
    if (!loading && event?.id === id) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [id, loading, event?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxImg(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Lock page scroll while the lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightboxImg ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxImg]);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "15px", opacity: 0.5 }}>Loading event…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "24px" }}>Event not found</p>
        <button type="button" onClick={() => router.push("/#all-events")} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "9999px", padding: "12px 24px", cursor: "pointer" }}>Back to Events</button>
      </div>
    );
  }

  const sessions = legacySessions(event);
  const selected = sessions.find(s => s.id === selectedSessionId) ?? sessions.find(s => sessionAvailable(s));
  const bookingEvent = selected ? { ...event, selectedSessionId: selected.id, date: selected.date, startTime: selected.startTime, endTime: selected.endTime, ticketTypes: event.ticketTypes.map(t => ({ ...t, sold: selected.sold[t.id] ?? 0 })) } : event;
  const isSoldOut = !selected || !sessionAvailable(selected) || bookingEvent.ticketTypes.every(t => t.sold >= t.available);

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }}>

      {/* Hero banner */}
      <section style={{ position: "relative", height: "clamp(280px, 40vw, 460px)", overflow: "hidden" }}>
        {event.image ? (
          <img src={event.image} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", backgroundColor: "#0F332B" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,51,43,0.25) 0%, rgba(15,51,43,0.8) 100%)" }} />
        <div style={{ position: "absolute", bottom: "36px", left: 0, right: 0, padding: "0 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ backgroundColor: isSoldOut ? "rgba(47,51,40,0.3)" : "rgba(15,51,43,0.3)", color: "#FBF4E8", border: "1px solid rgba(255,255,255,0.2)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: "9999px", padding: "4px 14px" }}>{isSoldOut ? "Sold Out" : "Available"}</span>
            <span style={{ backgroundColor: "rgba(201,162,95,0.25)", color: "#C9A25F", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "9999px", padding: "4px 14px" }}>{event.category}</span>
          </div>
          <h1 style={{ fontFamily: "Playfair Display, serif", color: "#FBF4E8", fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, lineHeight: 1.2 }}>{event.title}</h1>
        </div>
        <button type="button" onClick={() => router.push("/#all-events")} style={{ position: "absolute", top: "24px", left: "24px", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "rgba(251,244,232,0.15)", backdropFilter: "blur(8px)", color: "#FBF4E8", fontSize: "13px", fontWeight: 500, border: "1px solid rgba(251,244,232,0.25)", borderRadius: "9999px", padding: "8px 18px", cursor: "pointer" }}>
          <ArrowLeft size={14} /> All Events
        </button>
      </section>

      {/* Main content */}
      <section style={{ backgroundColor: "#FBF4E8" }} className="px-5 sm:px-10 pb-20">
        <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
          <div style={{ paddingTop: "28px" }}>

            {/* Full-width content */}
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

              <section><h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Choose your date</h2><div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>{sessions.map(s => <button key={s.id} type="button" disabled={!sessionAvailable(s)} aria-pressed={selected?.id === s.id} onClick={() => setSelectedSessionId(s.id)} style={{ padding: 16, borderRadius: 12, border: "1px solid #C9A25F", background: selected?.id === s.id ? "#0F332B" : "#EEE2D5", color: selected?.id === s.id ? "white" : "#0F332B", opacity: sessionAvailable(s) ? 1 : .6 }}><strong>{formatDate(s.date)}</strong><br />{s.startTime}–{s.endTime} IST<br />{s.status === "cancelled" ? "Cancelled" : !sessionAvailable(s) ? "Started / completed" : "Select date"}</button>)}</div></section>
              {/* Quick facts */}
              <div style={{ backgroundColor: "#EEE2D5", borderRadius: "16px", padding: "20px 24px" }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <Calendar size={16} style={{ color: "#C9A25F" }} />, label: "Date", value: formatDate(bookingEvent.date) },
                  { icon: <Clock size={16} style={{ color: "#C9A25F" }} />, label: "Time", value: `${bookingEvent.startTime} — ${bookingEvent.endTime}` },
                  { icon: <MapPin size={16} style={{ color: "#C9A25F" }} />, label: "Venue", value: event.location },
                ].map((f) => (
                  <div key={f.label} style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flexShrink: 0, marginTop: "2px" }}>{f.icon}</div>
                    <div>
                      <p style={{ color: "#2F3328", fontSize: "11px", opacity: 0.55, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "2px" }}>{f.label}</p>
                      <p style={{ color: "#0F332B", fontSize: "14px", fontWeight: 500, lineHeight: 1.4 }}>{f.value}</p>
                      {f.label === "Venue" && event.locationUrl && <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#C8734F", fontSize: "12px", textDecoration: "underline", display: "inline-block", marginTop: "5px" }}>Open in Google Maps ↗</a>}
                    </div>
                  </div>
                ))}
              </div>

              {/* About */}
              <div>
                <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "24px", fontWeight: 700, marginBottom: "14px" }}>About this event</h2>
                <EventDescription value={event.description} format={event.descriptionFormat} />
              </div>

              <EventMediaGallery key={event.id} urls={event.youtubeUrls} photos={event.gallery} onPhotoOpen={setLightboxImg} />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky bottom bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#FBF4E8", borderTop: "1px solid #EEE2D5", padding: "14px 40px", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, backdropFilter: "blur(8px)" }}>
        <button onClick={() => !isSoldOut && setModalOpen(true)} disabled={isSoldOut} style={{ backgroundColor: isSoldOut ? "#EEE2D5" : "#0F332B", color: isSoldOut ? "#2F3328" : "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", border: "none", borderRadius: "9999px", padding: "14px 48px", cursor: isSoldOut ? "not-allowed" : "pointer" }}>
          {!selected ? "NO UPCOMING DATES" : isSoldOut ? "SOLD OUT" : "RESERVE A SEAT"}
        </button>
      </div>

      {/* More events */}
      <section style={{ backgroundColor: "#EEE2D5", padding: "48px 40px" }}>
        <div style={{ maxWidth: "1300px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "22px", fontWeight: 700 }}>More events you might enjoy</h2>
            <button type="button" onClick={() => router.push("/#all-events")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: "#C8734F", fontSize: "13px", fontWeight: 600 }}>See all →</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {otherEvents.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.88)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <button onClick={() => setLightboxImg(null)} style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "9999px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} color="#fff" />
          </button>
          <img src={lightboxImg} alt="Zoomed" onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "12px", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" }} />
        </div>
      )}

      <BookingModal key={selected?.id ?? event.id} event={bookingEvent} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
