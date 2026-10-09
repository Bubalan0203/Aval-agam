"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import { normalizeYouTubeUrls, youtubeVideoId } from "@/lib/event-content";

/** Shows the video's cover image with a play button; the YouTube player loads only when clicked. */
export function EventVideoPlayer({ url, title }: { url: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const [cover, setCover] = useState<"maxresdefault" | "hqdefault">("maxresdefault");
  const id = youtubeVideoId(url);
  if (!playing) return (
    <button type="button" className="ev-video-cover" aria-label={`Play ${title}`} onClick={() => setPlaying(true)}>
      <img src={`https://i.ytimg.com/vi/${id}/${cover}.jpg`} alt="" loading="lazy"
        onLoad={e => { if (cover === "maxresdefault" && e.currentTarget.naturalWidth <= 120) setCover("hqdefault"); }}
        onError={() => setCover("hqdefault")} />
      <span className="ev-video-play"><Play size={24} fill="currentColor" /></span>
    </button>
  );
  return <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&controls=1&rel=0`} title={title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ display: "block", width: "100%", aspectRatio: "16/9", border: 0, borderRadius: "12px" }} />;
}

export function EventVideos({ urls, compact = false }: { urls?: unknown; compact?: boolean }) {
  const videos = normalizeYouTubeUrls(urls).filter((url): url is string => Boolean(url));
  if (!videos.length) return null;
  return (
    <section aria-label="Event videos">
      <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: compact ? "20px" : "24px", fontWeight: 700, marginBottom: "14px" }}>Event videos</h2>
      <div className={compact ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-5"} style={compact ? { maxWidth: "360px" } : undefined}>
        {videos.map((url, i) => (
          <div key={`${url}-${i}`}>
            <EventVideoPlayer url={url} title={`Event video ${i + 1}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
