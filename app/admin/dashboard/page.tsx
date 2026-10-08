"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Clock, ExternalLink, IndianRupee, Plus, Sparkles, Ticket, TrendingUp, Users } from "lucide-react";
import { getBookings, getEvents, migrateEvents, type Booking, type Event } from "@/lib/firestore";
import { sessionStart } from "@/lib/event-sessions";
import { amountMismatch, formatDateShort, formatTime12, rupees, sessionCapacity, sessionSold, upcomingSessions } from "@/lib/booking-logic";
import { EventCalendar } from "@/components/admin/EventCalendar";
import { Badge, BookingStatusBadge, Button, C, Card, Empty, PageSkeleton, shadow, useToast } from "@/components/admin/ui";

const LIST_SIZE = 5;
const STATUS_COLOR: Record<string, string> = { confirmed: "#12B76A", cancelled: "#98A2B3", refund_required: "#F04438", refunded: "#F79009" };
const STATUS_LABEL: Record<string, string> = { confirmed: "Confirmed", cancelled: "Cancelled", refund_required: "Refund needed", refunded: "Refunded" };

/** Tiny line chart for KPI cards. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values), w = 96, h = 32;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity={0.12} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Kpi({ label, value, hint, Icon, color, delta, spark }: { label: string; value: React.ReactNode; hint?: React.ReactNode; Icon: typeof Ticket; color: string; delta?: number | null; spark?: number[] }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 14, padding: 18, boxShadow: shadow, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: C.ink }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: `${color}14`, color, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={17} /></span>
          {label}
        </span>
        {delta != null && Number.isFinite(delta) && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: delta >= 0 ? "#ECFDF3" : "#FEF3F2", color: delta >= 0 ? "#067647" : "#B42318" }} title="vs last month">
            {delta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(Math.round(delta))}%
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
        <div>
          <p style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1.1, letterSpacing: "-.02em" }}>{value}</p>
          {hint && <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{hint}</p>}
        </div>
        {spark && <Sparkline values={spark} color={color} />}
      </div>
    </div>
  );
}

function pct(now: number, before: number) { return before ? ((now - before) / before) * 100 : now ? 100 : null; }

function countdown(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? `in ${d}d ${h}h` : h ? `in ${h}h ${m % 60}m` : `in ${m}m`;
}

export default function AdminDashboardPage() {
  const { setToast, toastNode } = useToast();
  const [data, setData] = useState<{ events: Event[]; bookings: Booking[] } | null>(null);
  const [error, setError] = useState("");
  const [migrating, setMigrating] = useState(false);
  const [nowMs] = useState(() => Date.now());

  const load = () => Promise.all([getEvents(), getBookings()]).then(([events, bookings]) => setData({ events, bookings }))
    .catch(() => setError("Couldn't load data. Check your connection and admin access, then refresh."));
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const now = new Date(nowMs);
    const confirmed = data.bookings.filter(b => b.status === "confirmed");
    const eventsById = new Map(data.events.map(e => [e.id, e]));
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1), end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const list = confirmed.filter(b => { const t = b.bookedAt?.toMillis() ?? 0; return t >= d.getTime() && t < end; });
      return { label: d.toLocaleDateString("en-IN", { month: "short" }), revenue: list.reduce((n, b) => n + b.amount, 0), seats: list.reduce((n, b) => n + b.quantity, 0), bookings: list.length };
    });
    const upcoming = data.events.filter(e => e.status === "published")
      .flatMap(e => upcomingSessions(e).map(s => ({ e, s })))
      .sort((a, b) => sessionStart(a.s) - sessionStart(b.s));
    const cap = upcoming.reduce((n, x) => n + sessionCapacity(x.e), 0), sold = upcoming.reduce((n, x) => n + sessionSold(x.s), 0);
    return {
      months, prev: months[4], cur: months[5], upcoming, upcomingCount: upcoming.length, cap, sold,
      revenue: confirmed.reduce((n, b) => n + b.amount, 0),
      seats: confirmed.reduce((n, b) => n + b.quantity, 0),
      customers: new Set(confirmed.map(b => b.email.toLowerCase())).size,
      refunds: data.bookings.filter(b => b.status === "refund_required"),
      flagged: confirmed.filter(b => amountMismatch(b, eventsById.get(b.eventId))),
      unsentEmails: confirmed.filter(b => !b.confirmationEmailSentAt && b.source === "website" && b.history?.length),
      drafts: data.events.filter(e => e.status === "draft"),
      needsMigration: data.events.some(e => e.schemaVersion !== 3),
      recent: data.bookings.slice(0, LIST_SIZE),
      byStatus: (["confirmed", "cancelled", "refund_required", "refunded"] as const).map(st => ({ st, n: data.bookings.filter(b => b.status === st).length })),
      topEvents: data.events.map(e => ({ e, seats: confirmed.filter(b => b.eventId === e.id).reduce((n, b) => n + b.quantity, 0), revenue: confirmed.filter(b => b.eventId === e.id).reduce((n, b) => n + b.amount, 0) }))
        .filter(x => x.seats > 0).sort((a, b) => b.seats - a.seats).slice(0, LIST_SIZE),
      liveEvents: data.events.filter(e => e.status === "published").length,
    };
  }, [data, nowMs]);

  if (error) return <Card><Empty icon={<AlertTriangle size={22} />}>{error}</Empty></Card>;
  if (!data || !stats) return <PageSkeleton />;

  const attention = [
    stats.refunds.length > 0 && { href: "/admin/bookings?status=refund_required", tone: "bad" as const, text: `${stats.refunds.length} refund${stats.refunds.length === 1 ? "" : "s"} pending`, sub: rupees(stats.refunds.reduce((n, b) => n + b.amount, 0)) },
    stats.flagged.length > 0 && { href: "/admin/bookings?flag=amount", tone: "bad" as const, text: `${stats.flagged.length} underpaid`, sub: "Check in Razorpay" },
    stats.unsentEmails.length > 0 && { href: "/admin/bookings?flag=email", tone: "warn" as const, text: `${stats.unsentEmails.length} email${stats.unsentEmails.length === 1 ? "" : "s"} not sent`, sub: "Resend" },
    stats.drafts.length > 0 && { href: "/admin/events?status=draft", tone: "warn" as const, text: `${stats.drafts.length} draft${stats.drafts.length === 1 ? "" : "s"}`, sub: "Not published" },
  ].filter(Boolean) as { href: string; tone: "bad" | "warn"; text: string; sub: string }[];

  const hour = new Date(nowMs).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const next = stats.upcoming[0];
  const occupancy = stats.cap ? Math.round(stats.sold / stats.cap * 100) : 0;
  const maxRev = Math.max(1, ...stats.months.map(m => m.revenue));
  const totalBookings = Math.max(1, data.bookings.length);
  const shown = stats.byStatus.filter(x => x.n);
  const donut = shown.map((x, i) => { const start = shown.slice(0, i).reduce((n, y) => n + y.n, 0) / totalBookings; return { ...x, start, end: start + x.n / totalBookings }; });
  const arc = (a: number, b: number) => {
    const r = 46, cx = 60, cy = 60, p = (t: number) => [cx + r * Math.sin(2 * Math.PI * t), cy - r * Math.cos(2 * Math.PI * t)];
    if (b - a >= 0.9999) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`;
    const [x1, y1] = p(a), [x2, y2] = p(b);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${b - a > 0.5 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const chartW = 560, chartH = 190;
  const pts = stats.months.map((m, i) => [30 + i * ((chartW - 60) / 5), chartH - 28 - (m.revenue / maxRev) * (chartH - 70)] as const);
  const line = pts.map(p => p.join(",")).join(" ");
  const heroBtn: React.CSSProperties = { height: 40, padding: "0 16px", borderRadius: 10, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 18, padding: "26px 28px", background: "linear-gradient(135deg, #0F332B 0%, #1B4A3F 60%, #2A5E50 100%)", color: "#fff" }}>
        <div aria-hidden style={{ position: "absolute", right: -60, top: -60, width: 260, height: 260, borderRadius: 999, background: "radial-gradient(circle, rgba(201,162,95,.35), transparent 70%)" }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 13, color: "#C9A25F", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><Sparkles size={14} /> {new Date(nowMs).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginTop: 6, letterSpacing: "-.01em" }}>{greeting}</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.78)", marginTop: 4 }}>
              {next ? <>Next up: <b style={{ color: "#fff" }}>{next.e.title}</b> · {formatDateShort(next.s.date)}, {formatTime12(next.s.startTime)} <span style={{ color: "#C9A25F", fontWeight: 600 }}>({countdown(sessionStart(next.s) - nowMs)})</span></> : "No upcoming sessions. Create one to start taking bookings."}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/admin/events/create"><button type="button" style={{ ...heroBtn, background: "#C9A25F", border: "none", color: "#0F332B", fontWeight: 700 }}><Plus size={16} /> New event</button></Link>
            <Link href="/admin/bookings"><button type="button" style={heroBtn}><Ticket size={16} /> Bookings</button></Link>
            <a href="/" target="_blank" rel="noopener noreferrer"><button type="button" style={heroBtn}><ExternalLink size={16} /> Website</button></a>
          </div>
        </div>
        {attention.length > 0 && (
          <div style={{ position: "relative", display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
            {attention.map(a => (
              <Link key={a.href} href={a.href} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 999, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", fontSize: 13 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: a.tone === "bad" ? "#F97066" : "#FDB022" }} />
                <b>{a.text}</b><span style={{ color: "rgba(255,255,255,.7)" }}>· {a.sub}</span><ArrowRight size={13} />
              </Link>
            ))}
          </div>
        )}
      </div>

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

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi label="Total revenue" Icon={IndianRupee} color="#0F332B" value={rupees(stats.revenue)} hint={`${rupees(stats.cur.revenue)} this month`} delta={pct(stats.cur.revenue, stats.prev.revenue)} spark={stats.months.map(m => m.revenue)} />
        <Kpi label="Bookings this month" Icon={Ticket} color="#7A5AF8" value={stats.cur.bookings} hint={`${stats.prev.bookings} last month`} delta={pct(stats.cur.bookings, stats.prev.bookings)} spark={stats.months.map(m => m.bookings)} />
        <Kpi label="Seats sold" Icon={Users} color="#2E90FA" value={stats.seats} hint={`${stats.customers} unique customer${stats.customers === 1 ? "" : "s"}`} delta={pct(stats.cur.seats, stats.prev.seats)} spark={stats.months.map(m => m.seats)} />
        <Kpi label="Upcoming occupancy" Icon={TrendingUp} color="#B8893F" value={`${occupancy}%`} hint={`${stats.sold}/${stats.cap} seats · ${stats.upcomingCount} dates · ${stats.liveEvents} live`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <Card title="Revenue overview" subtitle="Confirmed revenue, last 6 months">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: "auto", maxHeight: 260 }} role="img" aria-label="Revenue by month">
            <defs><linearGradient id="rev" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0F332B" stopOpacity=".25" /><stop offset="100%" stopColor="#0F332B" stopOpacity="0" /></linearGradient></defs>
            {[0, 1, 2, 3].map(i => <line key={i} x1={30} x2={chartW - 30} y1={42 + i * ((chartH - 70) / 3)} y2={42 + i * ((chartH - 70) / 3)} stroke="#EAECF0" strokeDasharray="4 4" />)}
            <polygon points={`${pts[0][0]},${chartH - 28} ${line} ${pts[5][0]},${chartH - 28}`} fill="url(#rev)" />
            <polyline points={line} fill="none" stroke="#0F332B" strokeWidth={2.5} strokeLinejoin="round" />
            {pts.map(([x, y], i) => (
              <g key={i}>
                <circle cx={x} cy={y} r={i === 5 ? 5 : 3.5} fill="#fff" stroke={i === 5 ? "#C9A25F" : "#0F332B"} strokeWidth={2} />
                {stats.months[i].revenue > 0 && <text x={x} y={y - 12} textAnchor="middle" fontSize="11" fill="#475467" fontWeight="600">{rupees(stats.months[i].revenue)}</text>}
                <text x={x} y={chartH - 6} textAnchor="middle" fontSize="12" fill={i === 5 ? "#101828" : "#667085"} fontWeight={i === 5 ? 700 : 500}>{stats.months[i].label}</text>
              </g>
            ))}
          </svg>
        </Card>
        <Card title="Bookings by status" subtitle={`${data.bookings.length} total bookings`}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden>
              <circle cx={60} cy={60} r={46} fill="none" stroke="#F2F4F7" strokeWidth={14} />
              {donut.map(d => <path key={d.st} d={arc(d.start, d.end)} fill="none" stroke={STATUS_COLOR[d.st]} strokeWidth={14} />)}
              <text x={60} y={58} textAnchor="middle" fontSize="22" fontWeight="700" fill="#101828">{data.bookings.length}</text>
              <text x={60} y={76} textAnchor="middle" fontSize="11" fill="#667085">bookings</text>
            </svg>
            <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 10 }}>
              {stats.byStatus.map(x => (
                <Link key={x.st} href={`/admin/bookings?status=${x.st}`} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.ink }}><i style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[x.st] }} />{STATUS_LABEL[x.st]}</span>
                  <b>{x.n} <span style={{ color: C.muted, fontWeight: 400 }}>· {Math.round(x.n / totalBookings * 100)}%</span></b>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <EventCalendar events={data.events} />

      {/* Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Upcoming dates" subtitle={`Next ${Math.min(LIST_SIZE, stats.upcomingCount)} of ${stats.upcomingCount}`} padded={false} action={<Link href="/admin/events" style={{ fontSize: 13, fontWeight: 600, color: C.green }}>View all</Link>}>
          {stats.upcoming.length === 0 ? <Empty icon={<CalendarDays size={22} />}>No upcoming dates.</Empty> : stats.upcoming.slice(0, LIST_SIZE).map(({ e, s }) => {
            const cap = sessionCapacity(e), sold = sessionSold(s), p = cap ? Math.min(100, sold / cap * 100) : 0;
            return (
              <Link key={e.id + s.id} href={`/admin/events/${e.id}`} className="admin-row" style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${C.sand}` }}>
                <div style={{ width: 42, textAlign: "center", flexShrink: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${C.sand}` }}>
                  <p style={{ fontSize: 10, color: "#fff", background: C.green, fontWeight: 700, padding: "2px 0" }}>{new Date(`${s.date}T00:00:00+05:30`).toLocaleDateString("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).toUpperCase()}</p>
                  <p style={{ fontSize: 16, fontWeight: 700, padding: "2px 0" }}>{Number(s.date.slice(8))}</p>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                  <p style={{ fontSize: 12, color: C.ink, display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> {formatTime12(s.startTime)} · {countdown(sessionStart(s) - nowMs)}</p>
                  <div style={{ height: 5, background: C.sand, borderRadius: 999, marginTop: 6 }}><div style={{ width: `${p}%`, height: "100%", background: sold >= cap ? C.gold : C.green, borderRadius: 999 }} /></div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.ink, flexShrink: 0 }}>{sold}/{cap}</span>
              </Link>
            );
          })}
        </Card>
        <Card title="Recent bookings" subtitle={`Latest ${Math.min(LIST_SIZE, data.bookings.length)} of ${data.bookings.length}`} padded={false} action={<Link href="/admin/bookings" style={{ fontSize: 13, fontWeight: 600, color: C.green }}>View all</Link>}>
          {stats.recent.length === 0 ? <Empty icon={<Ticket size={22} />}>No bookings yet.</Empty> : stats.recent.map(b => (
            <Link key={b.id} href={`/admin/bookings?id=${b.id}`} className="admin-row" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "12px 18px", borderTop: `1px solid ${C.sand}` }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                <span style={{ width: 36, height: 36, borderRadius: 999, background: "linear-gradient(135deg, #0F332B, #2A5E50)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{b.name.trim().slice(0, 1).toUpperCase()}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</p>
                  <p style={{ fontSize: 12, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.eventTitle} · {formatDateShort(b.sessionDate)} · {b.quantity} seat{b.quantity === 1 ? "" : "s"}</p>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}><p style={{ fontSize: 13, fontWeight: 700 }}>{rupees(b.amount)}</p><BookingStatusBadge status={b.status} /></div>
            </Link>
          ))}
        </Card>
        <Card title="Top events" subtitle="By confirmed seats" padded={false}>
          {stats.topEvents.length === 0 ? <Empty>No bookings yet.</Empty> : stats.topEvents.map((x, i) => {
            const share = stats.seats ? x.seats / stats.seats * 100 : 0;
            return (
              <Link key={x.e.id} href={`/admin/events/${x.e.id}`} className="admin-row" style={{ display: "block", padding: "12px 18px", borderTop: `1px solid ${C.sand}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 8, background: i === 0 ? "#C9A25F" : C.bg, color: i === 0 ? "#0F332B" : C.ink, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.e.title}</span>
                  <Badge tone="good">{x.seats} seats</Badge>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, paddingLeft: 34 }}>
                  <div style={{ flex: 1, height: 5, background: C.sand, borderRadius: 999 }}><div style={{ width: `${share}%`, height: "100%", background: C.green, borderRadius: 999 }} /></div>
                  <span style={{ fontSize: 12, color: C.ink }}>{rupees(x.revenue)}</span>
                </div>
              </Link>
            );
          })}
        </Card>
      </div>
      {toastNode}
    </div>
  );
}
