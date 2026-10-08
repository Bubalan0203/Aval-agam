"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, MessageCircle, Share2, Ticket } from "lucide-react";
import { getEvent, getPublishedEvents } from "@/lib/firestore";
import type { Event } from "@/lib/firestore";
import { bookableSessions, formatDateLong, formatDateShort, formatTime12, rupees, sessionRemaining, upcomingSessions } from "@/lib/booking-logic";
import { BookingModal } from "@/components/BookingModal";
import { EventDescription } from "@/components/EventDescription";
import { EventMediaGallery } from "@/components/EventMediaGallery";
import { EventCard } from "@/components/EventCard";

const G = "#0F332B", CREAM = "#FBF4E8", SAND = "#EEE2D5", GOLD = "#C9A25F", CLAY = "#C8734F", INK = "#2F3328";
const WHATSAPP = "https://wa.me/919952697993";

export default function EventDetailsPage() {
  return <Suspense fallback={<EventSkeleton />}><EventDetails /></Suspense>;
}

function EventSkeleton() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
      <div className="admin-skeleton" style={{ height: 380, borderRadius: 20, background: SAND }} />
      <div className="admin-skeleton" style={{ height: 28, width: "60%", marginTop: 24, background: SAND }} />
      <div className="admin-skeleton" style={{ height: 16, width: "40%", marginTop: 12, background: SAND }} />
    </div>
  );
}

function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const preview = useSearchParams().get("preview") === "1";
  const [event, setEvent] = useState<Event | null>(null);
  const [otherEvents, setOtherEvents] = useState<Event[]>([]);
  const [result, setResult] = useState<{ id: string; state: "ok" | "missing" | "error" } | null>(null);
  const state = result?.id === id ? result.state : "loading";
  const setState = (s: "ok" | "missing" | "error") => setResult({ id, state: s });
  const [modalOpen, setModalOpen] = useState(false);
  const [chosen, setChosen] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const reloadEvent = useCallback(() => { getEvent(id).then(e => { if (e) setEvent(e); }).catch(() => {}); }, [id]);

  useEffect(() => {
    Promise.all([getEvent(id), getPublishedEvents().catch(() => [] as Event[])]).then(([evt, all]) => {
      const visible = evt && (evt.status === "published" || preview) ? evt : null;
      setEvent(visible);
      setState(visible ? "ok" : "missing");
      setOtherEvents(all.filter(e => e.id !== id && upcomingSessions(e).length > 0)
        .sort((a, b) => `${upcomingSessions(a)[0].date}`.localeCompare(upcomingSessions(b)[0].date)).slice(0, 3));
    }).catch(() => setState("error"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, preview]);

  useEffect(() => { if (state === "ok") window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [id, state]);

  if (state === "loading") return <EventSkeleton />;
  if (state !== "ok" || !event) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <p style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 26 }}>{state === "error" ? "We couldn't load this event" : "This event isn't available"}</p>
        <p style={{ color: INK, fontSize: 14, maxWidth: 420 }}>{state === "error" ? "Please check your connection and try again." : "It may have ended or been removed. Have a look at what's coming up."}</p>
        <button type="button" onClick={() => state === "error" ? location.reload() : router.push("/#all-events")} style={{ background: G, color: CREAM, fontSize: 13, fontWeight: 600, borderRadius: 999, padding: "12px 24px" }}>{state === "error" ? "Try again" : "See upcoming events"}</button>
      </div>
    );
  }

  const upcoming = upcomingSessions(event);
  const open = bookableSessions(event);
  const next = open[0] ?? upcoming[0];
  const isDraft = event.status !== "published";
  const canBook = !isDraft && open.length > 0;
  const prices = event.ticketTypes.map(t => t.price);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const priceLabel = minPrice === 0 && Math.max(...prices, 0) === 0 ? "Free" : `${prices.length > 1 && Math.max(...prices) !== minPrice ? "From " : ""}${rupees(minPrice)}`;
  const totalLeft = next ? sessionRemaining(event, next) : 0;

  function book(sessionId?: string) {
    if (!canBook) return;
    setChosen(sessionId);
    setModalOpen(true);
  }

  async function share() {
    const url = window.location.href.replace(/\?preview=1/, "");
    try {
      if (navigator.share) await navigator.share({ title: event!.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* user dismissed */ }
  }

  const statusLine = isDraft ? "Preview — not published" : !upcoming.length ? "No upcoming dates" : !open.length ? "Sold out" : totalLeft <= 10 ? `Only ${totalLeft} seat${totalLeft === 1 ? "" : "s"} left` : "Seats available";

  const bookingCard = (
    <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${SAND}`, boxShadow: "0 12px 32px rgba(15,51,43,0.08)", padding: 24 }}>
      <p style={{ fontSize: 12, color: INK, opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Price</p>
      <p style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 700, color: G, lineHeight: 1.2 }}>{priceLabel}<span style={{ fontFamily: "Poppins, sans-serif", fontSize: 13, fontWeight: 500, color: INK, opacity: 0.7 }}>{minPrice > 0 ? " / person" : ""}</span></p>
      {event.ticketTypes.length > 1 && <p style={{ fontSize: 12, color: INK, marginTop: 4 }}>{event.ticketTypes.map(t => `${t.name} ${rupees(t.price)}`).join(" · ")}</p>}

      <div style={{ borderTop: `1px solid ${SAND}`, margin: "18px 0", paddingTop: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: G, marginBottom: 10 }}>{upcoming.length > 1 ? "Choose a date" : "Date"}</p>
        {upcoming.length === 0 ? <p style={{ fontSize: 14, color: INK }}>New dates coming soon.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
            {upcoming.map(s => {
              const left = sessionRemaining(event, s);
              return (
                <button key={s.id} type="button" disabled={!canBook || left === 0} onClick={() => book(s.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, textAlign: "left", padding: "10px 14px", borderRadius: 12, border: `1px solid ${SAND}`, background: left === 0 ? "#F7F2EA" : "#fff", cursor: canBook && left > 0 ? "pointer" : "default" }}>
                  <span>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: left === 0 ? "#8a8a80" : G }}>{formatDateShort(s.date)}</span>
                    <span style={{ fontSize: 12, color: INK, opacity: 0.75 }}>{formatTime12(s.startTime)} – {formatTime12(s.endTime)}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: left === 0 ? "#8a8a80" : left <= 10 ? CLAY : "#2f7a55", whiteSpace: "nowrap" }}>{left === 0 ? "Sold out" : left <= 10 ? `${left} left` : "Available"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {canBook ? (
        <button type="button" onClick={() => book()} style={{ width: "100%", background: G, color: CREAM, fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 999, padding: "15px 20px" }}>RESERVE A SEAT</button>
      ) : (
        <a href={`${WHATSAPP}?text=${encodeURIComponent(`Hi! I'm interested in "${event.title}". Please let me know about the next date.`)}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, width: "100%", border: `1.5px solid ${G}`, color: G, fontSize: 14, fontWeight: 700, borderRadius: 999, padding: "13px 20px" }}>
          <MessageCircle size={16} /> {isDraft ? "Booking disabled in preview" : "Ask about the next date"}
        </a>
      )}
      <p style={{ fontSize: 12, color: INK, opacity: 0.7, textAlign: "center", marginTop: 10 }}>{canBook ? "Secure payment via Razorpay · Instant confirmation" : statusLine}</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", paddingBottom: 96 }}>
      {isDraft && <div style={{ background: "#FFFAEB", color: "#B54708", textAlign: "center", fontSize: 13, fontWeight: 600, padding: 10 }}>Preview — this event isn&rsquo;t published yet. Customers can&rsquo;t see it.</div>}

      {/* Hero — full width banner */}
      <div className="h-[340px] sm:h-[460px] lg:h-[540px]" style={{ position: "relative", width: "100%", overflow: "hidden", background: G }}>
        {event.image && <img src={event.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,51,43,0.35) 0%, rgba(15,51,43,0.05) 35%, rgba(15,51,43,0.88) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, maxWidth: 1200, margin: "0 auto", padding: "20px 20px clamp(24px, 4vw, 48px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <button type="button" onClick={() => router.push("/#all-events")} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: CREAM, background: "rgba(15,51,43,0.45)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999, padding: "8px 14px", backdropFilter: "blur(6px)" }}><ArrowLeft size={15} /> All events</button>
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {event.category && <span style={{ background: "rgba(201,162,95,0.92)", color: G, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 999, padding: "5px 12px" }}>{event.category}</span>}
              <span style={{ background: "rgba(251,244,232,0.18)", color: CREAM, border: "1px solid rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: 999, padding: "5px 12px" }}>{statusLine}</span>
            </div>
            <h1 style={{ fontFamily: "Playfair Display, serif", color: CREAM, fontSize: "clamp(28px, 4.5vw, 54px)", fontWeight: 700, lineHeight: 1.12, maxWidth: 900, textShadow: "0 2px 16px rgba(0,0,0,0.25)" }}>{event.title}</h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 0" }} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 36 }}>
          {/* Key facts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { Icon: CalendarDays, label: "Date", value: next ? formatDateLong(next.date) : "To be announced", sub: upcoming.length > 1 ? `+${upcoming.length - 1} more date${upcoming.length > 2 ? "s" : ""}` : undefined },
              { Icon: Clock, label: "Time", value: next ? `${formatTime12(next.startTime)} – ${formatTime12(next.endTime)}` : "—", sub: next ? "IST" : undefined },
              { Icon: MapPin, label: "Venue", value: event.location || "—", sub: event.locationUrl ? "Open in Maps" : undefined, href: event.locationUrl || undefined },
            ].map(f => (
              <div key={f.label} style={{ background: "#fff", border: `1px solid ${SAND}`, borderRadius: 16, padding: 16, display: "flex", gap: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: "#F6EEDF", color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><f.Icon size={18} /></span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: INK, opacity: 0.6, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{f.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: G, lineHeight: 1.4 }}>{f.value}</p>
                  {f.sub && (f.href ? <a href={f.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: CLAY, textDecoration: "underline" }}>{f.sub}</a> : <p style={{ fontSize: 12, color: INK, opacity: 0.7 }}>{f.sub}</p>)}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile booking card */}
          <div className="lg:hidden">{bookingCard}</div>

          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
              <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 24, fontWeight: 700 }}>About this event</h2>
              <button type="button" onClick={share} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: CLAY }}><Share2 size={14} /> {copied ? "Link copied" : "Share"}</button>
            </div>
            <EventDescription value={event.description} format={event.descriptionFormat} />
          </section>

          <EventMediaGallery key={event.id} urls={event.youtubeUrls} photos={event.gallery} />
        </div>

        {/* Desktop sticky booking card */}
        <aside className="hidden lg:block"><div style={{ position: "sticky", top: 96 }}>{bookingCard}</div></aside>
      </div>

      {otherEvents.length > 0 && (
        <section style={{ background: SAND, padding: "48px 20px", marginTop: 56 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 24, fontWeight: 700, marginBottom: 20 }}>More events you might enjoy</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{otherEvents.map(e => <EventCard key={e.id} event={e} />)}</div>
          </div>
        </section>
      )}

      {/* Mobile sticky bar */}
      <div className="flex lg:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "rgba(251,244,232,0.97)", borderTop: `1px solid ${SAND}`, padding: "12px 16px", alignItems: "center", justifyContent: "space-between", gap: 12, backdropFilter: "blur(8px)" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: G }}>{priceLabel}</p>
          <p style={{ fontSize: 12, color: INK, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{next ? `${formatDateShort(next.date)} · ${statusLine}` : statusLine}</p>
        </div>
        {canBook
          ? <button type="button" onClick={() => book()} style={{ background: G, color: CREAM, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", borderRadius: 999, padding: "13px 22px", display: "inline-flex", gap: 8, alignItems: "center" }}><Ticket size={15} /> RESERVE</button>
          : <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ border: `1.5px solid ${G}`, color: G, fontSize: 13, fontWeight: 700, borderRadius: 999, padding: "11px 18px" }}>Ask on WhatsApp</a>}
      </div>

      {!isDraft && <BookingModal key={`${event.id}-${chosen ?? ""}`} event={event} open={modalOpen} onOpenChange={setModalOpen} onBooked={reloadEvent} initialSessionId={chosen} />}
    </div>
  );
}
