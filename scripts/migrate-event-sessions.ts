/** Explicit offline migration. Run dry first; never runs from a web request. */
import { writeFileSync } from "node:fs";
import { adminDb } from "../lib/server-admin";
import { legacySessions } from "../lib/event-sessions";
import type { Event } from "../lib/firestore";
async function main() {
const apply = process.argv.includes("--apply");
if (apply && process.env.EVENT_BOOKING_MAINTENANCE !== "true") throw new Error("Pause booking traffic before applying the migration.");
const db = adminDb();
const events = await db.collection("events").get();
const bookings = await db.collection("bookings").get();
const path = `/tmp/event-migration-${Date.now()}.json`;
writeFileSync(path, JSON.stringify({ events: events.docs.map(d => ({ id: d.id, data: d.data() })), bookings: bookings.docs.map(d => ({ id: d.id, data: d.data() })) }, null, 2), { mode: 0o600, flag: "wx" });
const problems: string[] = [];
for (const b of bookings.docs) if (!events.docs.some(e => e.id === b.data().eventId)) problems.push(`Orphan booking ${b.id}`);
for (const event of events.docs) {
  const value = event.data() as Event;
  if (value.schemaVersion === 2) continue;
  const sessions = legacySessions(value);
  if (!value.date || !sessions[0].startTime || !sessions[0].endTime) problems.push(`Invalid legacy date/time: ${event.id}`);
  for (const ticket of value.ticketTypes) {
    const total = bookings.docs.filter(b => b.data().eventId === event.id && (b.data().ticketTypeId === ticket.id || b.data().ticketType === ticket.name)).reduce((sum,b) => sum + b.data().quantity, 0);
    if (total !== ticket.sold) problems.push(`Inventory mismatch: ${event.id}/${ticket.id}`);
  }
  for (const b of bookings.docs.filter(b => b.data().eventId === event.id)) {
    if (value.ticketTypes.filter(t => b.data().ticketTypeId ? t.id === b.data().ticketTypeId : t.name === b.data().ticketType).length !== 1) problems.push(`Unmatched ticket: ${b.id}`);
  }
}
console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", events: events.size, bookings: bookings.size, backup: path, problems }, null, 2));
if (problems.length) throw new Error("Resolve migration exceptions before applying.");
if (apply) for (const event of events.docs) {
  await db.runTransaction(async tx => {
    const current = await tx.get(event.ref); const value = current.data() as Event;
    if (value.schemaVersion === 2) return;
    tx.update(event.ref, { sessions: legacySessions(value), schemaVersion: 2 });
  });
  for (const booking of bookings.docs.filter(b => b.data().eventId === event.id && !b.data().sessionId)) {
    await db.runTransaction(async tx => {
      const current = (await tx.get(booking.ref)).data()!;
      if (current.sessionId) return;
      const value = event.data() as Event;
      tx.update(booking.ref, { sessionId: "legacy", sessionDate: value.date, sessionStartTime: value.startTime, sessionEndTime: value.endTime, status: current.status ?? "confirmed" });
    });
  }
}

}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
