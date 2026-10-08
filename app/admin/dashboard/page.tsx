"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, Plus, Ticket } from "lucide-react";
import { getBookings, getEvents, migrateEvents, type Booking, type Event } from "@/lib/firestore";
import { amountMismatch, formatDateShort, formatTime12, rupees, sessionCapacity, sessionSold, upcomingSessions } from "@/lib/booking-logic";
import { Badge, BookingStatusBadge, Button, C, Card, Empty, PageHeader, PageSkeleton, StatCard, useToast } from "@/components/admin/ui";

export default function AdminDashboardPage() {
  const { setToast, toastNode } = useToast();
  const [data, setData] = useState<{ events: Event[]; bookings: Booking[] } | null>(null);
  const [error, setError] = useState("");
  const [migrating, setMigrating] = useState(false);

  const load = () => Promise.all([getEvents(), getBookings()]).then(([events, bookings]) => setData({ events, bookings }))
    .catch(() => setError("Couldn't load data. Check your connection and admin access, then refresh."));
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const confirmed = data.bookings.filter(b => b.status === "confirmed");
    const thisMonth = confirmed.filter(b => (b.bookedAt?.toMillis() ?? 0) >= monthStart);
    const eventsById = new Map(data.events.map(e => [e.id, e]));
    const upcoming = data.events.filter(e => e.status === "published")
      .flatMap(e => upcomingSessions(e).map(s => ({ e, s })))
      .sort((a, b) => `${a.s.date}${a.s.startTime}`.localeCompare(`${b.s.date}${b.s.startTime}`));
    return {
      revenue: confirmed.reduce((n, b) => n + b.amount, 0),
      monthRevenue: thisMonth.reduce((n, b) => n + b.amount, 0),
      monthBookings: thisMonth.length,
      seats: confirmed.reduce((n, b) => n + b.quantity, 0),
      refunds: data.bookings.filter(b => b.status === "refund_required"),
      flagged: confirmed.filter(b => amountMismatch(b, eventsById.get(b.eventId))),
      unsentEmails: confirmed.filter(b => !b.confirmationEmailSentAt && b.source === "website" && b.history?.length),
      drafts: data.events.filter(e => e.status === "draft"),
      noDates: data.events.filter(e => e.status === "published" && upcomingSessions(e).length === 0),
      needsMigration: data.events.some(e => e.schemaVersion !== 3),
      upcoming: upcoming.slice(0, 6), upcomingCount: upcoming.length,
      recent: data.bookings.slice(0, 6),
    };
  }, [data]);

  if (error) return <Card><Empty icon={<AlertTriangle size={22} />}>{error}</Empty></Card>;
  if (!data || !stats) return <PageSkeleton />;

  const attention = [
    stats.refunds.length > 0 && { href: "/admin/bookings?status=refund_required", tone: "bad" as const, text: `${stats.refunds.length} booking${stats.refunds.length === 1 ? "" : "s"} waiting for a refund`, sub: `${rupees(stats.refunds.reduce((n, b) => n + b.amount, 0))} to return` },
    stats.flagged.length > 0 && { href: "/admin/bookings?flag=amount", tone: "bad" as const, text: `${stats.flagged.length} payment${stats.flagged.length === 1 ? "" : "s"} below the ticket price`, sub: "Check these in Razorpay" },
    stats.unsentEmails.length > 0 && { href: "/admin/bookings?flag=email", tone: "warn" as const, text: `${stats.unsentEmails.length} confirmation email${stats.unsentEmails.length === 1 ? "" : "s"} not sent`, sub: "Open the booking and resend" },
    stats.drafts.length > 0 && { href: "/admin/events?status=draft", tone: "warn" as const, text: `${stats.drafts.length} draft event${stats.drafts.length === 1 ? "" : "s"} not published yet`, sub: "Hidden from the website" },
    stats.noDates.length > 0 && { href: "/admin/events?status=nodates", tone: "warn" as const, text: `${stats.noDates.length} published event${stats.noDates.length === 1 ? " has" : "s have"} no upcoming dates`, sub: "Customers can't book these — add dates or archive" },
  ].filter(Boolean) as { href: string; tone: "bad" | "warn"; text: string; sub: string }[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="Dashboard" subtitle="Your events and bookings at a glance."
        actions={<Link href="/admin/events/create"><Button><Plus size={16} /> New event</Button></Link>} />

      {stats.needsMigration && (
        <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: 16, borderRadius: 12, border: "1px solid #FEDF89", background: C.goldSoft }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: C.gold }}>One-time data upgrade available</p>
            <p style={{ fontSize: 14, color: C.ink }}>Some older events use the previous format. Upgrading lines up seat counts and statuses. Nothing is deleted.</p>
          </div>
          <Button disabled={migrating} onClick={async () => {
            setMigrating(true);
            try { const r = await migrateEvents(); setToast({ type: "success", msg: `Upgraded ${r.events} events and ${r.bookings} bookings.` }); load(); }
            catch (e) { setToast({ type: "error", msg: (e as Error).message }); }
            finally { setMigrating(false); }
          }}>{migrating ? "Upgrading…" : "Upgrade now"}</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={rupees(stats.revenue)} hint="All confirmed bookings" />
        <StatCard label="This month" value={rupees(stats.monthRevenue)} hint={`${stats.monthBookings} booking${stats.monthBookings === 1 ? "" : "s"}`} />
        <StatCard label="Seats sold" value={stats.seats} hint="Confirmed seats" />
        <StatCard label="Upcoming dates" value={stats.upcomingCount} hint="Across published events" />
      </div>

      {attention.length > 0 && (
        <Card title="Needs attention" subtitle="Things to handle so customers aren't left waiting." padded={false}>
          {attention.map(a => (
            <Link key={a.href} href={a.href} className="admin-row" style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 20px", borderTop: `1px solid ${C.sand}` }}>
              <span style={{ width: 36, height: 36, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: a.tone === "bad" ? C.claySoft : C.goldSoft, color: a.tone === "bad" ? C.red : C.gold, flexShrink: 0 }}><AlertTriangle size={18} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{a.text}</span><span style={{ fontSize: 13, color: C.ink }}>{a.sub}</span></span>
              <ArrowRight size={16} color={C.muted} />
            </Link>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Upcoming dates" padded={false} action={<Link href="/admin/events" style={{ fontSize: 14, fontWeight: 600, color: C.green }}>All events</Link>}>
          {stats.upcoming.length === 0 ? <Empty icon={<CalendarDays size={22} />} action={<Link href="/admin/events/create"><Button variant="secondary">Create an event</Button></Link>}>No upcoming dates.</Empty> : stats.upcoming.map(({ e, s }) => {
            const cap = sessionCapacity(e); const sold = sessionSold(s); const pct = cap ? Math.min(100, sold / cap * 100) : 0;
            return (
              <Link key={e.id + s.id} href={`/admin/events/${e.id}`} className="admin-row" style={{ display: "flex", gap: 14, alignItems: "center", padding: "12px 20px", borderTop: `1px solid ${C.sand}` }}>
                <div style={{ width: 44, textAlign: "center", flexShrink: 0, border: `1px solid ${C.sand}`, borderRadius: 8, padding: "4px 0" }}>
                  <p style={{ fontSize: 11, color: C.clay, fontWeight: 600, textTransform: "uppercase" }}>{new Date(`${s.date}T00:00:00+05:30`).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}</p>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>{Number(s.date.slice(8))}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                  <p style={{ fontSize: 13, color: C.ink }}>{formatDateShort(s.date)} · {formatTime12(s.startTime)}</p>
                </div>
                <div style={{ width: 110, flexShrink: 0 }}>
                  {sold >= cap ? <Badge tone="bad">Sold out</Badge> : <>
                    <div style={{ height: 6, background: C.sand, borderRadius: 999 }}><div style={{ width: `${pct}%`, height: "100%", background: C.green, borderRadius: 999 }} /></div>
                    <p style={{ fontSize: 12, color: C.ink, marginTop: 4 }}>{sold}/{cap} booked</p>
                  </>}
                </div>
              </Link>
            );
          })}
        </Card>
        <Card title="Recent bookings" padded={false} action={<Link href="/admin/bookings" style={{ fontSize: 14, fontWeight: 600, color: C.green }}>All bookings</Link>}>
          {stats.recent.length === 0 ? <Empty icon={<Ticket size={22} />}>No bookings yet.</Empty> : stats.recent.map(b => (
            <Link key={b.id} href={`/admin/bookings?id=${b.id}`} className="admin-row" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "12px 20px", borderTop: `1px solid ${C.sand}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                <span style={{ width: 36, height: 36, borderRadius: 999, background: C.greenSoft, color: C.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{b.name.trim().slice(0, 1).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</p>
                  <p style={{ fontSize: 13, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.eventTitle} · {formatDateShort(b.sessionDate)}</p>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}><p style={{ fontSize: 14, fontWeight: 600 }}>{rupees(b.amount)}</p><BookingStatusBadge status={b.status} /></div>
            </Link>
          ))}
        </Card>
      </div>
      {toastNode}
    </div>
  );
}
