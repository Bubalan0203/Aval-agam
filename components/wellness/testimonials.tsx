"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Quote } from "lucide-react";

type Testimonial = {
  name: string;
  program: string;
  /** First entry is the pull-quote; the rest is the body. */
  quote: string[];
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Helena Lautermilch",
    program: "Inner Clarity · 1:1 Program",
    quote: [
      "I highly recommend Brindha, the founder of Aval Agam, and her one-to-one Inner Clarity program to anyone looking for kind, professional and personalised emotional wellness support.",
      "Before we began, Brindha took the time to understand my situation and created a personal plan based on my individual needs. I have been working with her online for the past four months, and she has been supporting me through the hardest time of my life.",
      "Each session with Brindha gives me a private and safe space to slow down, reflect and understand what may be happening beneath my thoughts, emotions and repeated patterns without judgment or pressure.",
      "Her approach involves experiential, present-moment emotional exploration, where I am gently guided to notice my feelings, bodily sensations and immediate reactions as they arise.",
      "Brindha does not simply offer quick advice or tell me what to do. She helps me understand myself more deeply and gives me practical directions that I can carry into my daily life.",
      "Every week, I feel stronger, calmer and more emotionally stable. Brindha has truly become an anchor for me during this difficult period, and I am deeply grateful for her guidance and support. Thank you from the bottom of my heart.",
    ],
  },
  {
    name: "Devamathi Krishnakumar",
    program: "Mindfulness & Wellness Sessions",
    quote: [
      "I feel incredibly grateful to be part of the Mindfulness and Wellness sessions at Aval Agam conducted by Ms. Brindha Thiyagarajan. These sessions have been truly life-changing for me.",
      "From the very first few classes, I noticed a remarkable shift in my mindset, emotional well-being, and overall outlook on life. The techniques and practices taught by Ms. Brindha are simple yet profoundly effective. They have helped me become more positive, focused, calm, self-aware, and confident in handling everyday challenges.",
      "What makes these sessions unique is Ms. Brindha's ability to create a safe, nurturing, and transformative environment where personal growth happens naturally. Every session leaves me feeling refreshed, empowered, and equipped with practical tools that I can apply in my daily life.",
      "The positive changes I have experienced in my thoughts, emotions, relationships, and productivity are beyond what I expected. It is not just a class — it is a journey of self-discovery and inner transformation.",
      "I wholeheartedly recommend Aval Agam and Ms. Brindha Thiyagarajan to anyone seeking greater peace, clarity, emotional balance, and personal growth. This has been one of the most valuable investments I have made in myself, and I can confidently say that it has transformed my life for the better.",
    ],
  },
  {
    name: "Swathika",
    program: "One-to-One Session",
    quote: [
      "I had a one-to-one session with Brindha, and I cannot fully express how much her words meant to me. The session did not simply comfort me — it awakened something deeper within me and helped me look at my life from a new perspective.",
      "Brindha listened with kindness, patience and an open heart. Her guidance helped me reflect on my experiences in a way that brought clarity, emotional relief and a sense of healing to my heart.",
      "I truly believe that some people come into our lives for a reason, and I am incredibly grateful that we reconnected. Brindha's wisdom, compassion and genuine presence touched me more deeply than she may realise.",
      "I would highly recommend her one-to-one sessions to anyone looking for a safe, supportive and non-judgmental space to slow down, reflect and reconnect with themselves.",
    ],
  },
];

const AUTOPLAY_MS = 9000;
/** Body paragraphs shown before the "read full reflection" toggle. */
const COLLAPSED_PARAS = 1;
/** Sticky nav height plus breathing room, matching the navbar. */
const NAV_OFFSET = 80;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const count = TESTIMONIALS.length;

  const go = useCallback((next: number) => {
    setIndex(((next % count) + count) % count);
    setExpanded(false); // a new reflection always starts collapsed
  }, [count]);

  /**
   * Reviews run long, so after reading down one card the slider's top can sit well above
   * the viewport. Swapping in a shorter slide then leaves the visitor looking at blank
   * space below it and the change reads as "the arrow did nothing" — pull the card back
   * into view whenever a control drives the change.
   */
  const goAndReveal = useCallback((next: number) => {
    go(next);
    const el = sliderRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < NAV_OFFSET) {
      window.scrollTo({ top: top + window.scrollY - NAV_OFFSET, behavior: "smooth" });
    }
  }, [go]);

  // All slides sit side by side in one flex row, so the viewport would otherwise stay as
  // tall as the longest review and leave a big gap under the shorter ones. Track the
  // active slide's height instead and let the wrapper animate to it.
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [viewportHeight, setViewportHeight] = useState<number>();

  useEffect(() => {
    const slide = slideRefs.current[index];
    if (!slide) return;

    const measure = () => setViewportHeight(slide.offsetHeight);
    measure();

    // Observing the active slide covers every reflow that changes its height — viewport
    // resize, the serif/Poppins swap after first paint, expanding the full reflection,
    // and text rewrapping — without a separate resize listener.
    const ro = new ResizeObserver(measure);
    ro.observe(slide);
    return () => ro.disconnect();
  }, [index]);

  // Autoplay — pauses on hover/focus, while mid-swipe, and while a reflection is expanded
  // so it can't yank the text away mid-sentence.
  useEffect(() => {
    if (paused || expanded) return;
    const t = setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, paused, expanded, go]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    setPaused(false);
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 45) goAndReveal(index + (dx < 0 ? 1 : -1));
  }

  return (
    <section id="testimonials" style={{ backgroundColor: "#EEE2D5" }} className="w-full overflow-hidden">
      <div className="max-w-[1100px] mx-auto px-6 lg:px-16 py-20 lg:py-28">
        {/* Heading */}
        <div className="text-center flex flex-col items-center gap-3 mb-10 lg:mb-14">
          <p style={{ fontFamily: "Poppins, sans-serif", color: "#C9A25F", fontSize: "11px", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 600 }}>
            IN THEIR WORDS
          </p>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "clamp(28px, 3.6vw, 46px)", lineHeight: 1.2, fontWeight: 600, margin: 0 }}>
            What women say after{" "}
            <em style={{ color: "#C8734F", fontStyle: "italic" }}>coming home</em>{" "}
            to themselves.
          </h2>
          <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "15px", lineHeight: 1.75, maxWidth: "560px", opacity: 0.75, margin: 0 }}>
            Shared with permission by women who walked with Aval Agam.
          </p>
        </div>

        {/* Slider */}
        <div
          ref={sliderRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ position: "relative", scrollMarginTop: `${NAV_OFFSET}px` }}
        >
          <div
            style={{
              overflow: "hidden",
              borderRadius: "24px",
              height: viewportHeight,
              transition: "height 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                transform: `translateX(-${index * 100}%)`,
                transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {TESTIMONIALS.map((t, i) => {
                const [lead, ...body] = t.quote;
                const active = i === index;
                const shown = active && expanded ? body : body.slice(0, COLLAPSED_PARAS);
                const hiddenCount = body.length - shown.length;

                return (
                  <article
                    key={t.name}
                    ref={(el) => { slideRefs.current[i] = el; }}
                    aria-hidden={!active}
                    style={{
                      flex: "0 0 100%",
                      minWidth: "100%",
                      backgroundColor: "#FBF4E8",
                      padding: "clamp(26px, 4vw, 52px)",
                      boxSizing: "border-box",
                    }}
                  >
                    <Quote size={30} style={{ color: "#C9A25F", opacity: 0.55, marginBottom: "14px" }} />

                    <p
                      style={{
                        fontFamily: "Playfair Display, serif",
                        fontStyle: "italic",
                        color: "#0F332B",
                        fontSize: "clamp(17px, 2vw, 21px)",
                        lineHeight: 1.65,
                        margin: 0,
                      }}
                    >
                      {lead}
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
                      {shown.map((para) => (
                        <p
                          key={para}
                          style={{
                            fontFamily: "Poppins, sans-serif",
                            color: "#2F3328",
                            fontSize: "14.5px",
                            lineHeight: 1.8,
                            opacity: 0.82,
                            margin: 0,
                          }}
                        >
                          {para}
                        </p>
                      ))}
                    </div>

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        tabIndex={active ? 0 : -1}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "none",
                          border: "none",
                          padding: 0,
                          marginTop: "14px",
                          cursor: "pointer",
                          fontFamily: "Poppins, sans-serif",
                          color: "#C8734F",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        Read the full reflection
                        <ChevronDown size={15} />
                      </button>
                    )}
                    {active && expanded && (
                      <button
                        type="button"
                        onClick={() => setExpanded(false)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "none",
                          border: "none",
                          padding: 0,
                          marginTop: "14px",
                          cursor: "pointer",
                          fontFamily: "Poppins, sans-serif",
                          color: "#C8734F",
                          fontSize: "13px",
                          fontWeight: 600,
                        }}
                      >
                        Show less
                        <ChevronDown size={15} style={{ transform: "rotate(180deg)" }} />
                      </button>
                    )}

                    {/* Attribution */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        marginTop: "26px",
                        paddingTop: "20px",
                        borderTop: "1px solid #EEE2D5",
                      }}
                    >
                      <div
                        style={{
                          width: "46px",
                          height: "46px",
                          borderRadius: "50%",
                          backgroundColor: "#0F332B",
                          color: "#C9A25F",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "Playfair Display, serif",
                          fontSize: "16px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials(t.name)}
                      </div>
                      <div>
                        <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "15px", fontWeight: 600, margin: 0 }}>{t.name}</p>
                        <p style={{ fontFamily: "Poppins, sans-serif", color: "#C8734F", fontSize: "12px", margin: 0, letterSpacing: "0.04em" }}>{t.program}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-5 mt-8">
            <Arrow label="Previous testimonial" onClick={() => goAndReveal(index - 1)}>
              <ChevronLeft size={18} />
            </Arrow>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => goAndReveal(i)}
                  aria-label={`Show testimonial ${i + 1} of ${count}`}
                  aria-current={i === index}
                  style={{
                    width: i === index ? "26px" : "8px",
                    height: "8px",
                    borderRadius: "9999px",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    backgroundColor: i === index ? "#0F332B" : "rgba(15,51,43,0.25)",
                    transition: "width 0.3s, background-color 0.3s",
                  }}
                />
              ))}
            </div>

            <Arrow label="Next testimonial" onClick={() => goAndReveal(index + 1)}>
              <ChevronRight size={18} />
            </Arrow>
          </div>
        </div>
      </div>
    </section>
  );
}

function Arrow({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "42px",
        height: "42px",
        borderRadius: "50%",
        border: "1.5px solid rgba(15,51,43,0.2)",
        backgroundColor: hover ? "#0F332B" : "#FBF4E8",
        color: hover ? "#FBF4E8" : "#0F332B",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background-color 0.15s, color 0.15s",
      }}
    >
      {children}
    </button>
  );
}
