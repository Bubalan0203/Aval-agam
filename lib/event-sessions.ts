/** Dates are venue-local (Asia/Kolkata); persisted identifiers never change. */
export type EventSession = {
  id: string; date: string; startTime: string; endTime: string;
  status: "scheduled" | "cancelled";
  sold: Record<string, number>;
  cancelledAt?: string; cancellationReason?: string;
};
export function time24(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  return `${String(Number(match[1]) % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0)).padStart(2, "0")}:${match[2]}`;
}
export function sessionStart(s: Pick<EventSession, "date" | "startTime">): number {
  return Date.parse(`${s.date}T${time24(s.startTime)}:00+05:30`);
}
export function sessionAvailable(s: EventSession, now = Date.now()): boolean {
  return s.status === "scheduled" && sessionStart(s) > now;
}
export function localToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function legacySessions(event: {sessions?: EventSession[]; date: string; startTime: string; endTime: string; ticketTypes: {id: string; sold: number}[]}): EventSession[] {
  return event.sessions ?? [{ id: "legacy", date: event.date, startTime: time24(event.startTime), endTime: time24(event.endTime), status: "scheduled", sold: Object.fromEntries(event.ticketTypes.map(t => [t.id, t.sold])) }];
}
export function validateSessions(next: EventSession[], previous: EventSession[] = [], now = Date.now()): void {
  if (!next.length || next.length > 100) throw new Error("Add between 1 and 100 dates.");
  const ids = new Set<string>();
  const slots = new Set<string>();
  for (const old of previous) {
    if (!next.some(s => s.id === old.id)) throw new Error("Saved dates cannot be deleted. Cancel an upcoming date instead.");
  }
  for (const s of next) {
    if (!/^[\w-]{1,100}$/.test(s.id) || ids.has(s.id)) throw new Error("Duplicate date identifier.");
    ids.add(s.id);
    const old = previous.find(p => p.id === s.id);
    if (old?.status === "cancelled") {
      if (s.status !== old.status || s.date !== old.date || s.startTime !== old.startTime || s.endTime !== old.endTime) throw new Error("Cancelled dates cannot be changed or reopened.");
      continue;
    }
    if (s.status !== "scheduled") throw new Error("Use the cancellation action to cancel a date.");
    const unchanged = old && s.date === old.date && s.startTime === old.startTime && s.endTime === old.endTime;
    if (!unchanged) {
      if (old && sessionStart(old) <= now) throw new Error("Past dates cannot be edited. Add a new date.");
      if (old && Object.values(old.sold).some(n => n > 0)) throw new Error("A booked date cannot be rescheduled. Cancel it and add a new date.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.endTime) || !Number.isFinite(sessionStart(s)) || sessionStart(s) <= now) throw new Error("Choose a future start time in Asia/Kolkata.");
      if (s.endTime <= s.startTime) throw new Error("End time must be after start time on the same date.");
      if (new Date(sessionStart(s) + 330 * 60000).toISOString().slice(0, 10) !== s.date) throw new Error("Invalid calendar date.");
    }
    // Cancelled dates are skipped above, so a cancelled slot can be re-added; two active dates may not overlap.
    const clash = [...slots].some(k => { const [d, st, en] = k.split("/"); return d === s.date && s.startTime < en && st < s.endTime; });
    if (clash) throw new Error(`Two active dates overlap on ${s.date}. Change or remove one.`);
    slots.add(`${s.date}/${s.startTime}/${s.endTime}`);
  }
}
