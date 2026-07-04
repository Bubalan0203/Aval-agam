"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarDays, DollarSign, Ticket, Plus, Search, Trash2 } from "lucide-react";
import { getEvents, getBookings, deleteEvent } from "@/lib/firestore";
import type { Event, Booking } from "@/lib/firestore";
import { ConfirmModal } from "@/components/ConfirmModal";

const MONTHS = ["All Months","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS  = ["All Years", "2025", "2026", "2027"];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [events, setEvents]   = useState<Event[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [month, setMonth]     = useState("All Months");
  const [year, setYear]       = useState("All Years");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getEvents(), getBookings()]).then(([evts, bkgs]) => {
      setEvents(evts);
      setBookings(bkgs);
      setLoading(false);
    });
  }, []);

  const totalRevenue = bookings.reduce((s, b) => s + b.amount, 0);
  const totalSold    = events.reduce((s, e) => s + e.ticketTypes.reduce((a, t) => a + t.sold, 0), 0);

  const stats = [
    { label: "Total Bookings", value: String(bookings.length),             color: "#C8734F", Icon: BookOpen    },
    { label: "Total Revenue",  value: `₹${totalRevenue.toLocaleString()}`, color: "#0F332B", Icon: DollarSign  },
    { label: "Events",         value: String(events.length),               color: "#C9A25F", Icon: CalendarDays },
    { label: "Tickets Sold",   value: String(totalSold),                   color: "#2F3328", Icon: Ticket      },
  ];

  const filtered = useMemo(() => events.filter((e) => {
    const d = new Date(e.date);
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase());
    const matchMonth  = month === "All Months" || d.toLocaleString("en", { month: "short" }) === month;
    const matchYear   = year  === "All Years"  || String(d.getFullYear()) === year;
    return matchSearch && matchMonth && matchYear;
  }), [events, search, month, year]);

  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirmId) return;
    setDeleting(confirmId);
    await deleteEvent(confirmId);
    setEvents(p => p.filter(e => e.id !== confirmId));
    setBookings(p => p.filter(b => b.eventId !== confirmId));
    setDeleting(null);
    setConfirmId(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "26px", fontWeight: 700, marginBottom: "4px" }}>Dashboard</h1>
          <p style={{ color: "#2F3328", fontSize: "14px", opacity: 0.6 }}>Aval Agam events &amp; bookings overview</p>
        </div>
        <button onClick={() => router.push("/admin/events/create")} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#0F332B", color: "#FBF4E8", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", border: "none", borderRadius: "9999px", padding: "12px 24px", cursor: "pointer" }}>
          <Plus size={15} /> CREATE EVENT
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, color, Icon }) => (
          <div key={label} style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "20px 22px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <p style={{ color: "#2F3328", fontSize: "12px", opacity: 0.6, fontWeight: 500 }}>{label}</p>
              <div style={{ width: "34px", height: "34px", borderRadius: "9px", backgroundColor: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "26px", fontWeight: 700 }}>{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#2F3328", opacity: 0.4 }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…" style={{ width: "100%", fontSize: "13px", color: "#2F3328", backgroundColor: "#FBF4E8", border: "1.5px solid #EEE2D5", borderRadius: "9999px", padding: "9px 16px 9px 36px", outline: "none", boxSizing: "border-box", fontFamily: "Poppins, sans-serif" }} />
        </div>
        {[{ val: month, set: setMonth, opts: MONTHS }, { val: year, set: setYear, opts: YEARS }].map(({ val, set, opts }) => (
          <select key={opts[0]} value={val} onChange={e => set(e.target.value)} style={{ fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#2F3328", backgroundColor: "#FBF4E8", border: "1.5px solid #EEE2D5", borderRadius: "9999px", padding: "9px 18px", cursor: "pointer", outline: "none" }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Events table */}
      <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 80px 60px", gap: "0", padding: "10px 20px", borderBottom: "1px solid #EEE2D5", backgroundColor: "#EEE2D560" }}>
          {["EVENT", "DATE", "CATEGORY", "TICKETS", "BOOKINGS", ""].map(h => (
            <p key={h} style={{ color: "#2F3328", fontSize: "11px", fontWeight: 600, letterSpacing: "0.07em", opacity: 0.5 }}>{h}</p>
          ))}
        </div>

        {loading && (
          <p style={{ color: "#2F3328", fontSize: "14px", opacity: 0.5, padding: "32px 20px", textAlign: "center", fontFamily: "Poppins, sans-serif" }}>Loading events…</p>
        )}

        {!loading && filtered.length === 0 && (
          <p style={{ color: "#2F3328", fontSize: "14px", opacity: 0.5, padding: "32px 20px", textAlign: "center", fontFamily: "Poppins, sans-serif" }}>No events found.</p>
        )}

        {filtered.map((event, idx) => {
          const sold   = event.ticketTypes.reduce((a, t) => a + t.sold, 0);
          const total  = event.ticketTypes.reduce((a, t) => a + t.available, 0);
          const booked = bookings.filter(b => b.eventId === event.id).length;

          return (
            <div key={event.id} onClick={() => router.push(`/admin/events/${event.id}`)} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 80px 80px 60px", gap: "0", padding: "16px 20px", alignItems: "center", borderBottom: idx < filtered.length - 1 ? "1px solid #EEE2D5" : "none", cursor: "pointer" }} className="hover:bg-[#EEE2D530]">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <img src={event.image} alt={event.title} style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover", flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: 600 }}>{event.title}</p>
                  <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "12px", opacity: 0.55 }}>{event.location}</p>
                </div>
              </div>
              <div>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "13px", fontWeight: 500 }}>{new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "11px", opacity: 0.55 }}>{event.startTime}</p>
              </div>
              <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "11px", fontWeight: 600, backgroundColor: "rgba(201,162,95,0.15)", color: "#C9A25F", borderRadius: "9999px", padding: "4px 12px", width: "fit-content" }}>{event.category}</span>
              <div>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: 700 }}>{sold}</p>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "11px", opacity: 0.5 }}>of {total}</p>
              </div>
              <div>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: 700 }}>{booked}</p>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "11px", opacity: 0.5 }}>bookings</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setConfirmId(event.id); }} disabled={deleting === event.id} style={{ width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(200,115,79,0.1)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#C8734F", opacity: deleting === event.id ? 0.5 : 1 }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={!!confirmId}
        title="Delete this event?"
        message="The event and all of its bookings will be permanently removed. This cannot be undone."
        busy={!!deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
