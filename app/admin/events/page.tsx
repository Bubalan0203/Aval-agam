"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Calendar, Search } from "lucide-react";
import { EVENTS } from "@/lib/mock-data";
import type { Event } from "@/lib/mock-data";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  "Available": { bg: "rgba(15,51,43,0.1)", color: "#0F332B" },
  "Selling Fast": { bg: "rgba(200,115,79,0.15)", color: "#C8734F" },
  "Sold Out": { bg: "rgba(47,51,40,0.1)", color: "#2F3328" },
};

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>(EVENTS);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDeleteId(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "26px", fontWeight: 700, marginBottom: "4px" }}>Events</h1>
          <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", opacity: 0.6 }}>{events.length} events total</p>
        </div>
        <button
          onClick={() => router.push("/admin/events/create")}
          style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", border: "none", borderRadius: "9999px", padding: "12px 22px", cursor: "pointer" }}
          className="hover:opacity-90 transition-opacity"
        >
          <Plus size={15} />
          CREATE EVENT
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: "360px" }}>
        <Search size={15} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#C9A25F" }} />
        <input
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "11px 14px 11px 40px", borderRadius: "9999px", border: "1.5px solid #EEE2D5", backgroundColor: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#2F3328", outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Poppins, sans-serif" }}>
            <thead style={{ backgroundColor: "#EEE2D5" }}>
              <tr>
                {["Event", "Date", "Category", "Status", "Tickets Sold", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: "#2F3328", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.65, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const totalSold = event.ticketTypes.reduce((a, t) => a + t.sold, 0);
                const totalAvail = event.ticketTypes.reduce((a, t) => a + t.available, 0);
                const ss = STATUS_PILL[event.status];
                return (
                  <tr key={event.id} style={{ borderBottom: "1px solid #EEE2D5" }} className="hover:bg-[rgba(238,226,213,0.4)] transition-colors">
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <img src={event.image} alt={event.title} style={{ width: "48px", height: "38px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                        <div>
                          <p style={{ color: "#0F332B", fontSize: "14px", fontWeight: 600, lineHeight: 1.3 }}>{event.title}</p>
                          <p style={{ color: "#2F3328", fontSize: "12px", opacity: 0.55 }}>{event.location}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Calendar size={13} style={{ color: "#C9A25F" }} />
                        <span style={{ color: "#2F3328", fontSize: "13px" }}>{formatDate(event.date)}</span>
                      </div>
                      <p style={{ color: "#2F3328", fontSize: "12px", opacity: 0.55, marginTop: "2px" }}>{event.startTime}</p>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ backgroundColor: "rgba(201,162,95,0.15)", color: "#C9A25F", fontSize: "11px", fontWeight: 600, borderRadius: "9999px", padding: "4px 10px" }}>{event.category}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ backgroundColor: ss.bg, color: ss.color, fontSize: "11px", fontWeight: 600, borderRadius: "9999px", padding: "4px 12px" }}>{event.status}</span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <p style={{ color: "#0F332B", fontSize: "14px", fontWeight: 700 }}>{totalSold}</p>
                      <div style={{ height: "4px", backgroundColor: "#EEE2D5", borderRadius: "2px", width: "72px", marginTop: "6px" }}>
                        <div style={{ height: "100%", width: `${Math.min(100, (totalSold / totalAvail) * 100)}%`, backgroundColor: "#C8734F", borderRadius: "2px" }} />
                      </div>
                      <p style={{ color: "#2F3328", fontSize: "11px", opacity: 0.5, marginTop: "2px" }}>of {totalAvail}</p>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => router.push(`/admin/events/${event.id}/edit`)}
                          style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: "rgba(15,51,43,0.08)", color: "#0F332B", fontFamily: "Poppins, sans-serif", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "8px", padding: "7px 12px", cursor: "pointer" }}
                          className="hover:bg-[rgba(15,51,43,0.15)] transition-colors"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(event.id)}
                          style={{ display: "flex", alignItems: "center", gap: "5px", backgroundColor: "rgba(200,115,79,0.1)", color: "#C8734F", fontFamily: "Poppins, sans-serif", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "8px", padding: "7px 12px", cursor: "pointer" }}
                          className="hover:bg-[rgba(200,115,79,0.2)] transition-colors"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "18px" }}>No events found</p>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,51,43,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ backgroundColor: "#FBF4E8", borderRadius: "20px", padding: "32px", maxWidth: "400px", width: "90%", boxShadow: "0 20px 60px rgba(15,51,43,0.25)" }}>
            <h3 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "20px", fontWeight: 700, marginBottom: "12px" }}>Delete event?</h3>
            <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", lineHeight: 1.65, marginBottom: "24px" }}>
              This will permanently remove &ldquo;{events.find((e) => e.id === deleteId)?.title}&rdquo; and all its data. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteId(null)} style={{ backgroundColor: "transparent", color: "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "1.5px solid #EEE2D5", borderRadius: "9999px", padding: "11px 22px", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(deleteId)} style={{ backgroundColor: "#C8734F", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "9999px", padding: "11px 22px", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
