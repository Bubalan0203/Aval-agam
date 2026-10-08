"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { getEvents, type Event, type EventStatus } from "@/lib/firestore";
import { formatDateShort, formatTime12, sessionCapacity, sessionSold, upcomingSessions } from "@/lib/booking-logic";
import { Button, C, Card, Empty, EventStatusBadge, inputStyle } from "@/components/admin/ui";

export default function AdminEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EventStatus | "upcoming" | "">("");

  useEffect(() => { getEvents().then(setEvents).catch(() => setEvents([])); }, []);

  const rows = useMemo(() => (events ?? []).filter(e =>
    (!q || `${e.title} ${e.location} ${e.category}`.toLowerCase().includes(q.toLowerCase())) &&
    (!status || (status === "upcoming" ? e.status === "published" && upcomingSessions(e).length > 0 : e.status === status))), [events, q, status]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700, color: C.green }}>Events</h1>
        <Link href="/admin/events/create"><Button><Plus size={14} /> New event</Button></Link>
      </div>
      <Card>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search events" style={{ ...inputStyle(), paddingLeft: 34 }} />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)} style={{ ...inputStyle(), width: "auto" }}>
            <option value="">All</option><option value="upcoming">Upcoming</option><option value="published">Published</option><option value="draft">Drafts</option><option value="archived">Archived</option>
          </select>
        </div>
        {!events ? <Empty>Loading…</Empty> : rows.length === 0 ? <Empty>No events.</Empty> : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {rows.map(e => {
              const up = upcomingSessions(e);
              const next = up[0];
              const cap = sessionCapacity(e);
              return (
                <div key={e.id} onClick={() => router.push(`/admin/events/${e.id}`)} style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 4px", borderTop: `1px solid ${C.sand}`, cursor: "pointer", flexWrap: "wrap" }}>
                  {e.image ? <img src={e.image} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} /> : <div style={{ width: 56, height: 56, borderRadius: 10, background: C.sand }} />}
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: C.green, fontSize: 14 }}>{e.title}</p>
                    <p style={{ fontSize: 12, opacity: 0.6 }}>{e.category || "No category"} · {e.location || "No venue"}</p>
                  </div>
                  <div style={{ fontSize: 12, minWidth: 150 }}>
                    {next ? <><p style={{ fontWeight: 600 }}>Next: {formatDateShort(next.date)} · {formatTime12(next.startTime)}</p><p style={{ opacity: 0.6 }}>{sessionSold(next)}/{cap} booked · {up.length} upcoming date{up.length === 1 ? "" : "s"}</p></> : <p style={{ opacity: 0.6 }}>No upcoming dates</p>}
                  </div>
                  <EventStatusBadge status={e.status} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
