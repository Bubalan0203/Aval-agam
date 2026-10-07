"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket, Trash2, Edit2, Mail, Phone, User } from "lucide-react";
import { EventDescription } from "@/components/EventDescription";
import { EventVideos } from "@/components/EventVideos";
import { getEvent, getEventBookings, deleteEvent } from "@/lib/firestore";
import type { Event, Booking } from "@/lib/firestore";
import { ConfirmModal } from "@/components/ConfirmModal";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [event, setEvent]       = useState<Event | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    Promise.all([getEvent(id), getEventBookings(id)]).then(([evt, bkgs]) => {
      setEvent(evt);
      setBookings(bkgs);
      setLoading(false);
    });
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    await deleteEvent(id);
    router.push("/admin/dashboard");
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
      <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", opacity: 0.5 }}>Loading…</p>
    </div>
  );

  if (!event) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "12px" }}>
      <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "22px" }}>Event not found</p>
      <button onClick={() => router.push("/admin/dashboard")} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", border: "none", borderRadius: "9999px", padding: "10px 24px", cursor: "pointer" }}>Back to Dashboard</button>
    </div>
  );

  const totalRevenue = bookings.reduce((s, b) => s + b.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button onClick={() => router.push("/admin/dashboard")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid #EEE2D5", color: "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "13px", borderRadius: "9999px", padding: "8px 16px", cursor: "pointer" }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "22px", fontWeight: 700 }}>{event.title}</h1>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => router.push(`/admin/events/${id}/edit`)} style={{ display: "flex", alignItems: "center", gap: "7px", backgroundColor: "#EEE2D5", color: "#0F332B", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "9999px", padding: "10px 20px", cursor: "pointer" }}>
            <Edit2 size={13} /> Edit
          </button>
          <button onClick={() => setConfirmOpen(true)} disabled={deleting} style={{ display: "flex", alignItems: "center", gap: "7px", backgroundColor: "rgba(200,115,79,0.12)", color: "#C8734F", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "9999px", padding: "10px 20px", cursor: "pointer", opacity: deleting ? 0.6 : 1 }}>
            <Trash2 size={13} /> {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Event info + hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }} className="grid grid-cols-1 md:grid-cols-2">

        {/* Hero image */}
        <div style={{ borderRadius: "16px", overflow: "hidden", aspectRatio: "16/9" }}>
          {event.image ? (
            <img src={event.image} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", backgroundColor: "#EEE2D5" }} />
          )}
        </div>

        {/* Details */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)", display: "flex", flexDirection: "column", gap: "14px" }}>
          <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "11px", fontWeight: 600, backgroundColor: "rgba(201,162,95,0.15)", color: "#C9A25F", borderRadius: "9999px", padding: "4px 14px", width: "fit-content" }}>{event.category}</span>

          {[
            { icon: <Calendar size={14} style={{ color: "#C9A25F" }} />, label: "Date",  value: formatDate(event.date) },
            { icon: <Clock    size={14} style={{ color: "#C9A25F" }} />, label: "Time",  value: `${event.startTime} — ${event.endTime}` },
            { icon: <MapPin   size={14} style={{ color: "#C9A25F" }} />, label: "Venue", value: event.location },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div style={{ marginTop: "2px", flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "10px", opacity: 0.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</p>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: 500 }}>{value}</p>
              </div>
            </div>
          ))}

          {event.locationUrl && (
            <a href={event.locationUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "Poppins, sans-serif", fontSize: "12px", color: "#C8734F", textDecoration: "none", fontWeight: 500 }}>
              <MapPin size={12} /> Open in Maps ↗
            </a>
          )}

          {/* Ticket types */}
          <div style={{ borderTop: "1px solid #EEE2D5", paddingTop: "14px" }}>
            <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", opacity: 0.5, marginBottom: "8px" }}>Tickets</p>
            {event.ticketTypes.map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Ticket size={12} style={{ color: "#C9A25F" }} />
                  <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#0F332B" }}>{t.name}</span>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "12px", color: "#2F3328", opacity: 0.6 }}>{t.sold}/{t.available} sold</span>
                  <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 700, color: "#C8734F" }}>{t.price === 0 ? "Free" : `₹${t.price}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EventDescription value={event.description} format={event.descriptionFormat} />
      <EventVideos urls={event.youtubeUrls} />

      {/* Gallery */}
      {event.gallery.length > 0 && (
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "18px", fontWeight: 700, marginBottom: "14px" }}>Gallery</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {event.gallery.map((img, i) => (
              <div key={i} style={{ aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden" }}>
                <img src={img} alt={`Gallery ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings */}
      <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #EEE2D5" }}>
          <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "18px", fontWeight: 700 }}>Bookings <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 400, opacity: 0.5 }}>({bookings.length})</span></p>
          {bookings.length > 0 && (
            <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#0F332B", fontWeight: 600 }}>Revenue: ₹{totalRevenue.toLocaleString()}</span>
          )}
        </div>

        {bookings.length === 0 ? (
          <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", opacity: 0.4, padding: "32px 24px", textAlign: "center" }}>No bookings yet for this event.</p>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 24px", backgroundColor: "#EEE2D560", borderBottom: "1px solid #EEE2D5" }}>
              {["CUSTOMER", "TICKET", "QTY", "AMOUNT"].map(h => (
                <p key={h} style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", opacity: 0.5 }}>{h}</p>
              ))}
            </div>

            {bookings.map((b, idx) => (
              <div key={b.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "14px 24px", alignItems: "center", borderBottom: idx < bookings.length - 1 ? "1px solid #EEE2D5" : "none" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={12} style={{ color: "#C9A25F" }} />
                    <span style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "13px", fontWeight: 600 }}>{b.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail size={11} style={{ color: "#2F3328", opacity: 0.4 }} />
                    <span style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "12px", opacity: 0.6 }}>{b.email}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={11} style={{ color: "#2F3328", opacity: 0.4 }} />
                    <span style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "12px", opacity: 0.6 }}>{b.phone}</span>
                  </div>
                </div>
                <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#0F332B" }}>{b.ticketType}</span>
                <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#0F332B" }}>{b.quantity}</span>
                <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "14px", fontWeight: 700, color: "#C8734F" }}>{b.amount === 0 ? "Free" : `₹${b.amount.toLocaleString()}`}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Delete this event?"
        message="The event and all of its bookings will be permanently removed. This cannot be undone."
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
