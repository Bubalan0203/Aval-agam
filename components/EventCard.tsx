"use client";
import { Calendar, Clock, MapPin, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/firestore";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function minPrice(e: Event) {
  if (!e.ticketTypes.length) return "—";
  const min = Math.min(...e.ticketTypes.map((t) => t.price));
  return min === 0 ? "Free" : `₹${min}`;
}

export function EventCard({ event }: { event: Event }) {
  const router = useRouter();
  const isSoldOut = event.ticketTypes.length > 0 && event.ticketTypes.every(t => t.sold >= t.available);

  return (
    <div
      onClick={() => router.push(`/events/${event.id}`)}
      style={{ backgroundColor: "#ffffff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 2px 16px rgba(15,51,43,0.07)", cursor: "pointer", display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s" }}
      className="hover:shadow-lg hover:-translate-y-1"
    >
      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
        {/* An empty src makes the browser re-request the current page as an image, so only
            render the tag when we actually have a URL */}
        {event.image ? (
          <img src={event.image} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", backgroundColor: "#EEE2D5" }} />
        )}
        <span style={{ position: "absolute", top: "12px", left: "12px", backgroundColor: isSoldOut ? "rgba(47,51,40,0.75)" : "rgba(15,51,43,0.75)", color: "#FBF4E8", backdropFilter: "blur(8px)", fontFamily: "Poppins, sans-serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", borderRadius: "9999px", padding: "4px 12px" }}>
          {isSoldOut ? "Sold Out" : "Available"}
        </span>
        <span style={{ position: "absolute", top: "12px", right: "12px", backgroundColor: "rgba(15,51,43,0.75)", color: "#C9A25F", fontFamily: "Poppins, sans-serif", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "9999px", padding: "4px 12px" }}>
          {event.category}
        </span>
      </div>
      <div style={{ padding: "22px 22px 24px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        <h3 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "19px", fontWeight: 700, lineHeight: 1.3 }}>{event.title}</h3>
        <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "13px", lineHeight: 1.7, opacity: 0.8, flex: 1 }}>{event.description}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "7px", fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "13px", opacity: 0.75 }}>
            <Calendar size={13} style={{ color: "#C9A25F", flexShrink: 0 }} />{formatDate(event.date)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "7px", fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "13px", opacity: 0.75 }}>
            <Clock size={13} style={{ color: "#C9A25F", flexShrink: 0 }} />{event.startTime} — {event.endTime}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "7px", fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "13px", opacity: 0.75 }}>
            <MapPin size={13} style={{ color: "#C9A25F", flexShrink: 0 }} />{event.location}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", paddingTop: "14px", borderTop: "1px solid #EEE2D5" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "16px", fontWeight: 700 }}>
            <Tag size={13} style={{ color: "#C8734F" }} />{minPrice(event)}
          </span>
          <span style={{ fontFamily: "Poppins, sans-serif", color: "#C8734F", fontSize: "13px", fontWeight: 600 }}>
            {isSoldOut ? "View Details" : "Reserve a Seat →"}
          </span>
        </div>
      </div>
    </div>
  );
}
