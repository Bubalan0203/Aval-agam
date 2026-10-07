"use client";
import { useState } from "react";
import { localToday, sessionStart, type EventSession } from "@/lib/event-sessions";
export function newSession(): EventSession { return { id: crypto.randomUUID(), date: "", startTime: "", endTime: "", status: "scheduled", sold: {} }; }
export function EventSessionFields({ value, onChange, persistedIds = [] }: { value: EventSession[]; onChange: (s: EventSession[]) => void; persistedIds?: string[] }) {
  const [now] = useState(() => Date.now());
  function set(id: string, key: "date" | "startTime" | "endTime", v: string) { onChange(value.map(s => s.id === id ? { ...s, [key]: v } : s)); }
  return <section style={{ padding: 24, background: "#FBF4E8", borderRadius: 16 }}>
    <h2 style={{ fontSize: 20, color: "#0F332B", fontWeight: 600 }}>Event dates</h2>
    <p style={{ fontSize: 13, margin: "8px 0 20px" }}>Times are in Asia/Kolkata. Tickets and prices are shared; seat availability is separate for each date. Saved dates stay in the history.</p>
    {value.map((s, i) => {
      const saved = persistedIds.includes(s.id);
      const locked = saved && (s.status === "cancelled" || sessionStart(s) <= now || Object.values(s.sold).some(n => n > 0));
      return <fieldset key={s.id} style={{ border: "1px solid #EEE2D5", padding: 16, borderRadius: 12, marginBottom: 12 }}>
        <legend>Date {i + 1} {s.status === "cancelled" ? "— Cancelled (permanent)" : saved && sessionStart(s) <= now ? "— Completed" : ""}</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{(["date", "startTime", "endTime"] as const).map(k => <label key={k}>{k === "date" ? "Date" : k === "startTime" ? "Start time" : "End time"}<input type={k === "date" ? "date" : "time"} min={k === "date" ? localToday() : undefined} required disabled={locked} value={s[k]} onChange={e => set(s.id, k, e.target.value)} style={{ display: "block", width: "100%", padding: 10, background: "white", borderRadius: 8 }} /></label>)}</div>
        {!saved && value.length > 1 && <button type="button" onClick={() => onChange(value.filter(v => v.id !== s.id))} style={{ marginTop: 12 }}>Remove unsaved date</button>}
        {locked && <p style={{ marginTop: 10, fontSize: 12 }}>This date is read-only. You can add another future date below.</p>}
      </fieldset>;
    })}
    <button type="button" disabled={value.length >= 100} onClick={() => onChange([...value, newSession()])} style={{ padding: "10px 18px", borderRadius: 24, background: "#0F332B", color: "white" }}>+ Add date</button>
  </section>;
}
