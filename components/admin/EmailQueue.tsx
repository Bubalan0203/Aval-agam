"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Mail, X, XCircle } from "lucide-react";
import type { QueueItem } from "@/lib/cancellation-email";
import { C } from "./ui";

export type EmailJob = { title: string; items: QueueItem[]; done: boolean; error?: string };

/** Floating bottom-right panel showing cancellation emails as they go out. */
export function EmailQueue({ job, onClose }: { job: EmailJob | null; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const items = job?.items ?? [];
  const sent = items.filter(i => i.state === "sent").length;
  const failed = items.filter(i => i.state === "failed").length;
  const finished = items.filter(i => i.state !== "queued" && i.state !== "sending").length;
  const pct = items.length ? Math.round(finished / items.length * 100) : job?.done ? 100 : 0;
  const ok = job?.done && !failed && !job.error;

  // Warn before leaving while emails are still being sent from this browser.
  useEffect(() => {
    if (!job || job.done) return;
    const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", stop);
    return () => window.removeEventListener("beforeunload", stop);
  }, [job]);

  // A clean finish closes itself after a few seconds.
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [ok, onClose]);

  if (!job) return null;
  const head = !job.done
    ? `Sending ${Math.min(finished + 1, items.length || 1)} of ${items.length || "…"}`
    : job.error ? "Sending stopped"
    : failed ? `${sent} sent · ${failed} failed`
    : items.length ? `All ${sent} email${sent === 1 ? "" : "s"} sent` : "No emails to send";
  const tint = !job.done ? C.green : ok ? C.green : C.red;

  return (
    <div role="status" aria-live="polite" style={{ position: "fixed", right: 20, bottom: 20, zIndex: 60, width: "min(360px, calc(100vw - 32px))", background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 14, boxShadow: "0 18px 40px -12px rgba(15,51,43,.35)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: job.done && !ok ? C.claySoft : C.greenSoft, color: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {!job.done ? <Loader2 size={17} className="animate-spin" /> : ok ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{head}</p>
          <p style={{ fontSize: 12, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.error ?? job.title}</p>
        </div>
        {items.length > 0 && <button type="button" aria-label={open ? "Hide list" : "Show list"} onClick={() => setOpen(v => !v)} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink }}>{open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>}
        {job.done && <button type="button" aria-label="Close" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: C.ink }}><X size={16} /></button>}
      </div>
      <div style={{ height: 4, background: C.sand }}><div style={{ width: `${pct}%`, height: "100%", background: tint, transition: "width .3s" }} /></div>
      {open && items.length > 0 && (
        <ul style={{ maxHeight: 220, overflowY: "auto", padding: "6px 0", margin: 0, listStyle: "none" }}>
          {items.map(i => (
            <li key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", fontSize: 13 }}>
              <Mail size={14} style={{ color: C.muted, flexShrink: 0 }} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.name || i.email}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: i.state === "sent" ? C.green : i.state === "failed" ? C.red : C.muted }}>
                {i.state === "sending" ? "Sending…" : i.state === "sent" ? "Sent" : i.state === "failed" ? "Failed" : i.state === "skipped" ? "Already sent" : "Queued"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!job.done && <p style={{ fontSize: 11, color: C.muted, padding: "8px 14px", borderTop: `1px solid ${C.sand}` }}>Keep this tab open until sending finishes.</p>}
      {job.done && failed > 0 && <p style={{ fontSize: 12, color: C.ink, padding: "8px 14px", borderTop: `1px solid ${C.sand}` }}>Use &ldquo;Resend failed&rdquo; on the dates list to retry.</p>}
    </div>
  );
}
