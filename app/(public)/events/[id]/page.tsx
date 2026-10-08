"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, ChevronDown, Clock, Mail, MapPin, MessageCircle, ShieldCheck, Share2, Ticket, Users } from "lucide-react";
import { getEvent, getPublishedEvents } from "@/lib/firestore";
import type { Event } from "@/lib/firestore";
import { bookableSessions, formatDateLong, formatDateShort, formatTime12, rupees, sessionRemaining, upcomingSessions } from "@/lib/booking-logic";
import { BookingModal } from "@/components/BookingModal";
import { EventDescription } from "@/components/EventDescription";
import { EventMediaGallery } from "@/components/EventMediaGallery";
import { EventCard } from "@/components/EventCard";

const G = "#0F332B", CREAM = "#FBF4E8", SAND = "#EEE2D5", LINE = "#E7DCCB", GOLD = "#B8893F", CLAY = "#B5562F", INK = "#2F3328", MUTED = "#6B6F64";
const WHATSAPP = "https://wa.me/919952697993";
const CONTAINER: React.CSSProperties = { maxWidth: 1180, margin: "0 auto", padding: "0 20px" };

export default function EventDetailsPage() {
  return <Suspense fallback={<EventSkeleton />}><EventDetails /></Suspense>;
}

function EventSkeleton() {
  return (
    <div>
      <div className="admin-skeleton" style={{ height: 380, borderRadius: 0, background: SAND }} />
      <div style={{ ...CONTAINER, paddingTop: 28 }}>
        <div className="admin-skeleton" style={{ height: 36, width: "55%", background: SAND }} />
        <div className="admin-skeleton" style={{ height: 16, width: "35%", marginTop: 14, background: SAND }} />
      </div>
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
  const [modalOpen, setModalOpen] = useState(false);
  const [chosen, setChosen] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const reloadEvent = useCallback(() => { getEvent(id).then(e => { if (e) setEvent(e); }).catch(() => {}); }, [id]);

  useEffect(() => {
    Promise.all([getEvent(id), getPublishedEvents().catch(() => [] as Event[])]).then(([evt, all]) => {
      const visible = evt && (evt.status === "published" || preview) ? evt : null;
      setEvent(visible);
      setResult({ id, state: visible ? "ok" : "missing" });
      setOtherEvents(all.filter(e => e.id !== id && upcomingSessions(e).length > 0)
        .sort((a, b) => upcomingSessions(a)[0].date.localeCompare(upcomingSessions(b)[0].date)).slice(0, 3));
    }).catch(() => setResult({ id, state: "error" }));
  }, [id, preview]);

  useEffect(() => { if (state === "ok") window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [id, state]);

  if (state === "loading") return <EventSkeleton />;
  if (state !== "ok" || !event) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <p style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 28 }}>{state === "error" ? "We couldn't load this event" : "This event isn't available"}</p>
        <p style={{ color: MUTED, fontSize: 15, maxWidth: 420 }}>{state === "error" ? "Please check your connection and try again." : "It may have ended or been removed. Have a look at what's coming up."}</p>
        <button type="button" onClick={() => state === "error" ? location.reload() : router.push("/#all-events")} style={{ background: G, color: CREAM, fontSize: 14, fontWeight: 600, borderRadius: 999, padding: "12px 26px" }}>{state === "error" ? "Try again" : "See upcoming events"}</button>
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
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceLabel = maxPrice === 0 ? "Free" : minPrice === maxPrice ? rupees(minPrice) : minPrice === 0 ? `Free – ${rupees(maxPrice)}` : `From ${rupees(minPrice)}`;
  const seatsLeft = next ? sessionRemaining(event, next) : 0;
  const availability = isDraft ? "Preview" : !upcoming.length ? "No upcoming dates" : !open.length ? "Sold out" : seatsLeft <= 10 ? `Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left` : "Seats available";

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
    } catch { /* dismissed */ }
  }

  const whatsappAsk = `${WHATSAPP}?text=${encodeURIComponent(`Hi! I have a question about "${event.title}".`)}`;

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", color: INK, paddingBottom: 110 }}>
      {isDraft && <div style={{ background: "#FFFAEB", color: "#B54708", textAlign: "center", fontSize: 13, fontWeight: 600, padding: 10 }}>Preview — this event isn&rsquo;t published yet. Customers can&rsquo;t see it.</div>}

      {/* Banner */}
      <div className="h-[220px] sm:h-[360px] lg:h-[440px]" style={{ position: "relative", background: G, overflow: "hidden" }}>
        {event.image && <img src={event.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%)" }} />
        <div style={{ ...CONTAINER, position: "absolute", top: 16, left: 0, right: 0 }}>
          <button type="button" onClick={() => router.push("/#all-events")} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: G, background: "rgba(251,244,232,0.92)", borderRadius: 999, padding: "8px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.12)" }}><ArrowLeft size={15} /> All events</button>
        </div>
      </div>

      {/* Title band */}
      <header style={{ ...CONTAINER, paddingTop: 28 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {event.category && <Chip>{event.category}</Chip>}
          <Chip tone={!canBook && !isDraft ? "muted" : seatsLeft <= 10 && canBook ? "warn" : "good"}>{availability}</Chip>
        </div>
        <h1 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: "clamp(28px, 3.6vw, 44px)", fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.01em", maxWidth: 900 }}>{event.title}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 24px", marginTop: 16, fontSize: 15, color: INK }}>
          {next && <Meta Icon={CalendarDays}>{formatDateLong(next.date)}{upcoming.length > 1 ? <span style={{ color: MUTED }}>&nbsp;· +{upcoming.length - 1} more</span> : null}</Meta>}
          {next && <Meta Icon={Clock}>{formatTime12(next.startTime)} – {formatTime12(next.endTime)} IST</Meta>}
          {event.location && <Meta Icon={MapPin}>{event.location}</Meta>}
        </div>
        <div style={{ height: 1, background: LINE, marginTop: 28 }} />
      </header>

      {/* Body */}
      <div style={{ ...CONTAINER, marginTop: 32 }} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10">
        <main style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 44 }}>
          <Section title="When & where">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard Icon={CalendarDays} title={upcoming.length > 1 ? `${upcoming.length} upcoming dates` : "Date & time"}>
                {upcoming.length === 0 ? <p style={{ color: MUTED }}>New dates coming soon.</p> : (
                  <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {upcoming.slice(0, 4).map(s => {
                      const left = sessionRemaining(event, s);
                      return <li key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span>{formatDateShort(s.date)} · {formatTime12(s.startTime)}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: left === 0 ? MUTED : left <= 10 ? CLAY : "#2F7A55" }}>{left === 0 ? "Sold out" : left <= 10 ? `${left} left` : "Open"}</span>
                      </li>;
                    })}
                    {upcoming.length > 4 && <li style={{ color: MUTED, fontSize: 13 }}>+{upcoming.length - 4} more in the booking panel</li>}
                  </ul>
                )}
                {next && <p style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>Duration {duration(next.startTime, next.endTime)} · all times IST</p>}
              </InfoCard>
              <InfoCard Icon={MapPin} title="Location">
                <p style={{ fontWeight: 500 }}>{event.location || "To be announced"}</p>
                {event.locationUrl && <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 14, fontWeight: 600, color: CLAY }}>Open in Google Maps →</a>}
                {/online|zoom|meet/i.test(event.location) && <p style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>The joining link is shared by email after booking.</p>}
              </InfoCard>
            </div>
          </Section>

          <Section title="About this event" action={<button type="button" onClick={share} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: CLAY }}><Share2 size={15} /> {copied ? "Link copied" : "Share"}</button>}>
            <Collapsible><div className="event-prose"><EventDescription value={event.description} format={event.descriptionFormat} /></div></Collapsible>
          </Section>

          {(event.gallery.length > 0 || (event.youtubeUrls ?? []).some(Boolean)) && (
            <EventMediaGallery key={event.id} urls={event.youtubeUrls} photos={event.gallery} />
          )}

          <Section title="Good to know">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { Icon: ShieldCheck, t: "Secure booking", d: "Pay safely with UPI, cards or netbanking through Razorpay." },
                { Icon: Mail, t: "Instant confirmation", d: "Your booking details are emailed as soon as you book." },
                { Icon: Users, t: "Small, held space", d: "Seats are limited so every participant is seen and supported." },
                { Icon: MessageCircle, t: "Questions?", d: <a href={whatsappAsk} target="_blank" rel="noopener noreferrer" style={{ color: CLAY, fontWeight: 600 }}>Chat with us on WhatsApp →</a> },
              ].map(x => (
                <div key={x.t} style={{ display: "flex", gap: 14, padding: 18, borderRadius: 16, border: `1px solid ${LINE}`, background: "#fff" }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, background: "#F4ECDD", color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><x.Icon size={19} /></span>
                  <div><p style={{ fontWeight: 600, color: G, fontSize: 15 }}>{x.t}</p><div style={{ fontSize: 14, color: MUTED, marginTop: 2, lineHeight: 1.6 }}>{x.d}</div></div>
                </div>
              ))}
            </div>
          </Section>
        </main>

        <aside className="hidden lg:block">
          <div style={{ position: "sticky", top: 100 }}>
            <BookingPanel event={event} upcoming={upcoming} canBook={canBook} isDraft={isDraft} priceLabel={priceLabel} onBook={book} whatsapp={whatsappAsk} />
          </div>
        </aside>
      </div>

      {otherEvents.length > 0 && (
        <section style={{ background: SAND, padding: "56px 0", marginTop: 72 }}>
          <div style={CONTAINER}>
            <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 28, fontWeight: 700, marginBottom: 24 }}>You might also like</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{otherEvents.map(e => <EventCard key={e.id} event={e} />)}</div>
          </div>
        </section>
      )}

      {/* Mobile bottom bar */}
      <div className="flex lg:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#fff", borderTop: `1px solid ${LINE}`, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", alignItems: "center", justifyContent: "space-between", gap: 12, boxShadow: "0 -6px 20px rgba(15,51,43,0.08)" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: G }}>{priceLabel}</p>
          <p style={{ fontSize: 12, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{next ? `${formatDateShort(next.date)} · ${availability}` : availability}</p>
        </div>
        {canBook
          ? <button type="button" onClick={() => book()} style={{ background: G, color: CREAM, fontSize: 14, fontWeight: 700, borderRadius: 999, padding: "13px 24px", display: "inline-flex", gap: 8, alignItems: "center", flexShrink: 0 }}><Ticket size={16} /> Book now</button>
          : <a href={whatsappAsk} target="_blank" rel="noopener noreferrer" style={{ border: `1.5px solid ${G}`, color: G, fontSize: 14, fontWeight: 700, borderRadius: 999, padding: "11px 18px", flexShrink: 0 }}>Ask on WhatsApp</a>}
      </div>

      {!isDraft && <BookingModal key={`${event.id}-${chosen ?? ""}`} event={event} open={modalOpen} onOpenChange={setModalOpen} onBooked={reloadEvent} initialSessionId={chosen} />}
    </div>
  );
}

function BookingPanel({ event, upcoming, canBook, isDraft, priceLabel, onBook, whatsapp }: {
  event: Event; upcoming: ReturnType<typeof upcomingSessions>; canBook: boolean; isDraft: boolean; priceLabel: string; onBook: (id?: string) => void; whatsapp: string;
}) {
  const [picked, setPicked] = useState("");
  const firstOpen = upcoming.find(s => sessionRemaining(event, s) > 0);
  const sel = upcoming.find(s => s.id === picked && sessionRemaining(event, s) > 0) ?? firstOpen;
  return (
    <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${LINE}`, boxShadow: "0 20px 40px -12px rgba(15,51,43,0.18)", overflow: "hidden" }}>
      <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid ${LINE}` }}>
        <p style={{ fontSize: 13, color: MUTED }}>Price per person</p>
        <p style={{ fontFamily: "Playfair Display, serif", fontSize: 34, fontWeight: 700, color: G, lineHeight: 1.15 }}>{priceLabel}</p>
        {event.ticketTypes.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            {event.ticketTypes.map(t => <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>{t.name}</span><span style={{ fontWeight: 600, color: G }}>{rupees(t.price)}</span></div>)}
          </div>
        )}
      </div>

      <div style={{ padding: "18px 24px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: G, marginBottom: 10 }}>{upcoming.length > 1 ? "Select a date" : "Date"}</p>
        {upcoming.length === 0 ? <p style={{ fontSize: 14, color: MUTED }}>New dates coming soon.</p> : (
          <div role="radiogroup" aria-label="Dates" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 264, overflowY: "auto", margin: "0 -4px", padding: "2px 4px" }}>
            {upcoming.map(s => {
              const left = sessionRemaining(event, s);
              const on = s.id === sel?.id;
              const disabled = !canBook || left === 0;
              return (
                <button key={s.id} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => setPicked(s.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "11px 14px", borderRadius: 12, border: `1.5px solid ${on ? G : LINE}`, background: on ? "#F3F7F5" : disabled ? "#FAF7F2" : "#fff", cursor: disabled ? "not-allowed" : "pointer", opacity: left === 0 ? 0.6 : 1 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 999, border: `1.5px solid ${on ? G : "#C8C2B6"}`, background: on ? G : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{on && <Check size={11} color="#fff" strokeWidth={3} />}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: G }}>{formatDateShort(s.date)}</span>
                    <span style={{ fontSize: 13, color: MUTED }}>{formatTime12(s.startTime)} – {formatTime12(s.endTime)}</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: left === 0 ? MUTED : left <= 10 ? CLAY : "#2F7A55", whiteSpace: "nowrap" }}>{left === 0 ? "Sold out" : left <= 10 ? `${left} left` : "Available"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: "0 24px 22px" }}>
        {canBook ? (
          <button type="button" onClick={() => onBook(sel?.id)} style={{ width: "100%", background: G, color: CREAM, fontSize: 15, fontWeight: 700, borderRadius: 999, padding: "15px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Ticket size={17} /> Book {sel ? `for ${formatDateShort(sel.date)}` : "now"}
          </button>
        ) : (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, width: "100%", border: `1.5px solid ${G}`, color: G, fontSize: 15, fontWeight: 700, borderRadius: 999, padding: "13px 20px" }}>
            <MessageCircle size={17} /> {isDraft ? "Booking disabled in preview" : "Ask about the next date"}
          </a>
        )}
        <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: MUTED, marginTop: 12 }}><ShieldCheck size={14} /> Secure payment · Instant email confirmation</p>
      </div>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", color: G, fontSize: 26, fontWeight: 700 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoCard({ Icon, title, children }: { Icon: typeof CalendarDays; title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 20, borderRadius: 16, border: `1px solid ${LINE}`, background: "#fff", fontSize: 15 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "#F4ECDD", color: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={18} /></span>
        <p style={{ fontWeight: 600, color: G }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function Chip({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "good" | "warn" | "muted" }) {
  const t = { gold: ["#F4ECDD", "#8A6326"], good: ["#E6F2EC", "#1F6B48"], warn: ["#FBE9DF", CLAY], muted: ["#EEEBE6", MUTED] }[tone];
  return <span style={{ background: t[0], color: t[1], fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", borderRadius: 999, padding: "6px 12px" }}>{children}</span>;
}

function Meta({ Icon, children }: { Icon: typeof CalendarDays; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon size={17} color={GOLD} />{children}</span>;
}

/** Shows the first part of a long description with a "Read more" toggle. */
function Collapsible({ children, max = 520 }: { children: React.ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tall, setTall] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTall(el.scrollHeight > max + 80));
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);
  return (
    <div>
      <div ref={ref} style={{ position: "relative", maxHeight: open || !tall ? "none" : max, overflow: "hidden" }}>
        {children}
        {tall && !open && <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120, background: `linear-gradient(180deg, rgba(251,244,232,0), ${CREAM})` }} />}
      </div>
      {tall && (
        <button type="button" onClick={() => setOpen(v => !v)} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: G, border: `1.5px solid ${G}`, borderRadius: 999, padding: "9px 18px" }}>
          {open ? "Show less" : "Read more"} <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} />
        </button>
      )}
    </div>
  );
}

function duration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number), [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (!(mins > 0)) return "—";
  const h = Math.floor(mins / 60), m = mins % 60;
  return [h ? `${h} hr${h > 1 ? "s" : ""}` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}
