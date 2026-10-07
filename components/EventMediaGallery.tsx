"use client";
import { useState } from "react";
import { Expand, Play } from "lucide-react";
import { normalizeYouTubeUrls } from "@/lib/event-content";
import { EventVideoPlayer } from "./EventVideos";

export function EventMediaGallery({ urls, photos, onPhotoOpen }: { urls?: unknown; photos: string[]; onPhotoOpen: (url: string) => void }) {
  const videos = normalizeYouTubeUrls(urls).filter((url): url is string => Boolean(url));
  const gallery = photos.slice(0, 4);
  const [selectedVideo, setSelectedVideo] = useState(0);
  const activeVideo = Math.min(selectedVideo, Math.max(0, videos.length - 1));
  if (!videos.length && !gallery.length) return null;

  return (
    <div className={`event-media-gallery ${videos.length && gallery.length ? "event-media-gallery--both" : "event-media-gallery--single"}`}>
      {videos.length > 0 && (
        <section aria-label="Event videos" className="event-media-section">
          <div className="event-media-heading">
            <h2>Event videos</h2>
            {videos.length > 1 && <div className="event-video-switch" role="group" aria-label="Choose event video">
              {videos.map((url, i) => <button key={`${url}-${i}`} type="button" aria-pressed={activeVideo === i} onClick={() => setSelectedVideo(i)}><Play size={11} aria-hidden="true" />Video {i + 1}</button>)}
            </div>}
          </div>
          <div className="event-media-frame">
            <EventVideoPlayer key={`${activeVideo}-${videos[activeVideo]}`} url={videos[activeVideo]} title={`Event video ${activeVideo + 1}`} />
          </div>
        </section>
      )}
      {gallery.length > 0 && (
        <section aria-label="Event gallery" className="event-media-section">
          <div className="event-media-heading"><h2>Gallery</h2><span className="event-photo-count">{gallery.length} {gallery.length === 1 ? "photo" : "photos"}</span></div>
          <div className={`event-photo-grid event-photo-grid--${gallery.length}`}>
            {gallery.map((url, i) => (
              <button key={`${url}-${i}`} type="button" aria-label={`View gallery photo ${i + 1}`} onClick={() => onPhotoOpen(url)}>
                <img src={url} alt={`Event gallery photo ${i + 1}`} />
                <span className="event-photo-expand" aria-hidden="true"><Expand size={14} /></span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
