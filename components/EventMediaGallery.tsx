"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { normalizeYouTubeUrls } from "@/lib/event-content";
import { EventVideoPlayer } from "./EventVideos";

const G = "#0F332B";
const PREVIEW = 5; // tiles shown before "View all"

/** Videos + full photo gallery. Every photo is reachable (grid preview, "view all", lightbox with arrows/swipe/keys). */
export function EventMediaGallery({ urls, photos }: { urls?: unknown; photos: string[] }) {
  const videos = normalizeYouTubeUrls(urls).filter((url): url is string => Boolean(url));
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!videos.length && !photos.length) return null;

  const tiles = showAll ? photos : photos.slice(0, PREVIEW);
  const hidden = photos.length - tiles.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
      {photos.length > 0 && (
        <section aria-label="Event photos">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, gap: 12 }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700, color: G }}>Gallery</h2>
            <button type="button" onClick={() => setLightbox(0)} style={{ fontSize: 13, fontWeight: 600, color: "#a54c2c", display: "inline-flex", alignItems: "center", gap: 6 }}><Images size={15} /> {photos.length} photo{photos.length === 1 ? "" : "s"}</button>
          </div>
          <div className={`ev-gallery ev-gallery--${Math.min(tiles.length, PREVIEW)}${showAll ? " ev-gallery--all" : ""}`}>
            {tiles.map((url, i) => {
              const isLastPreview = !showAll && i === PREVIEW - 1 && hidden > 0;
              return (
                <button key={`${url}-${i}`} type="button" aria-label={isLastPreview ? `View all ${photos.length} photos` : `Open photo ${i + 1}`}
                  onClick={() => isLastPreview ? setShowAll(true) : setLightbox(i)}>
                  <img src={url} alt="" loading="lazy" />
                  {isLastPreview && <span className="ev-gallery-more">+{hidden + 1}<small>View all</small></span>}
                </button>
              );
            })}
          </div>
          {showAll && photos.length > PREVIEW && <button type="button" onClick={() => setShowAll(false)} style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#a54c2c" }}>Show fewer</button>}
        </section>
      )}

      {videos.length > 0 && (
        <section aria-label="Event videos">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700, color: G }}>Videos</h2>
            {videos.length > 1 && <span style={{ fontSize: 13, color: "#6B6F64" }}>{videos.length} videos</span>}
          </div>
          <div className="event-video-grid">
            {videos.map((url, i) => <div key={`${url}-${i}`} className="event-media-frame"><EventVideoPlayer url={url} title={`Event video ${i + 1}`} /></div>)}
          </div>
        </section>
      )}

      {lightbox !== null && <Lightbox photos={photos} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function Lightbox({ photos, index, onIndex, onClose }: { photos: string[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const touchX = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const go = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", h);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [go, onClose]);

  useEffect(() => { stripRef.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }, [index]);
  // Preload neighbours so arrowing feels instant.
  useEffect(() => { [1, -1].forEach(d => { const img = new Image(); img.src = photos[(index + d + photos.length) % photos.length]; }); }, [index, photos]);

  const nav = (dir: -1 | 1) => (
    <button type="button" aria-label={dir < 0 ? "Previous photo" : "Next photo"} onClick={e => { e.stopPropagation(); go(dir); }}
      style={{ position: "absolute", top: "50%", [dir < 0 ? "left" : "right"]: 16, transform: "translateY(-50%)", width: 44, height: 44, borderRadius: 999, background: "rgba(255,255,255,0.14)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
      {dir < 0 ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => { if (touchX.current === null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touchX.current = null; }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(10,14,12,0.94)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", color: "#fff", fontSize: 14 }}>
        <span>{index + 1} / {photos.length}</span>
        <button type="button" aria-label="Close" onClick={onClose} style={{ width: 40, height: 40, borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
      </div>
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, padding: "0 64px" }}>
        {photos.length > 1 && nav(-1)}
        <img key={photos[index]} src={photos[index]} alt={`Photo ${index + 1}`} onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }} />
        {photos.length > 1 && nav(1)}
      </div>
      {photos.length > 1 && (
        <div ref={stripRef} onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 8, overflowX: "auto", padding: "14px 18px", justifyContent: photos.length < 10 ? "center" : "flex-start" }}>
          {photos.map((url, i) => (
            <button key={`${url}-${i}`} data-i={i} type="button" aria-label={`Photo ${i + 1}`} onClick={() => onIndex(i)}
              style={{ flex: "0 0 auto", width: 64, height: 48, borderRadius: 6, overflow: "hidden", outline: i === index ? "2px solid #C9A25F" : "none", opacity: i === index ? 1 : 0.55 }}>
              <img src={url} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
