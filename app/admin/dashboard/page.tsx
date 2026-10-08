"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import { getBookings, getEvents, migrateEvents, type Booking, type Event } from "@/lib/firestore";
import { amountMismatch, formatDateShort, formatTime12, rupees, sessionCapacity, sessionSold, upcomingSessions } from "@/lib/booking-logic";
import { Badge, BookingStatusBadge, Button, C, Card, Empty, useToast } from "@/components/admin/ui";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { setToast, toastNode } = useToast();
  const [data, setData] = useState<{ events: Event[]; bookings: Booking[] } | null>(null);
  const [error, setError] = useState("");
  const [migrating, setMigrating] = useState(false);

  const load = () => Promise.all([getEvents(), getBookings()]).then(([events, bookings]) => setData({ events, bookings }))
    .catch(() => setError("Could not load data. Check Firebase configuration and admin access."));
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
      .sort((a, b) => `${a.s.date}${a.s.startTime}`.localeCompare(`${b.s.date}${b.s.startTime}`)).slice(0, 8);
    return {
      revenue: confirmed.reduce((n, b) => n + b.amount, 0),
      monthRevenue: thisMonth.reduce((n, b) => n + b.amount, 0),
      monthBookings: thisMonth.length,
      seats: confirmed.reduce((n, b) => n + b.quantity, 0),
      refunds: data.bookings.filter(b => b.status === "refund_required"),
      flagged: confirmed.filter(b => amountMismatch(b, eventsById.get(b.eventId))),
      unsentEmails: confirmed.filter(b => !b.confirmationEmailSentAt && b.source === "website"),
      drafts: data.events.filter(e => e.status === "draft").length,
      needsMigration: data.events.some(e => e.schemaVersion !== 3),
      upcoming, recent: data.bookings.slice(0, 8),
    };
  }, [data]);

  if (error) return <Empty>{error}</Empty>;
  if (!data || !stats) return <Empty>Loading…</Empty>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700, color: C.green }}>Dashboard</h1>
        <Link href="/admin/events/create"><Button><Plus size={14} /> New event</Button></Link>
      </div>

      {stats.needsMigration && (
        <Card title="Data upgrade needed" subtitle="Some events use the old format. Upgrade once so seat counts, statuses and bookings line up with the new admin.">
          <Button disabled={migrating} onClick={async () => {
            setMigrating(true);
            try { const r = await migrateEvents(); setToast({ type: "success", msg: `Upgraded ${r.events} events and ${r.bookings} bookings.` }); load(); }
            catch (e) { setToast({ type: "error", msg: (e as Error).message }); }
            finally { setMigrating(false); }
          }}>{migrating ? "Upgrading…" : "Upgrade now"}</Button>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Revenue (all time)", rupees(stats.revenue)],
          ["This month", `${rupees(stats.monthRevenue)} · ${stats.monthBookings}`],
          ["Seats sold", stats.seats],
          ["Drafts", stats.drafts],
        ].map(([k, v]) => (
          <div key={k as string} style={{ background: C.cream, borderRadius: 14, padding: 16 }}>
            <p style={{ fontSize: 12, opacity: 0.6 }}>{k}</p>
            <p style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: C.green }}>{v}</p>
          </div>
        ))}
      </div>

      {(stats.refunds.length > 0 || stats.flagged.length > 0 || stats.unsentEmails.length > 0) && (
        <Card title="Needs attention">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {stats.refunds.length > 0 && <Link href="/admin/bookings?status=refund_required" style={{ display: "flex", gap: 8, alignItems: "center", color: C.clay, fontWeight: 600 }}><AlertTriangle size={14} /> {stats.refunds.length} booking{stats.refunds.length === 1 ? "" : "s"} waiting for a refund ({rupees(stats.refunds.reduce((n, b) => n + b.amount, 0))})</Link>}
            {stats.flagged.length > 0 && <Link href="/admin/bookings" style={{ display: "flex", gap: 8, alignItems: "center", color: C.clay }}><AlertTriangle size={14} /> {stats.flagged.length} paid amount{stats.flagged.length === 1 ? "" : "s"} below the ticket price — check in Razorpay</Link>}
            {stats.unsentEmails.length > 0 && <Link href="/admin/bookings?status=confirmed" style={{ display: "flex", gap: 8, alignItems: "center", color: C.ink }}><AlertTriangle size={14} /> {stats.unsentEmails.length} confirmation email{stats.unsentEmails.length === 1 ? "" : "s"} not sent — open the booking to resend</Link>}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Upcoming dates">
          {stats.upcoming.length === 0 ? <Empty>No upcoming dates.</Empty> : stats.upcoming.map(({ e, s }) => {
            const cap = sessionCapacity(e); const sold = sessionSold(s);
            return (
              <div key={e.id + s.id} onClick={() => router.push(`/admin/events/${e.id}`)} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.sand}`, cursor: "pointer", fontSize: 13 }}>
                <div style={{ minWidth: 0 }}><p style={{ fontWeight: 600, color: C.green }}>{e.title}</p><p style={{ fontSize: 12, opacity: 0.65 }}>{formatDateShort(s.date)} · {formatTime12(s.startTime)}</p></div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>{sold >= cap ? <Badge tone="warn">Sold out</Badge> : <span>{sold}/{cap}</span>}</div>
              </div>
            );
          })}
        </Card>
        <Card title="Recent bookings" action={<Link href="/admin/bookings" style={{ fontSize: 13, color: C.clay }}>All bookings →</Link>}>
          {stats.recent.length === 0 ? <Empty>No bookings yet.</Empty> : stats.recent.map(b => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: `1px solid ${C.sand}`, fontSize: 13 }}>
              <div style={{ minWidth: 0 }}><p style={{ fontWeight: 600, color: C.green }}>{b.name}</p><p style={{ fontSize: 12, opacity: 0.65 }}>{b.eventTitle} · {formatDateShort(b.sessionDate)}</p></div>
              <div style={{ textAlign: "right" }}><p style={{ fontWeight: 600 }}>{rupees(b.amount)}</p><BookingStatusBadge status={b.status} /></div>
            </div>
          ))}
        </Card>
      </div>
      {toastNode}
    </div>
  );
}
