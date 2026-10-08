"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown, ChevronRight, Mail, MapPin, MessageCircle, ShieldCheck, Share2, Sparkles, Ticket, Users, Video } from "lucide-react";
import { getEvent, getPublishedEvents } from "@/lib/firestore";
import type { Event } from "@/lib/firestore";
import type { EventSession } from "@/lib/event-sessions";
import { bookableSessions, formatDateLong, formatDateShort, formatTime12, rupees, sessionRemaining, upcomingSessions } from "@/lib/booking-logic";
import { BookingModal } from "@/components/BookingModal";
import { EventDescription } from "@/components/EventDescription";
import { EventMediaGallery } from "@/components/EventMediaGallery";
import { EventCard } from "@/components/EventCard";
import s from "./event.module.css";

const WHATSAPP = "https://wa.me/919952697993";
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export default function EventDetailsPage() {
  return <Suspense fallback={<Skeleton />}><EventDetails /></Suspense>;
}

function Skeleton() {
  return (
    <div className={s.page}>
      <div className={s.shell} style={{ paddingTop: 40, display: "flex", flexDirection: "column", gap: 16 }}>
        <div className={s.skeleton} style={{ height: 18, width: "30%" }} />
        <div className={s.skeleton} style={{ height: 52, width: "75%" }} />
        <div className={s.skeleton} style={{ height: 80, marginTop: 12 }} />
        <div className={s.layout}><div className={s.skeleton} style={{ height: 360 }} /><div className={s.skeleton} style={{ height: 360 }} /></div>
      </div>
    </div>
  );
}

function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const preview = useSearchParams().get("preview") === "1";
  const [event, setEvent] = useState<Event | null>(null);
  const [related, setRelated] = useState<Event[]>([]);
  const [result, setResult] = useState<{ id: string; state: "ok" | "missing" | "error" } | null>(null);
  const state = result?.id === id ? result.state : "loading";
  const [modalOpen, setModalOpen] = useState(false);
  const [chosen, setChosen] = useState<string | undefined>();
  const [picked, setPicked] = useState("");
  const [copied, setCopied] = useState(false);
  const [allDates, setAllDates] = useState(false);

  const reloadEvent = useCallback(() => { getEvent(id).then(e => { if (e) setEvent(e); }).catch(() => {}); }, [id]);

  useEffect(() => {
    Promise.all([getEvent(id), getPublishedEvents().catch(() => [] as Event[])]).then(([evt, all]) => {
      const visible = evt && (evt.status === "published" || preview) ? evt : null;
      setEvent(visible);
      setResult({ id, state: visible ? "ok" : "missing" });
      setRelated(all.filter(e => e.id !== id && upcomingSessions(e).length > 0)
        .sort((a, b) => upcomingSessions(a)[0].date.localeCompare(upcomingSessions(b)[0].date)).slice(0, 3));
    }).catch(() => setResult({ id, state: "error" }));
  }, [id, preview]);

  useEffect(() => { if (state === "ok") window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [id, state]);

  if (state === "loading") return <Skeleton />;
  if (state !== "ok" || !event) {
    return (
      <div className={s.page}>
        <div className={s.shell} style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
          <p className={s.titleXL} style={{ fontSize: 30 }}>{state === "error" ? "We couldn't load this event" : "This event isn't available"}</p>
          <p style={{ color: "var(--t3)", fontSize: 15, maxWidth: 420 }}>{state === "error" ? "Check your connection and try again." : "It may have ended or been removed. See what's coming up."}</p>
          <button type="button" className={s.cta} onClick={() => state === "error" ? location.reload() : router.push("/#all-events")}>{state === "error" ? "Try again" : "Browse events"}</button>
        </div>
      </div>
    );
  }

  const upcoming = upcomingSessions(event);
  const open = bookableSessions(event);
  const isDraft = event.status !== "published";
  const canBook = !isDraft && open.length > 0;
  const selected: EventSession | undefined = open.find(x => x.id === picked) ?? open[0];
  const shown = selected ?? upcoming[0];
  const prices = event.ticketTypes.map(t => t.price);
  const minP = prices.length ? Math.min(...prices) : 0, maxP = prices.length ? Math.max(...prices) : 0;
  const priceLabel = maxP === 0 ? "Free" : minP === maxP ? rupees(minP) : minP === 0 ? `Free – ${rupees(maxP)}` : `From ${rupees(minP)}`;
  const left = shown ? sessionRemaining(event, shown) : 0;
  const availability = isDraft ? "Preview" : !upcoming.length ? "No upcoming dates" : !open.length ? "Sold out" : left <= 10 ? `${left} seat${left === 1 ? "" : "s"} left` : "Open for booking";
  const availTone = isDraft || !canBook ? s.chipMuted : left <= 10 ? s.chipWarn : s.chipGood;
  const online = /online|zoom|meet/i.test(event.location);
  const ask = `${WHATSAPP}?text=${encodeURIComponent(`Hi! I have a question about "${event.title}".`)}`;
  const photos = event.gallery.filter(Boolean);
  const hasMedia = photos.length > 0 || (event.youtubeUrls ?? []).some(Boolean);

  function book() { if (canBook) { setChosen(selected?.id); setModalOpen(true); } }

  async function share() {
    const url = window.location.href.replace(/\?preview=1/, "");
    try {
      if (navigator.share) await navigator.share({ title: event!.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* dismissed */ }
  }

  return (
    <div className={s.page}>
      {isDraft && <div className={s.draft}>Preview: this event isn&rsquo;t published yet, so customers can&rsquo;t see it.</div>}

      <div className={s.shell}>
        {/* Breadcrumb + status */}
        <div className={s.headRow}>
          <nav className={s.crumbs2} aria-label="Breadcrumb">
            <button type="button" onClick={() => router.push("/#all-events")}>Events</button>
            {event.category && <><ChevronRight size={13} /><span>{event.category}</span></>}
            <ChevronRight size={13} /><span>{event.title}</span>
          </nav>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={cx(s.chip, availTone)}><span className={s.dot} />{availability}</span>
            {upcoming.length > 1 && <span className={cx(s.chip, s.chipGold)}>{upcoming.length} dates</span>}
            <button type="button" className={s.iconBtn} onClick={share}><Share2 size={14} /> {copied ? "Link copied" : "Share"}</button>
          </div>
        </div>

        {/* Banner */}
        {event.image && (
          <div className={s.banner}>
            <img src={event.image} alt={event.title} />
            {event.category && <div className={s.bannerTag}><span className={cx(s.chip, s.chipGlass)}>{event.category}</span></div>}
          </div>
        )}

        {/* Title */}
        <h1 className={s.titleXL}>{event.title}</h1>

        {/* Facts strip */}
        <div className={s.strip}>
          <div className={s.stripCell}>
            <span className={s.stripIcon}><CalendarDays size={20} /></span>
            <div style={{ minWidth: 0 }}>
              <p className={s.stripK}>Date &amp; time</p>
              <p className={s.stripV}>{shown ? formatDateLong(shown.date) : "Dates coming soon"}</p>
              <p className={s.stripS}>{shown ? `${formatTime12(shown.startTime)} – ${formatTime12(shown.endTime)} IST${upcoming.length > 1 ? ` · +${upcoming.length - 1} more` : ""}` : "Message us to hear first"}</p>
            </div>
          </div>
          <div className={s.stripCell}>
            <span className={s.stripIcon}>{online ? <Video size={20} /> : <MapPin size={20} />}</span>
            <div style={{ minWidth: 0 }}>
              <p className={s.stripK}>Location</p>
              <p className={s.stripV}>{event.location || "To be announced"}</p>
              <p className={s.stripS}>{event.locationUrl ? <a href={event.locationUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a> : online ? "Joining link emailed after booking" : "Coimbatore"}</p>
            </div>
          </div>
          <div className={s.stripCell}>
            <span className={s.stripIcon}><Sparkles size={20} /></span>
            <div style={{ minWidth: 0 }}>
              <p className={s.stripK}>Experience</p>
              <p className={s.stripV}>{event.category || "Workshop"}{online ? " · Online" : ""}</p>
              <p className={s.stripS}>{shown ? duration(shown.startTime, shown.endTime) : ""}{shown ? " · " : ""}Small, held circle</p>
            </div>
          </div>
        </div>

        <div className={s.layout}>
          {/* Main column */}
          <div className={s.mainCol}>
            <section id="about" className={s.panel}>
              <p className={s.eyebrow}>About this event</p>
              <h2 className={s.secTitle}>What to expect</h2>
              <Collapsible><div className={s.prose}><EventDescription value={event.description} format={event.descriptionFormat} /></div></Collapsible>
            </section>

            {hasMedia && (
              <section id="media" className={cx(s.panel, s.mediaCard)}>
                <EventMediaGallery key={event.id} urls={event.youtubeUrls} photos={photos} />
              </section>
            )}

            <section className={s.panel} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "22px 24px 4px" }}><p className={s.eyebrow}>Clear guidelines</p><h2 className={s.secTitle}>Good to know</h2></div>
              <div className={s.infoGrid}>
                {[
                  { Icon: ShieldCheck, t: "Secure booking", d: "Pay with UPI, cards or netbanking via Razorpay." },
                  { Icon: Mail, t: "Instant confirmation", d: "Your booking details are emailed as soon as you book." },
                  { Icon: Users, t: "Small, held space", d: "Limited seats so everyone is seen and supported." },
                  { Icon: MessageCircle, t: "Have a question?", d: <a href={ask} target="_blank" rel="noopener noreferrer">Chat with us on WhatsApp →</a> },
                ].map(x => (
                  <div key={x.t} className={s.infoItem}>
                    <span className={s.infoIcon}><x.Icon size={18} /></span>
                    <div><p className={s.infoT}>{x.t}</p><div className={s.infoD}>{x.d}</div></div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className={s.sideCol}>
            <section id="register" className={cx(s.card, s.reg)}>
              <div className={s.cardHead}><span className={s.cardTitle}>Registration</span><span className={cx(s.chip, availTone)}>{availability}</span></div>
              <div className={s.regTop}>
                <div>
                  <p className={s.price}>{priceLabel}</p>
                  <p className={s.priceSub}>{maxP > 0 ? "per person · taxes included" : "No payment needed"}</p>
                </div>
              </div>
              {event.ticketTypes.length > 1 && (
                <div className={s.ticketPills} style={{ padding: "0 20px 16px" }}>{event.ticketTypes.map(t => <span key={t.id} className={s.ticketPill}>{t.name} <b>{t.price ? rupees(t.price) : "Free"}</b></span>)}</div>
              )}
              {upcoming.length > 0 ? (
                <>
                  <p className={s.regLabel}>{upcoming.length > 1 ? "Choose a date" : "Date"}</p>
                  <div className={s.dateList} role="radiogroup" aria-label="Dates" style={allDates ? { maxHeight: 380, overflowY: "auto", paddingRight: 4 } : undefined}>
                    {(allDates ? upcoming : upcoming.slice(0, 4)).map(x => {
                      const l = sessionRemaining(event, x);
                      return (
                        <button key={x.id} type="button" role="radio" aria-checked={x.id === selected?.id} disabled={!canBook || l === 0} className={s.dateRow} onClick={() => setPicked(x.id)}>
                          <span><span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--t1)" }}>{formatDateShort(x.date)}</span><span style={{ fontSize: 12, color: "var(--t3)" }}>{formatTime12(x.startTime)} – {formatTime12(x.endTime)}</span></span>
                          <span className={s.tag} style={{ background: l === 0 ? "#EEE2D5" : l <= 10 ? "var(--clay-soft)" : "#E6F2EC", color: l === 0 ? "var(--t3)" : l <= 10 ? "var(--clay)" : "#2F7A55" }}>{l === 0 ? "Sold out" : l <= 10 ? `${l} left` : "Available"}</span>
                        </button>
                      );
                    })}
                  </div>
                  {upcoming.length > 4 && (
                    <button type="button" onClick={() => setAllDates(v => !v)} style={{ margin: "0 20px 14px", padding: "9px 0", borderRadius: 10, border: "1px dashed var(--border)", background: "transparent", color: "var(--brand)", fontSize: 13, fontWeight: 600, width: "calc(100% - 40px)" }}>
                      {allDates ? "Show fewer dates" : `+ ${upcoming.length - 4} more dates`}
                    </button>
                  )}
                </>
              ) : <p className={s.regLabel} style={{ color: "var(--t3)", fontWeight: 400 }}>New dates are coming soon. Message us to hear first.</p>}
              <div className={s.regFoot} style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
                {canBook
                  ? <button type="button" className={s.cta} style={{ width: "100%" }} onClick={book}><Ticket size={17} /> {selected ? `Book for ${formatDateShort(selected.date)}` : "Book now"}</button>
                  : <a className={s.ctaGhost} style={{ width: "100%" }} href={ask} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} /> {isDraft ? "Booking disabled in preview" : "Ask about the next date"}</a>}
                <span className={s.secure} style={{ justifyContent: "center" }}><ShieldCheck size={14} /> Secure payment · instant email confirmation</span>
              </div>
            </section>

            <section className={s.card}>
              <div className={s.cardPad}>
                <div className={s.host}>
                  <span className={s.hostLogo}><Image src="/logo.png" alt="" width={36} height={36} style={{ objectFit: "contain" }} /></span>
                  <div><p className={s.hostName}>Hosted by Aval Agam</p><p className={s.hostSub}>Her Inner World · Coimbatore</p></div>
                </div>
                <a href={ask} target="_blank" rel="noopener noreferrer" className={s.ctaGhost} style={{ width: "100%", height: 42, marginTop: 14 }}><MessageCircle size={16} /> Message on WhatsApp</a>
              </div>
            </section>
          </aside>
        </div>

        {related.length > 0 && (
          <section className={s.related}>
            <div className={s.relatedHead}><h2 className={s.h2}>More upcoming events</h2><button type="button" onClick={() => router.push("/#all-events")} style={{ fontSize: 14, fontWeight: 600, color: "var(--brand)" }}>View all →</button></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{related.map(e => <EventCard key={e.id} event={e} />)}</div>
          </section>
        )}
      </div>

      {/* Mobile bottom bar */}
      <div className={cx(s.bar, s.hideDesktop)}>
        <div style={{ minWidth: 0 }}>
          <p className={s.barPrice}>{priceLabel}</p>
          <p className={s.barSub}>{selected ? `${formatDateShort(selected.date)} · ${availability}` : availability}</p>
        </div>
        {canBook
          ? <button type="button" className={s.cta} style={{ height: 44 }} onClick={book}><Ticket size={16} /> Book now</button>
          : <a className={s.ctaGhost} style={{ height: 44 }} href={ask} target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a>}
      </div>

      {!isDraft && <BookingModal key={`${event.id}-${chosen ?? ""}`} event={event} open={modalOpen} onOpenChange={setModalOpen} onBooked={reloadEvent} initialSessionId={chosen} />}
    </div>
  );
}

/** First part of a long description with a "Read more" toggle. */
function Collapsible({ children, max = 420 }: { children: React.ReactNode; max?: number }) {
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
        {tall && !open && <div className={s.fade} />}
      </div>
      {tall && <button type="button" className={s.more} onClick={() => setOpen(v => !v)}>{open ? "Show less" : "Read more"} <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>}
    </div>
  );
}

function duration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number), [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (!(mins > 0)) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  return [h ? `${h} hr${h > 1 ? "s" : ""}` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}
