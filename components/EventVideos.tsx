import { normalizeYouTubeUrls, youtubeVideoId } from "@/lib/event-content";

export function EventVideos({ urls, compact = false }: { urls?: unknown; compact?: boolean }) {
  const videos = normalizeYouTubeUrls(urls).filter((url): url is string => Boolean(url));
  if (!videos.length) return null;
  return (
    <section aria-label="Event videos">
      <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: compact ? "20px" : "24px", fontWeight: 700, marginBottom: "14px" }}>Event videos</h2>
      <div className={compact ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-5"} style={compact ? { maxWidth: "360px" } : undefined}>
        {videos.map((url, i) => (
          <div key={`${url}-${i}`}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId(url)}?controls=1&rel=0`} title={`Event video ${i + 1}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: "12px" }} />
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#C8734F", display: "inline-block", marginTop: "8px", textDecoration: "underline", fontSize: compact ? "12px" : undefined }}>Watch video {i + 1} on YouTube ↗</a>
          </div>
        ))}
      </div>
    </section>
  );
}
