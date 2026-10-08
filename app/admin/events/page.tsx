"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ImageOff, Plus, Search } from "lucide-react";
import { getEvents, type Event } from "@/lib/firestore";
import { formatDateShort, formatTime12, rupees, sessionCapacity, sessionSold, upcomingSessions } from "@/lib/booking-logic";
import { Badge, Button, C, Card, Empty, EventStatusBadge, PageHeader, PageSkeleton, inputStyle } from "@/components/admin/ui";

type Tab = "all" | "upcoming" | "draft" | "nodates" | "archived";
const TABS: [Tab, string][] = [["all", "All"], ["upcoming", "Upcoming"], ["draft", "Drafts"], ["nodates", "No upcoming dates"], ["archived", "Archived"]];

function matches(e: Event, tab: Tab) {
  const up = upcomingSessions(e).length > 0;
  if (tab === "all") return e.status !== "archived";
  if (tab === "upcoming") return e.status === "published" && up;
  if (tab === "draft") return e.status === "draft";
  if (tab === "nodates") return e.status === "published" && !up;
  return e.status === "archived";
}

export default function AdminEventsPage() {
  return <Suspense fallback={<PageSkeleton />}><EventsView /></Suspense>;
}

function EventsView() {
  const router = useRouter();
  const params = useSearchParams();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>(() => (TABS.some(([t]) => t === params.get("status")) ? params.get("status") as Tab : "all"));

  useEffect(() => { getEvents().then(setEvents).catch(() => setError(true)); }, []);

  const counts = useMemo(() => Object.fromEntries(TABS.map(([t]) => [t, (events ?? []).filter(e => matches(e, t)).length])), [events]);
  const rows = useMemo(() => (events ?? [])
    .filter(e => matches(e, tab) && (!q || `${e.title} ${e.location} ${e.category}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      const na = upcomingSessions(a)[0], nb = upcomingSessions(b)[0];
      if (na && nb) return `${na.date}${na.startTime}`.localeCompare(`${nb.date}${nb.startTime}`);
      return na ? -1 : nb ? 1 : 0;
    }), [events, q, tab]);

  if (error) return <Card><Empty>Couldn&rsquo;t load events. Refresh the page to try again.</Empty></Card>;
  if (!events) return <PageSkeleton />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Events" subtitle="Create, publish and manage your events and their dates."
        actions={<Link href="/admin/events/create"><Button><Plus size={16} /> New event</Button></Link>} />

      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${C.sand}`, overflowX: "auto" }}>
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", color: tab === t ? C.green : C.muted, borderBottom: `2px solid ${tab === t ? C.green : "transparent"}`, marginBottom: -1 }}>
            {label} <span style={{ marginLeft: 4, fontSize: 12, padding: "1px 7px", borderRadius: 999, background: tab === t ? C.greenSoft : "#F2F4F7" }}>{counts[t]}</span>
          </button>
        ))}
      </div>

      <Card padded={false}>
        <div style={{ padding: 16, borderBottom: `1px solid ${C.sand}` }}>
          <div style={{ position: "relative", maxWidth: 380 }}>
            <Search size={16} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by title, venue or category" style={{ ...inputStyle(), paddingLeft: 38 }} />
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty icon={<CalendarDays size={22} />} action={tab === "all" && !q ? <Link href="/admin/events/create"><Button>Create your first event</Button></Link> : undefined}>
            {q ? `No events match “${q}”.` : "No events in this view."}
          </Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ background: C.bg, textAlign: "left", fontSize: 12, color: C.ink }}>
                  <th style={{ padding: "12px 20px", fontWeight: 500 }}>Event</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500 }}>Next date</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500 }}>Seats (next date)</th>
                  <th style={{ padding: "12px 16px", fontWeight: 500 }}>Price</th>
                  <th style={{ padding: "12px 20px", fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(e => {
                  const up = upcomingSessions(e); const next = up[0]; const cap = sessionCapacity(e);
                  const prices = e.ticketTypes.map(t => t.price);
                  const sold = next ? sessionSold(next) : 0;
                  return (
                    <tr key={e.id} className="admin-row" onClick={() => router.push(`/admin/events/${e.id}`)} style={{ borderTop: `1px solid ${C.sand}`, cursor: "pointer" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          {e.image ? <img src={e.image} alt="" style={{ width: 64, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                            : <span style={{ width: 64, height: 40, borderRadius: 6, background: "#F2F4F7", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, flexShrink: 0 }}><ImageOff size={16} /></span>}
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title || "Untitled event"}</p>
                            <p style={{ fontSize: 13, color: C.ink }}>{[e.category, e.location].filter(Boolean).join(" · ") || "No category or venue"}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 14, whiteSpace: "nowrap" }}>
                        {next ? <><p style={{ fontWeight: 500 }}>{formatDateShort(next.date)}</p><p style={{ fontSize: 13, color: C.ink }}>{formatTime12(next.startTime)}{up.length > 1 ? ` · +${up.length - 1} more` : ""}</p></>
                          : <span style={{ color: C.muted }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px", width: 170 }}>
                        {next ? (sold >= cap ? <Badge tone="bad">Sold out</Badge> : <>
                          <div style={{ height: 6, background: C.sand, borderRadius: 999 }}><div style={{ width: `${cap ? Math.min(100, sold / cap * 100) : 0}%`, height: "100%", background: C.green, borderRadius: 999 }} /></div>
                          <p style={{ fontSize: 12, color: C.ink, marginTop: 4 }}>{sold} of {cap}</p>
                        </>) : <span style={{ color: C.muted }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 14, whiteSpace: "nowrap" }}>{prices.length ? (Math.min(...prices) === Math.max(...prices) ? rupees(prices[0]) : `${rupees(Math.min(...prices))}–${rupees(Math.max(...prices))}`) : "—"}</td>
                      <td style={{ padding: "14px 20px" }}><EventStatusBadge status={e.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
