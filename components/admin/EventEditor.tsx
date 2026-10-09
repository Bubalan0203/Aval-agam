"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarDays, Check, ChevronDown, Circle, Copy, ExternalLink, Plus, Repeat, Ticket, Trash2 } from "lucide-react";
import { createEvent, updateEvent, validateEventInput, type Event, type EventInput, type EventStatus } from "@/lib/firestore";
import { localToday, sessionStart, type EventSession } from "@/lib/event-sessions";
import { repeatDates, formatDateLong, formatDateShort, formatTime12, rupees } from "@/lib/booking-logic";
import { normalizeYouTubeUrls, safeExternalUrl, youtubeVideoId, descriptionText } from "@/lib/event-content";
import { EVENT_CATEGORY_OPTIONS, EVENT_TIME_OPTIONS } from "@/lib/event-options";
import { setUnsaved, leaveThen } from "@/lib/unsaved";
import { EventDescriptionEditor } from "@/components/EventDescriptionEditor";
import { ImageUploader } from "./ImageUploader";
import { Accordion, Badge, Button, C, EventStatusBadge, Field, PageHeader, Select, inputStyle, shadow, useToast } from "./ui";

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
  const clash = all.find(o => o.id !== s.id && o.status !== "cancelled" && o.date === s.date && o.startTime && o.endTime && s.startTime < o.endTime && o.startTime < s.endTime);
  if (clash) return `Overlaps another active date (${formatTime12(clash.startTime)} – ${formatTime12(clash.endTime)}).`;
  return null;
}

type SectionSummary = { text: string; ok: boolean; optional?: boolean };

/** Collapsible form section: closed it shows what's filled in; open it shows the inputs. */
function EditorSection({ id, n, title, subtitle, open, onToggle, sum, hidden, hasError, children }: { id: string; n: number; title: string; subtitle: string; open: boolean; onToggle: () => void; sum: SectionSummary; hidden: boolean; hasError: boolean; children: React.ReactNode }) {
  if (hidden) return null;
  const done = sum.ok && !sum.optional;
  return (
    <section id={id} style={{ background: "#fff", border: `1px solid ${hasError ? "#FDA29B" : open ? C.border : C.sand}`, borderRadius: 12, boxShadow: open ? shadow : "none", scrollMarginTop: 24, overflow: "hidden" }}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", textAlign: "left" }}>
        <span style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: hasError ? C.claySoft : done ? C.goodSoft : C.bg, color: hasError ? C.red : done ? C.good : C.ink, border: `1px solid ${hasError ? "#FDA29B" : done ? "#ABEFC6" : C.sand}` }}>
          {hasError ? <AlertCircle size={15} /> : done ? <Check size={15} strokeWidth={3} /> : n}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 16, fontWeight: 600, color: C.text }}>{title}</span>
          <span style={{ display: "block", fontSize: 13, color: open ? C.muted : sum.ok ? C.ink : C.gold, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{open ? subtitle : sum.text}</span>
        </span>
        {!open && <Badge tone={hasError ? "bad" : sum.optional ? "neutral" : sum.ok ? "good" : "warn"}>{hasError ? "Fix" : sum.optional ? "Optional" : sum.ok ? "Done" : "Missing"}</Badge>}
        <ChevronDown size={18} color={C.muted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s", flexShrink: 0 }} />
      </button>
      {open && <div style={{ padding: "16px 20px 20px", borderTop: `1px solid ${C.sand}` }}>{children}</div>}
    </section>
  );
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
  // Sections: all open for a new event; collapsed (with a summary) when editing. ?section=dates shows only that section.
  const params = useSearchParams();
  const [only, setOnly] = useState(() => params.get("section") ?? "");
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(params.get("section") ? [params.get("section")!] : initial ? [] : ["basics", "dates", "tickets", "images", "description", "videos"]));
  const toggleSection = (id: string) => setOpenSections(o => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  // Dates collapse once filled in; new or incomplete ones stay open.
  const [openRows, setOpenRows] = useState<Set<string>>(() => new Set());
  const toggleRow = (id: string) => setOpenRows(o => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

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
      const sec = FIELD_SECTION[firstKey] ?? "basics";
      if (only && only !== sec) setOnly("");
      setOpenSections(o => new Set([...o, sec]));
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
    const extra = repeatDates(base, Number(repeat.count), Number(repeat.every)).filter(d => !sessions.some(s => s.status !== "cancelled" && s.date === d.date && s.startTime === base.startTime));
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
    const complete = !!(s.date && s.startTime && s.endTime);
    const open = openRows.has(s.id) || !complete || !!err;
    const tone = lock === "Cancelled" ? "bad" : lock === "Completed" ? "muted" : undefined;
    return (
      <Accordion key={s.id} open={open} onToggle={() => toggleRow(s.id)} tone={tone}
        header={<div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ width: 42, flexShrink: 0, textAlign: "center", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.sand}`, background: "#fff" }}>
            <span style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "#fff", background: lock === "Cancelled" ? C.red : C.green, padding: "2px 0" }}>{s.date ? new Date(`${s.date}T00:00:00`).toLocaleDateString("en-IN", { month: "short" }).toUpperCase() : "NEW"}</span>
            <span style={{ display: "block", fontSize: 16, fontWeight: 700, color: C.text, padding: "2px 0" }}>{s.date ? Number(s.date.slice(8)) : "–"}</span>
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: C.text, textDecoration: lock === "Cancelled" ? "line-through" : "none" }}>{s.date ? formatDateLong(s.date) : "New date"}</span>
            <span style={{ display: "block", fontSize: 13, color: err ? C.red : C.ink }}>{err ?? (complete ? `${formatTime12(s.startTime)} – ${formatTime12(s.endTime)} IST` : "Pick a date and time")}</span>
          </span>
        </div>}
        right={<div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {lock ? <Badge tone={lock === "Cancelled" ? "bad" : lock === "Has bookings" ? "brand" : "neutral"}>{lock}{booked ? ` · ${booked} booked` : ""}</Badge> : saved ? <Badge tone="good" dot>Open</Badge> : <Badge tone="warn">New</Badge>}
          <Button variant="ghost" size="sm" title="Copy to the following week" aria-label="Copy to the following week" disabled={!s.date || !s.startTime} onClick={() => { const [d] = repeatDates(s, 1, 7); if (d && !sessions.some(x => x.status !== "cancelled" && x.date === d.date && x.startTime === s.startTime)) { setDirty(true); setSessions(l => [...l, newSession({ ...d, startTime: s.startTime, endTime: s.endTime })]); } }}><Copy size={15} /></Button>
          {!saved && <Button variant="ghost" size="sm" aria-label="Remove date" onClick={() => { setDirty(true); setSessions(l => l.filter(x => x.id !== s.id)); }}><Trash2 size={15} /></Button>}
        </div>}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ paddingTop: 12 }}>
          <Field label="Date"><input type="date" min={lock ? undefined : localToday()} value={s.date} disabled={!!lock} onChange={e => updateSession(s.id, "date", e.target.value)} style={inputStyle(!!err)} /></Field>
          <Field label="Starts">{timeSelect(s, "startTime", !!lock, !!err)}</Field>
          <Field label="Ends">{timeSelect(s, "endTime", !!lock, !!err)}</Field>
        </div>
        {lock && <p style={{ fontSize: 13, marginTop: 10, color: C.ink }}>{lock === "Has bookings" ? "Locked because people have booked. Cancel it from the event page if needed." : lock === "Cancelled" ? "Cancelled dates stay for your records. You can add the same date again as a new date." : "This date has already happened."}</p>}
      </Accordion>
    );
  };

  const upcomingDates = sessions.filter(x => x.date && x.startTime && x.status === "scheduled" && sessionStart(x) > now).sort((a, b) => sessionStart(a) - sessionStart(b));
  const words = descriptionText(form.description, "html").trim().split(/\s+/).filter(Boolean).length;
  const videoCount: number = videos.filter(v => youtubeVideoId(v)).length;
  const summary: Record<string, SectionSummary> = {
    basics: { text: [form.title.trim(), form.category, form.location.trim()].filter(Boolean).join(" · ") || "Title, category and venue", ok: checklist[0].ok && checklist[1].ok },
    dates: { text: upcomingDates.length ? `${upcomingDates.length} upcoming date${upcomingDates.length === 1 ? "" : "s"} · next ${formatDateShort(upcomingDates[0].date)}, ${formatTime12(upcomingDates[0].startTime)}` : "No upcoming dates", ok: checklist[2].ok },
    tickets: { text: tickets.filter(t => t.name.trim()).map(t => `${t.name.trim()} ${Number(t.price) > 0 ? rupees(Number(t.price)) : "Free"} · ${t.available || 0} seats`).join("  |  ") || "No tickets", ok: checklist[3].ok },
    images: { text: images.cover ? `Cover image + ${images.gallery.length} gallery photo${images.gallery.length === 1 ? "" : "s"}` : "No cover image", ok: checklist[4].ok },
    description: { text: words ? `${words} words · ${descriptionText(form.description, "html").trim().slice(0, 80)}${words > 12 ? "…" : ""}` : "Empty", ok: checklist[5].ok },
    videos: { text: videoCount ? `${videoCount} YouTube video${videoCount === 1 ? "" : "s"}` : "None (optional)", ok: true, optional: true },
  };

  const sec = (id: string, n: number, title: string, subtitle: string) => ({
    id, n, title, subtitle, open: openSections.has(id), onToggle: () => toggleSection(id), sum: summary[id],
    hidden: !!only && only !== id, hasError: Object.keys(errors).some(k => (FIELD_SECTION[k] ?? "basics") === id),
  });


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title={isEdit ? form.title || "Edit event" : "New event"} badge={<>{isEdit && <EventStatusBadge status={status} />}{dirty && <Badge tone="warn">Unsaved changes</Badge>}</>}
        back={<button onClick={() => leaveThen(() => router.push(isEdit ? `/admin/events/${initial!.id}` : "/admin/events"))} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: C.ink }}><ArrowLeft size={16} /> {isEdit ? "Back to event" : "Events"}</button>} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6" style={{ alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, color: C.ink }}>
            {only ? <span>Editing <b style={{ color: C.text }}>dates only</b>. <button type="button" style={{ fontWeight: 600, color: C.green }} onClick={() => setOnly("")}>Show all sections</button></span>
              : <span>{Object.values(summary).filter(x => x.ok && !x.optional).length} of 5 required sections complete</span>}
            {!only && <span style={{ display: "flex", gap: 12 }}>
              <button type="button" style={{ fontWeight: 600, color: C.green }} onClick={() => setOpenSections(new Set(Object.keys(summary)))}>Expand all</button>
              <button type="button" style={{ fontWeight: 600, color: C.green }} onClick={() => setOpenSections(new Set())}>Collapse all</button>
            </span>}
          </div>
          <EditorSection {...sec("basics", 1, "Basics", "What customers see first.")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Field label="Event title" required error={errors.title}><input value={form.title} maxLength={140} onChange={e => setField("title", e.target.value)} style={inputStyle(!!errors.title)} placeholder="e.g. Mindful Reset Workshop" /></Field></div>
              <Field label="Category" required error={errors.category}>
                <Select ariaLabel="Category" placeholder="Choose a category" error={!!errors.category} value={form.category} onChange={v => setField("category", v)}
                  options={EVENT_CATEGORY_OPTIONS.map(c => ({ value: c, label: c }))} />
              </Field>
              <Field label="Venue" required error={errors.location} hint="e.g. “Online · Zoom” or a place and city"><input value={form.location} onChange={e => setField("location", e.target.value)} style={inputStyle(!!errors.location)} /></Field>
              <div className="md:col-span-2"><Field label="Google Maps link" hint="Optional — shown as “Open in Maps”" error={errors.locationUrl}><input value={form.locationUrl} onChange={e => setField("locationUrl", e.target.value)} style={inputStyle(!!errors.locationUrl)} placeholder="https://maps.app.goo.gl/…" /></Field></div>
            </div>
          </EditorSection>

          <EditorSection {...sec("dates", 2, "Dates & times", "All times are IST. Each date has its own seats.")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {editableSessions.length > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: C.ink }}>
                  <span>{editableSessions.filter(x => x.date).length} date{editableSessions.filter(x => x.date).length === 1 ? "" : "s"}</span>
                  <span style={{ display: "flex", gap: 12 }}>
                    <button type="button" style={{ fontWeight: 600, color: C.green }} onClick={() => setOpenRows(new Set(sessions.map(x => x.id)))}>Expand all</button>
                    <button type="button" style={{ fontWeight: 600, color: C.green }} onClick={() => setOpenRows(new Set())}>Collapse all</button>
                  </span>
                </div>
              )}
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
          </EditorSection>

          <EditorSection {...sec("tickets", 3, "Tickets", "Seats are per date. Use price 0 for a free ticket.")}>
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
          </EditorSection>

          <EditorSection {...sec("images", 4, "Images", "One cover (banner) image plus up to 4 gallery photos.")}>
            <ImageUploader cover={images.cover} gallery={images.gallery} onChange={touch(setImages)} onBusyChange={setUploading} error={errors.image} />
          </EditorSection>

          <EditorSection {...sec("description", 5, "Description", "What happens, who it's for, what to bring.")}>
            <EventDescriptionEditor value={form.description} format={initial?.descriptionFormat ?? "html"} onChange={v => setField("description", v)} />
            {errors.description && <p role="alert" style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{errors.description}</p>}
          </EditorSection>

          <EditorSection {...sec("videos", 6, "Videos", "Optional — up to two YouTube links.")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map((v, i) => (
                <Field key={i} label={`YouTube link ${i + 1}`} error={v.trim() && !youtubeVideoId(v) ? "Not a valid YouTube link" : undefined}><input type="url" value={v} placeholder="https://youtu.be/…" onChange={e => { const n: [string, string] = [...videos]; n[i] = e.target.value; touch(setVideos)(n); }} style={inputStyle(!!v.trim() && !youtubeVideoId(v))} /></Field>
              ))}
            </div>
          </EditorSection>
        </div>

        {/* Side panel: status, checklist, actions */}
        <aside style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 12, padding: 20, boxShadow: shadow }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{status === "published" ? "Live on the website" : status === "archived" ? "Archived" : "Not published yet"}</p>
            <p style={{ fontSize: 13, color: C.ink, marginTop: 2 }}>{status === "published" ? "Changes go live as soon as you save." : status === "archived" ? "Hidden from the website." : ready ? "Everything's ready to publish." : "Complete these to publish:"}</p>
            <ul style={{ display: "flex", flexDirection: "column", gap: 8, margin: "14px 0 18px" }}>
              {checklist.map(c => (
                <li key={c.label}><a href={`#${c.section}`} onClick={e => { e.preventDefault(); setOnly(""); setOpenSections(o => new Set([...o, c.section])); setTimeout(() => document.getElementById(c.section)?.scrollIntoView({ behavior: "smooth" }), 50); }} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: c.ok ? C.text : C.ink }}>
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
          <div className="hidden xl:block" style={{ background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 12, boxShadow: shadow, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.sand}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Live summary</p>
              <span style={{ fontSize: 12, color: C.muted }}>Updates as you type</span>
            </div>
            <div style={{ padding: "14px 20px" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", display: "flex", alignItems: "center", gap: 6 }}><Ticket size={13} /> Tickets</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {tickets.filter(t => t.name.trim()).length === 0 && <p style={{ fontSize: 13, color: C.muted }}>No tickets yet.</p>}
                {tickets.filter(t => t.name.trim()).map(t => (
                  <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: C.bg, border: `1px solid ${C.sand}` }}>
                    <div><p style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</p><p style={{ fontSize: 12, color: C.ink }}>{t.available || 0} seats per date</p></div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: Number(t.price) > 0 ? C.text : C.good }}>{Number(t.price) > 0 ? rupees(Number(t.price)) : "Free"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "14px 20px 18px", borderTop: `1px solid ${C.sand}` }}>
              {(() => {
                const up = sessions.filter(s => s.date && s.startTime && sessionStart(s) > now && s.status === "scheduled").sort((a, b) => sessionStart(a) - sessionStart(b));
                return <>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", display: "flex", alignItems: "center", gap: 6 }}><CalendarDays size={13} /> Upcoming dates · {up.length}</p>
                  {up.length === 0 ? <p style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>No upcoming dates.</p> : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                      {up.slice(0, 12).map(s => <span key={s.id} style={{ fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 999, background: C.greenSoft, color: C.green, border: "1px solid #D5E3DD" }}>{formatDateShort(s.date)} · {formatTime12(s.startTime)}</span>)}
                      {up.length > 12 && <span style={{ fontSize: 12, color: C.ink, padding: "5px 4px" }}>+{up.length - 12} more</span>}
                    </div>
                  )}
                  {up.length > 0 && tickets.length > 0 && <p style={{ fontSize: 12, color: C.ink, marginTop: 12 }}>Total capacity: <b style={{ color: C.text }}>{up.length * tickets.reduce((n, t) => n + (Number(t.available) || 0), 0)}</b> seats across all dates</p>}
                </>;
              })()}
            </div>
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
