import test from "node:test";
import assert from "node:assert/strict";
import { amountMismatch, bookableSessions, checkBookable, repeatDates, toCsv, upcomingSessions } from "../lib/booking-logic";
import type { EventSession } from "../lib/event-sessions";

const NOW = Date.parse("2026-10-01T00:00:00+05:30");
const s = (o: Partial<EventSession>): EventSession => ({ id: "a", date: "2026-10-10", startTime: "10:00", endTime: "12:00", status: "scheduled", sold: {}, ...o });
const event = (sessions: EventSession[]) => ({ sessions, ticketTypes: [{ id: "t", name: "General", price: 500, available: 3 }] });

test("last seat: second buyer is refused", () => {
  const e = event([s({ sold: { t: 2 } })]);
  assert.equal(checkBookable(e, "a", "t", 1, NOW), null);
  assert.equal(checkBookable(event([s({ sold: { t: 3 } })]), "a", "t", 1, NOW), "SOLD_OUT");
  assert.equal(checkBookable(e, "a", "t", 2, NOW), "SOLD_OUT");
});

test("cancelled, past and unknown dates can't be booked", () => {
  assert.equal(checkBookable(event([s({ status: "cancelled" })]), "a", "t", 1, NOW), "DATE_UNAVAILABLE");
  assert.equal(checkBookable(event([s({ date: "2026-09-01" })]), "a", "t", 1, NOW), "DATE_UNAVAILABLE");
  assert.equal(checkBookable(event([s({})]), "zzz", "t", 1, NOW), "DATE_UNAVAILABLE");
});

test("quantity and ticket validation", () => {
  const e = event([s({})]);
  assert.equal(checkBookable(e, "a", "nope", 1, NOW), "TICKET_NOT_FOUND");
  assert.equal(checkBookable(e, "a", "t", 0, NOW), "INVALID_QUANTITY");
  assert.equal(checkBookable(e, "a", "t", 11, NOW), "INVALID_QUANTITY");
  assert.equal(checkBookable(e, "a", "t", 1.5, NOW), "INVALID_QUANTITY");
});

test("upcoming sorts by start and excludes cancelled/past; bookable excludes sold out", () => {
  const e = event([s({ id: "late", date: "2026-11-01" }), s({ id: "full", date: "2026-10-05", sold: { t: 3 } }), s({ id: "x", status: "cancelled" }), s({ id: "old", date: "2026-09-01" })]);
  assert.deepEqual(upcomingSessions(e, NOW).map(x => x.id), ["full", "late"]);
  assert.deepEqual(bookableSessions(e, NOW).map(x => x.id), ["late"]);
});

test("repeatDates builds weekly dates across month boundaries", () => {
  assert.deepEqual(repeatDates({ date: "2026-10-24", startTime: "10:00", endTime: "12:00" }, 2).map(d => d.date), ["2026-10-31", "2026-11-07"]);
  assert.deepEqual(repeatDates({ date: "", startTime: "", endTime: "" }, 2), []);
});

test("amountMismatch flags underpayment but not offline bookings", () => {
  const e = event([]);
  assert.equal(amountMismatch({ amount: 1, quantity: 1, ticketTypeId: "t", paymentMethod: "razorpay" }, e), true);
  assert.equal(amountMismatch({ amount: 1000, quantity: 2, ticketTypeId: "t", paymentMethod: "razorpay" }, e), false);
  assert.equal(amountMismatch({ amount: 0, quantity: 1, ticketTypeId: "t", paymentMethod: "offline" }, e), false);
});

test("CSV quotes values and neutralises formulas", () => {
  assert.equal(toCsv([["a\"b", "=SUM(A1)", 3]]), `"a""b","'=SUM(A1)","3"`);
});
