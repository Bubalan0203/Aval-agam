import test from "node:test";
import assert from "node:assert/strict";
import { legacySessions, localToday, sessionAvailable, sessionStart, validateSessions, type EventSession } from "../lib/event-sessions";
const now = Date.parse("2026-08-01T10:00:00+05:30");
const session = (changes: Partial<EventSession> = {}): EventSession => ({id:"one",date:"2026-08-07",startTime:"18:30",endTime:"19:30",status:"scheduled",sold:{},...changes});
test("multiple future dates may have different times", () => assert.doesNotThrow(() => validateSessions([session(),session({id:"two",date:"2026-08-08",startTime:"19:30",endTime:"20:30"})],[],now)));
test("cancelled dates cannot be reopened, removed, or moved", () => {
 const old=session({status:"cancelled"});
 for(const next of [[],[session()],[{...old,date:"2026-08-09"}]]) assert.throws(()=>validateSessions(next,[old],now));
 assert.doesNotThrow(()=>validateSessions([old,session({id:"new"})],[old],now));
});
test("completed event can acquire a new future date",()=>{const old=session({date:"2026-07-01"});assert.doesNotThrow(()=>validateSessions([old,session({id:"new"})],[old],now));assert.throws(()=>validateSessions([session()],[old],now));});
test("booked dates cannot move",()=>{const old=session({sold:{adult:2}});assert.throws(()=>validateSessions([session({date:"2026-08-08"})],[old],now));});
test("invalid dates, duplicate slots, reverse times and elapsed times are rejected",()=>{
 for(const changes of [{date:"2026-02-30"},{date:"2026-08-01",startTime:"09:00"},{startTime:"25:00"},{endTime:"18:00"}]) assert.throws(()=>validateSessions([session(changes)],[],now));
 assert.throws(()=>validateSessions([session(),session({id:"two"})],[],now));
});
test("legacy inventory retained under stable id",()=>assert.deepEqual(legacySessions({date:"2026-08-07",startTime:"6:30 PM",endTime:"7:30 PM",ticketTypes:[{id:"adult",sold:3}]}),[session({id:"legacy",sold:{adult:3}})]));
test("availability uses venue timezone and cancellation status",()=>{assert.equal(sessionStart(session()),Date.parse("2026-08-07T13:00:00Z"));assert.equal(sessionAvailable(session({status:"cancelled"}),now),false);assert.equal(localToday(new Date("2026-08-01T20:00:00Z")),"2026-08-02");});

