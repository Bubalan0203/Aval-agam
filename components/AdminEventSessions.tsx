"use client";
import { sendCancellationEmails } from "@/lib/cancellation-email";
import { useState } from "react";
import { cancelEventSession, getEvent, type Event } from "@/lib/firestore";
import { legacySessions, sessionAvailable, type EventSession } from "@/lib/event-sessions";
import { ConfirmModal } from "./ConfirmModal";
export function AdminEventSessions({ event, onUpdate }: { event: Event; onUpdate: (event: Event) => void }) {
  const [sendConfirm, setSendConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<EventSession | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function cancel() {
    if (!pending || busy) return;
    setBusy(true);
    try { await cancelEventSession(event.id, pending.id, reason); const updated = await getEvent(event.id); if (updated) onUpdate(updated); setPending(null); setConfirm(false); const result = await sendCancellationEmails(event.id); setNotice(`Date cancelled. ${result.sent} emails sent; ${result.failed} failed. Use retry for any unsent notices.`); }
    catch (e) { setError((e as Error).message); setConfirm(false); }
    finally { setBusy(false); }
  }
  return <section style={{ padding: 24, borderRadius: 16, background: "#FBF4E8" }}>
    <h2 style={{ fontSize: 22, fontWeight: 600 }}>Scheduled dates</h2>
    {legacySessions(event).map(s => <div key={s.id} style={{ padding: "16px 0", borderBottom: "1px solid #EEE2D5", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div><strong>{s.date} · {s.startTime}–{s.endTime} IST</strong><p>{s.status === "cancelled" ? "Cancelled — permanent" : sessionAvailable(s) ? "Upcoming" : "Started / completed"} · {Object.values(s.sold).reduce((a,b) => a+b,0)} seats booked</p>{event.ticketTypes.map(t => <p key={t.id} style={{ fontSize: 12 }}>{t.name}: {s.sold[t.id] ?? 0} / {t.available} seats booked</p>)}{s.cancellationReason && <p>{s.cancellationReason}</p>}</div>
      {sessionAvailable(s) && <button type="button" onClick={() => { setPending(s); setReason(""); setError(""); }} style={{ color: "#C8734F" }}>Cancel this date</button>}
    </div>)}
    {pending && <div style={{ paddingTop: 16 }}><label>Cancellation reason<textarea value={reason} onChange={e => setReason(e.target.value)} style={{ display: "block", width: "100%", border: "1px solid #C9A25F", padding: 12 }} /></label><button type="button" disabled={!reason.trim() || busy} onClick={() => setConfirm(true)}>Review cancellation</button><button type="button" disabled={busy} onClick={() => setPending(null)} style={{ marginLeft: 20 }}>Keep date</button></div>}
    <button type="button" disabled={busy} onClick={() => setSendConfirm(true)} style={{ marginTop: 20 }}>Retry cancellation emails</button>
    {notice && <p role="status">{notice}</p>}
    <ConfirmModal open={sendConfirm} title="Send cancellation emails?" message="Send unsent cancellation notices for this event using EmailJS. Keep this page open until delivery finishes." confirmLabel="Send notices" busy={busy} onCancel={() => setSendConfirm(false)} onConfirm={async () => {
      if (busy) return; setBusy(true);
      try { const result = await sendCancellationEmails(event.id); setNotice(`${result.sent} cancellation emails sent; ${result.failed} failed.`); }
      catch (e) { setError((e as Error).message); }
      finally { setBusy(false); setSendConfirm(false); }
    }} />
    {error && <p role="alert">{error}</p>}
    <ConfirmModal open={confirm} title="Permanently cancel this date?" message={`${pending?.date} ${pending?.startTime} will be marked Cancelled and cannot be reopened or deleted. Bookings remain in history. Cancellation emails will be sent using EmailJS. Paid bookings will show Refund needed; no refund is issued automatically.`} confirmLabel="Cancel date permanently" busy={busy} onConfirm={() => void cancel()} onCancel={() => setConfirm(false)} />
  </section>;
}
