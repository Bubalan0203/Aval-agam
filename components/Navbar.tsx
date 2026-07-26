"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, Phone } from "lucide-react";

const InstagramIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const LinkedInIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
  </svg>
);

const YouTubeIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);
import Image from "next/image";

export const WHATSAPP_URL = "https://wa.me/919952697993";

type NavItem = { label: string; anchor?: string; external?: string };

const NAV: NavItem[] = [
  { label: "Events", anchor: "all-events" },
  { label: "About", anchor: "about" },
  // Contact goes straight to WhatsApp rather than to a page section
  { label: "Contact", external: WHATSAPP_URL },
];

/** Height of the sticky nav (h-[68px]) — section tops must clear it, plus a little breathing room. */
const NAV_OFFSET = 68 + 12;

function scrollToId(id: string, behavior: ScrollBehavior = "smooth") {
  const el = document.getElementById(id);
  if (!el) return false;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET, behavior });
  return true;
}

/**
 * The wellness sections only exist on the home page, so an in-page scroll silently
 * does nothing from /events/[id] or /terms. Off home, route to /#anchor instead and
 * let useHashScroll take over once the home page mounts.
 */
function useSectionNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (id: string) => {
    if (pathname === "/") scrollToId(id);
    else router.push(`/#${id}`);
  };
}

/**
 * Next tries to honour a #hash exactly once, right after the navigation settles. The home
 * page then keeps growing — the Firestore events grid renders and images decode — which
 * moves the target out from under that one-shot scroll, so arriving at /#all-events lands
 * short or back at the top. Re-anchor across a short window instead, and bail out the
 * moment the visitor starts scrolling themselves.
 */
function useHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace("#", ""));
    if (!id) return;

    let raf = 0;
    let done = false;
    const deadline = Date.now() + 1200;

    // Any deliberate input means they're driving now — stop repositioning under them.
    const release = () => { done = true; };
    const opts = { passive: true, once: true } as const;
    window.addEventListener("wheel", release, opts);
    window.addEventListener("touchstart", release, opts);
    window.addEventListener("keydown", release, { once: true });

    const tick = () => {
      if (done) return;
      scrollToId(id, "auto");
      if (Date.now() < deadline) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
  }, [pathname]);
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollTo = useSectionNav();
  useHashScroll();

  return (
    <nav style={{ backgroundColor: "#FBF4E8", borderBottom: "1px solid #EEE2D5" }} className="sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-[68px]">
        <Link href="/" aria-label="Aval Agam — home" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
          <Image src="/logo.png" alt="Aval Agam" width={48} height={48} style={{ objectFit: "contain" }} />
          <div>
            <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "17px", fontWeight: 700, lineHeight: 1.1 }}>AVAL AGAM</p>
            <p style={{ color: "#C9A25F", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase" }}>Her Inner World</p>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {NAV.map((n) =>
            n.external ? (
              <a key={n.label} href={n.external} target="_blank" rel="noopener noreferrer" style={{ color: "#2F3328", fontSize: "14px", fontWeight: 400, textDecoration: "none" }} className="hover:opacity-70 transition-opacity">
                {n.label}
              </a>
            ) : (
              <button key={n.label} type="button" onClick={() => scrollTo(n.anchor!)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2F3328", fontSize: "14px", fontWeight: 400 }} className="hover:opacity-70 transition-opacity">
                {n.label}
              </button>
            )
          )}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button type="button" onClick={() => scrollTo("all-events")} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", border: "none", borderRadius: "9999px", padding: "10px 22px", cursor: "pointer" }}>BROWSE EVENTS</button>
        </div>
        <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"} style={{ background: "none", border: "none", cursor: "pointer" }} className="md:hidden">
          {menuOpen ? <X size={22} color="#0F332B" /> : <Menu size={22} color="#0F332B" />}
        </button>
      </div>
      {menuOpen && (
        <div style={{ backgroundColor: "#FBF4E8", borderTop: "1px solid #EEE2D5" }} className="md:hidden px-6 py-4 flex flex-col gap-4">
          {NAV.map((n) =>
            n.external ? (
              <a key={n.label} href={n.external} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)} style={{ color: "#2F3328", fontSize: "15px", textDecoration: "none" }}>{n.label}</a>
            ) : (
              <button key={n.label} type="button" onClick={() => { setMenuOpen(false); scrollTo(n.anchor!); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#2F3328", fontSize: "15px", textAlign: "left" }}>{n.label}</button>
            )
          )}
          <Link href="/terms" onClick={() => setMenuOpen(false)} style={{ color: "#2F3328", fontSize: "15px", textDecoration: "none" }}>Terms &amp; Conditions</Link>
        </div>
      )}
    </nav>
  );
}

export function Footer() {
  const scrollTo = useSectionNav();
  const linkStyle: React.CSSProperties = { display: "block", background: "none", border: "none", cursor: "pointer", color: "rgba(251,244,232,0.6)", fontSize: "14px", textAlign: "left", marginBottom: "8px", textDecoration: "none", padding: 0 };

  return (
    <footer style={{ backgroundColor: "#0B2621" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <Link href="/" aria-label="Aval Agam — home" className="flex items-center gap-3 mb-4" style={{ textDecoration: "none" }}>
            <Image src="/logo.png" alt="Aval Agam" width={34} height={34} style={{ objectFit: "contain", backgroundColor: "#FBF4E8", borderRadius: "50%", padding: "3px" }} />
            <p style={{ fontFamily: "Playfair Display, serif", color: "#FBF4E8", fontSize: "18px", fontWeight: 700 }}>AVAL AGAM</p>
          </Link>
          <p style={{ color: "rgba(251,244,232,0.6)", fontSize: "14px", lineHeight: 1.75 }}>A soulspace to know, grow &amp; thrive — wellness circles, workshops and mindful events in Coimbatore.</p>
        </div>
        <div>
          <p style={{ color: "#C9A25F", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: "16px" }}>Quick Links</p>
          {[["Browse Events", "all-events"], ["About Us", "about"]].map(([l, id]) => (
            <button key={l} type="button" onClick={() => scrollTo(id)} style={linkStyle}>{l}</button>
          ))}
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={linkStyle}>Contact</a>
          <Link href="/terms" style={linkStyle}>Terms &amp; Conditions</Link>
        </div>
        <div>
          <p style={{ color: "#C9A25F", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 600, marginBottom: "16px" }}>Contact</p>
          <p style={{ color: "rgba(251,244,232,0.6)", fontSize: "14px", lineHeight: 1.75 }}>
            <a href="tel:+919952697993" style={{ color: "inherit", textDecoration: "none" }}>+91 99526 97993</a><br />
            <a href="mailto:info@avalagam.com" style={{ color: "inherit", textDecoration: "none" }}>info@avalagam.com</a><br />
            Coimbatore, Tamil Nadu
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
            {[
              { Icon: InstagramIcon, href: "https://www.instagram.com/aval.agam?igsh=MTVxZGU5OHdncXUwaA==", label: "Instagram" },
              { Icon: LinkedInIcon,  href: "https://www.linkedin.com/in/brindhathiyagarajan",               label: "LinkedIn" },
              { Icon: YouTubeIcon,   href: "https://youtube.com/@avalagamyt?si=NP2KW4kKFqRkSeRJ",           label: "YouTube" },
              { Icon: Phone,         href: "https://wa.me/919952697993",                                    label: "WhatsApp" },
            ].map(({ Icon, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} style={{ width: "34px", height: "34px", borderRadius: "50%", border: "1px solid rgba(201,162,95,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A25F" }}>
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(201,162,95,0.15)" }} className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p style={{ color: "rgba(251,244,232,0.35)", fontSize: "12px" }}>© 2026 Aval Agam · All rights reserved</p>
        <p style={{ fontFamily: "Playfair Display, serif", fontStyle: "italic", color: "rgba(201,162,95,0.5)", fontSize: "13px" }}>Know · Grow · Thrive</p>
      </div>
    </footer>
  );
}
