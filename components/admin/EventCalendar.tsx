"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Event } from "@/lib/firestore";
import { localToday, sessionStart, type EventSession } from "@/lib/event-sessions";
import { formatDateLong, formatTime12, sessionCapacity, sessionSold } from "@/lib/booking-logic";
import { Badge, C } from "./ui";

type Item = { e: Event; s: EventSession; sold: number; cap: number };
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ymd = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function tone(i: Item) {
  if (i.s.status === "cancelled") return { bg: C.claySoft, fg: C.red, bar: C.red };
  if (i.e.status !== "published") return { bg: "#F2F4F7", fg: C.ink, bar: C.muted };
  if (i.cap && i.sold >= i.cap) return { bg: "#FEF0C7", fg: C.gold, bar: C.gold };
  return { bg: C.greenSoft, fg: C.green, bar: C.green };
}

/** Month view of every event date with seats booked; click a day for its list. */
export function EventCalendar({ events }: { events: Event[] }) {
  const today = localToday();
  const [month, setMonth] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [picked, setPicked] = useState(today);

  const byDay = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const e of events) for (const s of e.sessions) {
      const list = map.get(s.date) ?? [];
      list.push({ e, s, sold: sessionSold(s), cap: sessionCapacity(e) });
      map.set(s.date, list);
    }
    for (const l of map.values()) l.sort((a, b) => sessionStart(a.s) - sessionStart(b.s));
    return map;
  }, [events]);

  const first = new Date(month.y, month.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => i - lead + 1);
  const monthItems = [...byDay.entries()].filter(([d]) => d.startsWith(ymd(month.y, month.m, 1).slice(0, 7))).flatMap(([, l]) => l);
  const active = monthItems.filter(i => i.s.status !== "cancelled");
  const seats = active.reduce((n, i) => n + i.sold, 0), cap = active.reduce((n, i) => n + i.cap, 0);
  const dayItems = byDay.get(picked) ?? [];
  const shift = (n: number) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "16px 20px", borderBottom: `1px solid ${C.sand}` }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Event calendar</p>
          <p style={{ fontSize: 13, color: C.ink }}>{active.length} date{active.length === 1 ? "" : "s"} this month · {seats}/{cap} seats booked{cap ? ` (${Math.round(seats / cap * 100)}%)` : ""}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => { setMonth({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }); setPicked(today); }} style={{ height: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${C.sand}`, fontSize: 13, fontWeight: 600 }}>Today</button>
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.sand}`, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={16} /></button>
          <p style={{ minWidth: 140, textAlign: "center", fontSize: 15, fontWeight: 600 }}>{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.sand}`, display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px]">
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 620, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {WEEKDAYS.map(d => <div key={d} style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: C.muted, borderBottom: `1px solid ${C.sand}`, background: C.bg }}>{d}</div>)}
            {cells.map((n, i) => {
              const inMonth = n >= 1 && n <= days;
              const key = inMonth ? ymd(month.y, month.m, n) : "";
              const items = inMonth ? byDay.get(key) ?? [] : [];
              const isToday = key === today, isPicked = key === picked;
              return (
                <button key={i} type="button" disabled={!inMonth} onClick={() => setPicked(key)}
                  style={{ minHeight: 104, textAlign: "left", padding: 6, borderRight: (i + 1) % 7 ? `1px solid ${C.sand}` : "none", borderBottom: `1px solid ${C.sand}`, background: isPicked ? "#F6FAF8" : inMonth ? "#fff" : C.bg, outline: isPicked ? `2px solid ${C.green}` : "none", outlineOffset: -2, display: "flex", flexDirection: "column", gap: 4, cursor: inMonth ? "pointer" : "default" }}>
                  {inMonth && <span style={{ alignSelf: "flex-start", fontSize: 12, fontWeight: 600, width: 24, height: 24, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: isToday ? C.green : "transparent", color: isToday ? "#fff" : key < today ? C.muted : C.text }}>{n}</span>}
                  {items.slice(0, 2).map(it => { const t = tone(it); return (
                    <span key={it.s.id} title={`${it.e.title} · ${formatTime12(it.s.startTime)} · ${it.sold}/${it.cap} booked`}
                      style={{ display: "block", fontSize: 11, lineHeight: 1.3, padding: "3px 6px", borderRadius: 6, background: t.bg, color: t.fg, borderLeft: `3px solid ${t.bar}`, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", textDecoration: it.s.status === "cancelled" ? "line-through" : "none" }}>
                      <b>{formatTime12(it.s.startTime).replace(":00", "")}</b> {it.e.title} · {it.sold}/{it.cap}
                    </span>
                  ); })}
                  {items.length > 2 && <span style={{ fontSize: 11, fontWeight: 600, color: C.ink, paddingLeft: 4 }}>+{items.length - 2} more</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ borderLeft: `1px solid ${C.sand}`, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.sand}` }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{formatDateLong(picked)}</p>
            <p style={{ fontSize: 12, color: C.ink }}>{dayItems.length ? `${dayItems.length} session${dayItems.length === 1 ? "" : "s"}` : "Nothing scheduled"}</p>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
            {dayItems.length === 0 && <p style={{ fontSize: 13, color: C.muted, padding: "16px 6px", textAlign: "center" }}>Pick a day with events to see details.</p>}
            {dayItems.map(it => { const t = tone(it); const pct = it.cap ? Math.min(100, it.sold / it.cap * 100) : 0; return (
              <Link key={it.s.id} href={`/admin/events/${it.e.id}`} className="admin-row" style={{ display: "block", padding: 12, borderRadius: 10, border: `1px solid ${C.sand}`, borderLeft: `4px solid ${t.bar}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{it.e.title}</p>
                  {it.s.status === "cancelled" ? <Badge tone="bad">Cancelled</Badge> : it.e.status !== "published" ? <Badge>Draft</Badge> : it.sold >= it.cap ? <Badge tone="warn">Full</Badge> : null}
                </div>
                <p style={{ fontSize: 12, color: C.ink, marginTop: 2 }}>{formatTime12(it.s.startTime)} – {formatTime12(it.s.endTime)} · {it.e.location}</p>
                {it.s.status !== "cancelled" && <>
                  <div style={{ height: 6, background: C.sand, borderRadius: 999, marginTop: 10 }}><div style={{ width: `${pct}%`, height: "100%", background: t.bar, borderRadius: 999 }} /></div>
                  <p style={{ fontSize: 12, color: C.ink, marginTop: 4 }}><b style={{ color: C.text }}>{it.sold}</b> of {it.cap} seats booked</p>
                </>}
              </Link>
            ); })}
          </div>
          <div style={{ marginTop: "auto", padding: "10px 18px", borderTop: `1px solid ${C.sand}`, display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: C.ink }}>
            {[["Open", C.green], ["Full", C.gold], ["Draft", C.muted], ["Cancelled", C.red]].map(([l, c]) => <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
