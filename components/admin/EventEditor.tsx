"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Circle, Copy, ExternalLink, Plus, Repeat, Trash2 } from "lucide-react";
import { createEvent, updateEvent, validateEventInput, type Event, type EventInput, type EventStatus } from "@/lib/firestore";
import { localToday, sessionStart, type EventSession } from "@/lib/event-sessions";
import { repeatDates, formatDateShort, rupees } from "@/lib/booking-logic";
import { normalizeYouTubeUrls, safeExternalUrl, youtubeVideoId, descriptionText } from "@/lib/event-content";
import { EVENT_CATEGORY_OPTIONS, EVENT_TIME_OPTIONS } from "@/lib/event-options";
import { setUnsaved, confirmLeave } from "@/lib/unsaved";
import { EventDescriptionEditor } from "@/components/EventDescriptionEditor";
import { ImageUploader } from "./ImageUploader";
import { Badge, Button, C, Card, EventStatusBadge, Field, PageHeader, Select, inputStyle, shadow, useToast } from "./ui";

type TicketDraft = { id: string; name: string; price: string; available: string };

const FIELD_SECTION: Record<string, string> = { title: "basics", category: "basics", location: "basics", locationUrl: "basics", sessions: "dates", tickets: "tickets", image: "images", description: "description", videos: "videos" };

function newSession(base?: Partial<EventSession>): EventSession {
  return { id: crypto.randomUUID(), date: "", startTime: "", endTime: "", status: "scheduled", sold: {}, ...base };
}

/** Per-row problems so each date shows its own error instead of one message for the list. */
function sessionRowError(s: EventSession, all: EventSession[], now: number): string | null {
  if (!s.date && !s.startTime && !s.endTime) return null;
  if (!s.date || !s.startTime || !s.endTime) return "Fill in date, start and end.";
  if (s.endTime <= s.startTime) return "End time must be after start time.";
  if (sessionStart(s) <= now) return "This time is in the past.";
  if (all.some(o => o.id !== s.id && o.status !== "cancelled" && o.date === s.date && o.startTime === s.startTime)) return "Duplicate of another date.";
  return null;
}

export function EventEditor({ initial }: { initial?: Event }) {
  const router = useRouter();
  const { setToast, toastNode } = useToast();
  const isEdit = !!initial;
  const original = useMemo(() => initial?.sessions ?? [], [initial]);
  const [now] = useState(() => Date.now());

  const [form, setForm] = useState({
    title: initial?.title ?? "", category: initial?.category ?? "", location: initial?.location ?? "", locationUrl: initial?.locationUrl ?? "",
    description: initial?.description ?? "",
  });
  const [sessions, setSessions] = useState<EventSession[]>(() => {
    const list = initial?.sessions.length ? [...initial.sessions].sort((a, b) => sessionStart(a) - sessionStart(b)) : [];
    return list.some(s => s.status === "scheduled" && sessionStart(s) > Date.now()) ? list : [...list, newSession()];
  });
  const [tickets, setTickets] = useState<TicketDraft[]>(initial?.ticketTypes.map(t => ({ id: t.id, name: t.name, price: String(t.price), available: String(t.available) })) ?? [{ id: crypto.randomUUID(), name: "General", price: "", available: "" }]);
  const [images, setImages] = useState({ cover: initial?.image ?? "", gallery: initial?.gallery ?? [] });
  const [videos, setVideos] = useState<[string, string]>([initial?.youtubeUrls?.[0] ?? "", initial?.youtubeUrls?.[1] ?? ""]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirtyState] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [repeat, setRepeat] = useState({ count: "4", every: "7" });
  const [showLocked, setShowLocked] = useState(false);

  const setDirty = useCallback((v: boolean) => { setDirtyState(v); setUnsaved(v); }, []);
  useEffect(() => () => setUnsaved(false), []);
  const touch = useCallback(<T,>(fn: (v: T) => void) => (v: T) => { setDirty(true); fn(v); }, [setDirty]);
  const setField = (k: keyof typeof form, v: string) => { setDirty(true); setForm(p => ({ ...p, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  useEffect(() => { // honour #dates etc. from other pages
    const id = window.location.hash.slice(1);
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 300);
  }, []);

  const soldByTicket = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of original) for (const [id, n] of Object.entries(s.sold)) m[id] = Math.max(m[id] ?? 0, n);
    return m;
  }, [original]);

  function sessionLock(s: EventSession): string | null {
    const saved = original.find(o => o.id === s.id);
    if (!saved) return null;
    if (saved.status === "cancelled") return "Cancelled";
    if (sessionStart(saved) <= now) return "Completed";
    if (Object.values(saved.sold).some(n => n > 0)) return "Has bookings";
    return null;
  }

  function buildInput(status: EventStatus): EventInput {
    return {
      status,
      title: form.title.trim(), category: form.category, location: form.location.trim(),
      locationUrl: safeExternalUrl(form.locationUrl) ?? "",
      description: form.description, descriptionFormat: "html",
      youtubeUrls: normalizeYouTubeUrls(videos),
      sessions: sessions.filter(s => s.date || s.startTime || s.endTime || original.some(o => o.id === s.id)),
      image: images.cover, gallery: images.gallery,
      ticketTypes: tickets.map(t => ({ id: t.id, name: t.name, price: t.price === "" ? 0 : Number(t.price), available: Number(t.available) })),
    };
  }

  function validate(input: EventInput): Record<string, string> {
    const e = validateEventInput(input, original);
    if (input.status === "published" && !descriptionText(form.description, "html").trim()) e.description = "Write a short description before publishing.";
    if (input.status === "published" && !input.sessions.some(s => s.status === "scheduled" && sessionStart(s) > now)) e.sessions = "Add at least one upcoming date before publishing.";
    const rowErr = sessions.map(s => sessionLock(s) ? null : sessionRowError(s, sessions, now)).find(Boolean);
    if (rowErr) e.sessions = "Fix the highlighted dates.";
    if (form.locationUrl.trim() && !safeExternalUrl(form.locationUrl)) e.locationUrl = "Enter a full link starting with https://";
    if (videos.some(v => v.trim() && !youtubeVideoId(v))) e.videos = "Enter valid YouTube links or leave them empty.";
    return e;
  }

  const status = initial?.status ?? "draft";
  const target: EventStatus = status === "archived" ? "archived" : "published";

  // Live checklist for the side panel.
  const checklist = [
    { ok: !!form.title.trim(), label: "Title", section: "basics" },
    { ok: !!form.category && !!form.location.trim(), label: "Category & venue", section: "basics" },
    { ok: sessions.some(s => s.status === "scheduled" && s.date && s.startTime && s.endTime && sessionStart(s) > now && !sessionRowError(s, sessions, now)), label: "At least one upcoming date", section: "dates" },
    { ok: tickets.every(t => t.name.trim() && Number(t.available) >= 1), label: "Tickets with seats", section: "tickets" },
    { ok: !!images.cover, label: "Cover image", section: "images" },
    { ok: !!descriptionText(form.description, "html").trim(), label: "Description", section: "description" },
  ];
  const ready = checklist.every(c => c.ok);

  async function save(next: EventStatus) {
    if (saving) return;
    if (uploading) { setToast({ type: "error", msg: "Images are still uploading — wait a moment and try again." }); return; }
    const input = buildInput(next);
    const e = validate(input);
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      document.getElementById(FIELD_SECTION[firstKey] ?? "basics")?.scrollIntoView({ behavior: "smooth" });
      setToast({ type: "error", msg: Object.values(e)[0] });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await updateEvent(initial!.id, input);
      const id = isEdit ? initial!.id : await createEvent(input);
      setDirty(false);
      router.push(`/admin/events/${id}`);
    } catch (err) {
      setToast({ type: "error", msg: (err as Error).message });
      setSaving(false);
    }
  }

  function updateSession(id: string, key: "date" | "startTime" | "endTime", v: string) {
    setDirty(true);
    setSessions(list => list.map(s => {
      if (s.id !== id) return s;
      const next = { ...s, [key]: v };
      // Picking a start time suggests an end time 2 hours later.
      if (key === "startTime" && v && (!s.endTime || s.endTime <= v)) {
        const [h, m] = v.split(":").map(Number);
        const end = `${String(Math.min(23, h + 2)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (EVENT_TIME_OPTIONS.some(o => o.value === end)) next.endTime = end;
      }
      return next;
    }));
  }

  function addRepeats() {
    const base = [...sessions].reverse().find(s => s.date && s.startTime && s.endTime);
    if (!base) { setErrors(e => ({ ...e, sessions: "Fill in one date first, then repeat it." })); return; }
    const extra = repeatDates(base, Number(repeat.count), Number(repeat.every)).filter(d => !sessions.some(s => s.date === d.date && s.startTime === base.startTime));
    setDirty(true);
    setSessions(list => [...list.filter(s => s.date || original.some(o => o.id === s.id)), ...extra.map(d => newSession(d))]);
    setToast({ type: "success", msg: `Added ${extra.length} date${extra.length === 1 ? "" : "s"}.` });
  }

  const lockedSessions = sessions.filter(s => sessionLock(s) && sessionLock(s) !== "Has bookings");
  const editableSessions = sessions.filter(s => !lockedSessions.includes(s));

  const timeSelect = (s: EventSession, key: "startTime" | "endTime", disabled: boolean, error?: boolean) => (
    <Select ariaLabel={key === "startTime" ? "Start time" : "End time"} placeholder="Select time" value={s[key]} disabled={disabled} error={error} onChange={v => updateSession(s.id, key, v)}
      options={[...(s[key] && !EVENT_TIME_OPTIONS.some(o => o.value === s[key]) ? [{ value: s[key], label: s[key] }] : []),
        ...EVENT_TIME_OPTIONS.map(o => ({ value: o.value, label: o.label, disabled: key === "endTime" && !!s.startTime && o.value <= s.startTime }))]} />
  );

  const sessionRow = (s: EventSession) => {
    const lock = sessionLock(s);
    const saved = original.some(o => o.id === s.id);
    const booked = Object.values(s.sold).reduce((a, b) => a + b, 0);
    const err = lock ? null : sessionRowError(s, sessions, now);
    return (
      <div key={s.id} style={{ padding: 14, borderRadius: 10, background: lock ? C.bg : "#fff", border: `1px solid ${err ? "#FDA29B" : C.sand}` }}>
        <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-3" style={{ alignItems: "end" }}>
          <Field label="Date"><input type="date" min={lock ? undefined : localToday()} value={s.date} disabled={!!lock} onChange={e => updateSession(s.id, "date", e.target.value)} style={inputStyle(!!err)} /></Field>
          <Field label="Starts">{timeSelect(s, "startTime", !!lock, !!err)}</Field>
          <Field label="Ends">{timeSelect(s, "endTime", !!lock, !!err)}</Field>
          <div style={{ display: "flex", gap: 4, alignItems: "center", paddingBottom: 2 }}>
            <Button variant="ghost" title="Copy to the following week" aria-label="Copy to the following week" disabled={!s.date || !s.startTime} onClick={() => { const [d] = repeatDates(s, 1, 7); if (d && !sessions.some(x => x.date === d.date && x.startTime === s.startTime)) { setDirty(true); setSessions(l => [...l, newSession({ ...d, startTime: s.startTime, endTime: s.endTime })]); } }}><Copy size={16} /></Button>
            {!saved && <Button variant="ghost" aria-label="Remove date" onClick={() => { setDirty(true); setSessions(l => l.filter(x => x.id !== s.id)); }}><Trash2 size={16} /></Button>}
          </div>
        </div>
        {(lock || err) && (
          <p style={{ fontSize: 13, marginTop: 8, color: err ? C.red : C.ink, display: "flex", gap: 8, alignItems: "center" }}>
            {lock && <Badge tone={lock === "Cancelled" ? "bad" : lock === "Has bookings" ? "brand" : "neutral"}>{lock}{booked ? ` · ${booked} booked` : ""}</Badge>}
            {err ?? (lock === "Has bookings" ? "Locked because people have booked. Cancel it from the event page if needed." : null)}
          </p>
        )}
      </div>
    );
  };

  const sectionTitle = (n: number, t: string) => `${n}. ${t}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title={isEdit ? form.title || "Edit event" : "New event"} badge={<>{isEdit && <EventStatusBadge status={status} />}{dirty && <Badge tone="warn">Unsaved changes</Badge>}</>}
        back={<button onClick={() => { if (confirmLeave()) router.push(isEdit ? `/admin/events/${initial!.id}` : "/admin/events"); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: C.ink }}><ArrowLeft size={16} /> {isEdit ? "Back to event" : "Events"}</button>} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6" style={{ alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          <Card id="basics" title={sectionTitle(1, "Basics")} subtitle="What customers see first.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Field label="Event title" required error={errors.title}><input value={form.title} maxLength={140} onChange={e => setField("title", e.target.value)} style={inputStyle(!!errors.title)} placeholder="e.g. Mindful Reset Workshop" /></Field></div>
              <Field label="Category" required error={errors.category}>
                <Select ariaLabel="Category" placeholder="Choose a category" error={!!errors.category} value={form.category} onChange={v => setField("category", v)}
                  options={EVENT_CATEGORY_OPTIONS.map(c => ({ value: c, label: c }))} />
              </Field>
              <Field label="Venue" required error={errors.location} hint="e.g. “Online · Zoom” or a place and city"><input value={form.location} onChange={e => setField("location", e.target.value)} style={inputStyle(!!errors.location)} /></Field>
              <div className="md:col-span-2"><Field label="Google Maps link" hint="Optional — shown as “Open in Maps”" error={errors.locationUrl}><input value={form.locationUrl} onChange={e => setField("locationUrl", e.target.value)} style={inputStyle(!!errors.locationUrl)} placeholder="https://maps.app.goo.gl/…" /></Field></div>
            </div>
          </Card>

          <Card id="dates" title={sectionTitle(2, "Dates & times")} subtitle="All times are IST. Each date has its own seats.">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {lockedSessions.length > 0 && (
                <button onClick={() => setShowLocked(v => !v)} style={{ alignSelf: "flex-start", fontSize: 13, fontWeight: 600, color: C.ink }}>{showLocked ? "Hide" : "Show"} {lockedSessions.length} past or cancelled date{lockedSessions.length === 1 ? "" : "s"}</button>
              )}
              {showLocked && lockedSessions.map(sessionRow)}
              {editableSessions.map(sessionRow)}
              {editableSessions.length === 0 && <p style={{ fontSize: 14, color: C.ink }}>No upcoming dates yet.</p>}
            </div>
            {errors.sessions && <p role="alert" style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{errors.sessions}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap", alignItems: "center", paddingTop: 16, borderTop: `1px solid ${C.sand}` }}>
              <Button variant="secondary" onClick={() => { setDirty(true); setSessions(l => [...l, newSession()]); }}><Plus size={16} /> Add a date</Button>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: C.ink, flexWrap: "wrap" }}>
                <Repeat size={16} /> Repeat last date
                <input type="number" min={1} max={52} value={repeat.count} onChange={e => setRepeat(r => ({ ...r, count: e.target.value }))} style={{ ...inputStyle(), width: 70 }} aria-label="Times" /> more times, every
                <Select width={130} ariaLabel="Interval" value={repeat.every} onChange={v => setRepeat(r => ({ ...r, every: v }))}
                  options={[{ value: "1", label: "day" }, { value: "7", label: "week" }, { value: "14", label: "2 weeks" }, { value: "28", label: "4 weeks" }]} />
                <Button variant="secondary" onClick={addRepeats}>Add</Button>
              </div>
            </div>
          </Card>

          <Card id="tickets" title={sectionTitle(3, "Tickets")} subtitle="Seats are per date. Use price 0 for a free ticket.">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tickets.map((t, i) => {
                const sold = soldByTicket[t.id] ?? 0;
                const priceErr = t.price !== "" && (!Number.isFinite(Number(t.price)) || Number(t.price) < 0);
                const seatsErr = t.available !== "" && (!Number.isInteger(Number(t.available)) || Number(t.available) < Math.max(1, sold));
                return (
                  <div key={t.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-3" style={{ alignItems: "end", padding: 14, borderRadius: 10, border: `1px solid ${C.sand}` }}>
                    <Field label={`Ticket ${i + 1}`}><input value={t.name} onChange={e => touch(setTickets)(tickets.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))} style={inputStyle(!!errors.tickets && !t.name.trim())} placeholder="e.g. Early bird" /></Field>
                    <Field label="Price (₹)" error={priceErr ? "0 or more" : undefined}><input type="number" min={0} inputMode="numeric" value={t.price} onChange={e => touch(setTickets)(tickets.map(x => x.id === t.id ? { ...x, price: e.target.value } : x))} style={inputStyle(priceErr)} placeholder="0 = free" /></Field>
                    <Field label="Seats per date" error={seatsErr ? `At least ${Math.max(1, sold)}` : undefined} hint={sold ? `${sold} already sold` : undefined}><input type="number" min={Math.max(1, sold)} inputMode="numeric" value={t.available} onChange={e => touch(setTickets)(tickets.map(x => x.id === t.id ? { ...x, available: e.target.value } : x))} style={inputStyle(seatsErr)} /></Field>
                    <div style={{ paddingBottom: 2 }}>
                      <Button variant="ghost" aria-label="Remove ticket" disabled={sold > 0 || tickets.length === 1} title={sold > 0 ? "Has bookings — can't remove" : tickets.length === 1 ? "At least one ticket is needed" : undefined} onClick={() => touch(setTickets)(tickets.filter(x => x.id !== t.id))}><Trash2 size={16} /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.tickets && <p role="alert" style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{errors.tickets}</p>}
            <div style={{ marginTop: 14 }}><Button variant="secondary" onClick={() => touch(setTickets)([...tickets, { id: crypto.randomUUID(), name: "", price: "", available: "" }])}><Plus size={16} /> Add ticket type</Button></div>
          </Card>

          <Card id="images" title={sectionTitle(4, "Images")} subtitle="One cover (banner) image plus up to 4 gallery photos.">
            <ImageUploader cover={images.cover} gallery={images.gallery} onChange={touch(setImages)} onBusyChange={setUploading} error={errors.image} />
          </Card>

          <Card id="description" title={sectionTitle(5, "Description")} subtitle="What happens, who it's for, what to bring.">
            <EventDescriptionEditor value={form.description} format={initial?.descriptionFormat ?? "html"} onChange={v => setField("description", v)} />
            {errors.description && <p role="alert" style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{errors.description}</p>}
          </Card>

          <Card id="videos" title={sectionTitle(6, "Videos")} subtitle="Optional — up to two YouTube links.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map((v, i) => (
                <Field key={i} label={`YouTube link ${i + 1}`} error={v.trim() && !youtubeVideoId(v) ? "Not a valid YouTube link" : undefined}><input type="url" value={v} placeholder="https://youtu.be/…" onChange={e => { const n: [string, string] = [...videos]; n[i] = e.target.value; touch(setVideos)(n); }} style={inputStyle(!!v.trim() && !youtubeVideoId(v))} /></Field>
              ))}
            </div>
          </Card>
        </div>

        {/* Side panel: status, checklist, actions */}
        <aside style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 12, padding: 20, boxShadow: shadow }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{status === "published" ? "Live on the website" : status === "archived" ? "Archived" : "Not published yet"}</p>
            <p style={{ fontSize: 13, color: C.ink, marginTop: 2 }}>{status === "published" ? "Changes go live as soon as you save." : status === "archived" ? "Hidden from the website." : ready ? "Everything's ready to publish." : "Complete these to publish:"}</p>
            <ul style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0 18px" }}>
              {checklist.map(c => (
                <li key={c.label}><a href={`#${c.section}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: c.ok ? C.text : C.ink }}>
                  {c.ok ? <span style={{ width: 18, height: 18, borderRadius: 999, background: C.goodSoft, color: C.good, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={12} strokeWidth={3} /></span> : <Circle size={18} color={C.border} />}
                  {c.label}
                </a></li>
              ))}
            </ul>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button disabled={saving || uploading} onClick={() => save(target)} style={{ width: "100%" }}>
                {saving ? "Saving…" : status === "published" ? "Save changes" : status === "archived" ? "Save" : "Publish event"}
              </Button>
              {status === "draft" && <Button variant="secondary" disabled={saving || uploading} onClick={() => save("draft")} style={{ width: "100%" }}>Save as draft</Button>}
              {isEdit && <a href={`/events/${initial!.id}?preview=1`} target="_blank" rel="noopener noreferrer"><Button variant="ghost" style={{ width: "100%" }}><ExternalLink size={16} /> Preview saved version</Button></a>}
            </div>
            {uploading && <p style={{ fontSize: 13, color: C.gold, marginTop: 10 }}>Waiting for images to finish uploading…</p>}
          </div>
          <div className="hidden xl:block" style={{ fontSize: 13, color: C.ink, padding: "0 4px" }}>
            {tickets.filter(t => t.name).map(t => <p key={t.id}>{t.name}: {rupees(Number(t.price) || 0)} · {t.available || 0} seats</p>)}
            {sessions.filter(s => s.date && sessionStart(s) > now && s.status === "scheduled").slice(0, 4).map(s => <p key={s.id}>{formatDateShort(s.date)}</p>)}
          </div>
        </aside>
      </div>
      {/* Mobile / tablet save bar (the side panel sits below the form there) */}
      <div className="flex xl:hidden" style={{ position: "sticky", bottom: 0, zIndex: 20, background: "#fff", borderTop: `1px solid ${C.sand}`, margin: "0 -16px -80px", padding: "12px 16px", gap: 8, justifyContent: "flex-end" }}>
        {status === "draft" && <Button variant="secondary" disabled={saving || uploading} onClick={() => save("draft")}>Save draft</Button>}
        <Button disabled={saving || uploading} onClick={() => save(target)}>{saving ? "Saving…" : uploading ? "Uploading…" : status === "published" ? "Save changes" : status === "archived" ? "Save" : "Publish"}</Button>
      </div>
      {toastNode}
    </div>
  );
}
