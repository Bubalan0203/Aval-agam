"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Eye, Plus, Repeat, Trash2 } from "lucide-react";
import { createEvent, updateEvent, validateEventInput, type Event, type EventInput, type EventStatus } from "@/lib/firestore";
import { localToday, sessionStart, type EventSession } from "@/lib/event-sessions";
import { repeatDates } from "@/lib/booking-logic";
import { normalizeYouTubeUrls, safeExternalUrl, youtubeVideoId, descriptionText } from "@/lib/event-content";
import { EVENT_CATEGORY_OPTIONS, EVENT_TIME_OPTIONS } from "@/lib/event-options";
import { EventDescriptionEditor } from "@/components/EventDescriptionEditor";
import { ImageUploader } from "./ImageUploader";
import { Badge, Button, C, Card, EventStatusBadge, Field, inputStyle, useToast } from "./ui";

type TicketDraft = { id: string; name: string; price: string; available: string };

const SECTIONS = [
  ["basics", "Basics"], ["dates", "Dates"], ["tickets", "Tickets"], ["images", "Images"], ["description", "Description"], ["videos", "Videos"],
] as const;

function newSession(base?: Partial<EventSession>): EventSession {
  return { id: crypto.randomUUID(), date: "", startTime: "", endTime: "", status: "scheduled", sold: {}, ...base };
}

export function EventEditor({ initial }: { initial?: Event }) {
  const router = useRouter();
  const { setToast, toastNode } = useToast();
  const isEdit = !!initial;
  const original = useMemo(() => initial?.sessions ?? [], [initial]);

  const [form, setForm] = useState({
    title: initial?.title ?? "", category: initial?.category ?? "", location: initial?.location ?? "", locationUrl: initial?.locationUrl ?? "",
    description: initial?.description ?? "",
  });
  const [sessions, setSessions] = useState<EventSession[]>(initial?.sessions.length ? initial.sessions : [newSession()]);
  const [tickets, setTickets] = useState<TicketDraft[]>(initial?.ticketTypes.map(t => ({ id: t.id, name: t.name, price: String(t.price), available: String(t.available) })) ?? [{ id: crypto.randomUUID(), name: "General", price: "", available: "" }]);
  const [images, setImages] = useState({ cover: initial?.image ?? "", gallery: initial?.gallery ?? [] });
  const [videos, setVideos] = useState<[string, string]>([initial?.youtubeUrls?.[0] ?? "", initial?.youtubeUrls?.[1] ?? ""]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [repeat, setRepeat] = useState({ count: "4", every: "7" });

  const touch = useCallback(<T,>(fn: (v: T) => void) => (v: T) => { setDirty(true); fn(v); }, []);
  const setField = (k: keyof typeof form, v: string) => { setDirty(true); setForm(p => ({ ...p, [k]: v })); };

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Sold seats per ticket, max across dates (capacity can't go below it).
  const soldByTicket = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of original) for (const [id, n] of Object.entries(s.sold)) m[id] = Math.max(m[id] ?? 0, n);
    return m;
  }, [original]);

  const [now] = useState(() => Date.now());
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
    if (input.status === "published" && !descriptionText(form.description, "html").trim()) e.description = "Write a description before publishing.";
    if (form.locationUrl.trim() && !safeExternalUrl(form.locationUrl)) e.locationUrl = "Enter a full link starting with https://";
    if (videos.some(v => v.trim() && !youtubeVideoId(v))) e.videos = "Enter valid YouTube links or leave them empty.";
    return e;
  }

  async function save(status: EventStatus) {
    if (saving) return;
    if (uploading) { setToast({ type: "error", msg: "Wait for image uploads to finish." }); return; }
    const input = buildInput(status);
    const e = validate(input);
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      const section = ({ title: "basics", category: "basics", location: "basics", locationUrl: "basics", sessions: "dates", tickets: "tickets", image: "images", description: "description", videos: "videos" } as Record<string, string>)[firstKey];
      document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
      setToast({ type: "error", msg: "Fix the highlighted fields." });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await updateEvent(initial!.id, input);
      const id = isEdit ? initial!.id : await createEvent(input);
      setDirty(false);
      setToast({ type: "success", msg: status === "published" ? "Event published." : "Saved." });
      router.push(`/admin/events/${id}`);
    } catch (err) {
      setToast({ type: "error", msg: (err as Error).message });
    } finally { setSaving(false); }
  }

  function updateSession(id: string, key: "date" | "startTime" | "endTime", v: string) {
    setDirty(true);
    setSessions(list => list.map(s => s.id === id ? { ...s, [key]: v } : s));
  }

  function addRepeats() {
    const base = [...sessions].reverse().find(s => s.date && s.startTime && s.endTime);
    if (!base) { setErrors(e => ({ ...e, sessions: "Fill in one date and time first, then repeat it." })); return; }
    const extra = repeatDates(base, Number(repeat.count), Number(repeat.every)).filter(d => !sessions.some(s => s.date === d.date && s.startTime === d.startTime));
    setDirty(true);
    setSessions(list => [...list.filter(s => s.date || original.some(o => o.id === s.id)), ...extra.map(d => newSession(d))]);
  }

  const status = initial?.status ?? "draft";
  const timeSelect = (s: EventSession, key: "startTime" | "endTime", disabled: boolean) => (
    <select value={s[key]} disabled={disabled} onChange={e => updateSession(s.id, key, e.target.value)} style={inputStyle()}>
      <option value="">—</option>
      {s[key] && !EVENT_TIME_OPTIONS.some(o => o.value === s[key]) && <option value={s[key]}>{s[key]}</option>}
      {EVENT_TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button variant="secondary" onClick={() => { if (!dirty || confirm("Discard unsaved changes?")) router.push(isEdit ? `/admin/events/${initial!.id}` : "/admin/events"); }}><ArrowLeft size={14} /> Back</Button>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: C.green }}>{isEdit ? "Edit event" : "New event"}</h1>
          {isEdit && <EventStatusBadge status={status} />}
          {dirty && <Badge tone="warn">Unsaved changes</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-5">
        <nav className="hidden lg:flex" style={{ flexDirection: "column", gap: 4, position: "sticky", top: 90, alignSelf: "start" }}>
          {SECTIONS.map(([id, label]) => {
            const hasErr = Object.keys(errors).some(k => ({ title: "basics", category: "basics", location: "basics", locationUrl: "basics", sessions: "dates", tickets: "tickets", image: "images", description: "description", videos: "videos" } as Record<string, string>)[k] === id);
            return <a key={id} href={`#${id}`} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, color: hasErr ? C.clay : C.ink, fontWeight: hasErr ? 600 : 400 }}>{label}{hasErr ? " •" : ""}</a>;
          })}
        </nav>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Card id="basics" title="Basics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><Field label="Title" required error={errors.title}><input value={form.title} onChange={e => setField("title", e.target.value)} style={inputStyle(!!errors.title)} placeholder="e.g. Inner Child Healing Workshop" /></Field></div>
              <Field label="Category" required error={errors.category}>
                <select value={form.category} onChange={e => setField("category", e.target.value)} style={inputStyle(!!errors.category)}>
                  <option value="">Choose…</option>
                  {EVENT_CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Venue" required error={errors.location}><input value={form.location} onChange={e => setField("location", e.target.value)} style={inputStyle(!!errors.location)} placeholder="Venue name, city" /></Field>
              <div className="md:col-span-2"><Field label="Map link" hint="Optional Google Maps link" error={errors.locationUrl}><input value={form.locationUrl} onChange={e => setField("locationUrl", e.target.value)} style={inputStyle(!!errors.locationUrl)} placeholder="https://maps.google.com/…" /></Field></div>
            </div>
          </Card>

          <Card id="dates" title="Dates" subtitle="Times are IST. Each date has its own seats. Dates with bookings are locked — cancel them from the event page instead.">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sessions.map((s, i) => {
                const lock = sessionLock(s);
                const saved = original.some(o => o.id === s.id);
                const booked = Object.values(s.sold).reduce((a, b) => a + b, 0);
                return (
                  <div key={s.id} className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-3" style={{ alignItems: "end", padding: 12, borderRadius: 12, background: lock ? C.sand : "#fff", border: `1px solid ${C.sand}` }}>
                    <Field label={`Date ${i + 1}`}><input type="date" min={lock ? undefined : localToday()} value={s.date} disabled={!!lock} onChange={e => updateSession(s.id, "date", e.target.value)} style={inputStyle()} /></Field>
                    <Field label="Start">{timeSelect(s, "startTime", !!lock)}</Field>
                    <Field label="End">{timeSelect(s, "endTime", !!lock)}</Field>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", paddingBottom: 4 }}>
                      {lock && <Badge tone={lock === "Cancelled" ? "warn" : "neutral"}>{lock}{booked ? ` · ${booked} booked` : ""}</Badge>}
                      <Button variant="ghost" title="Copy to next week" aria-label="Copy to next week" disabled={!s.date} onClick={() => { const [d] = repeatDates(s, 1, 7); if (d) { setDirty(true); setSessions(l => [...l, newSession(d)]); } }}><Copy size={14} /></Button>
                      {!saved && <Button variant="ghost" aria-label="Remove date" onClick={() => { setDirty(true); setSessions(l => l.filter(x => x.id !== s.id)); }}><Trash2 size={14} /></Button>}
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.sessions && <p role="alert" style={{ color: C.clay, fontSize: 12, marginTop: 8 }}>{errors.sessions}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              <Button variant="secondary" onClick={() => { setDirty(true); setSessions(l => [...l, newSession()]); }}><Plus size={14} /> Add date</Button>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.ink, flexWrap: "wrap" }}>
                <Repeat size={14} color={C.gold} /> Repeat last date
                <input type="number" min={1} max={52} value={repeat.count} onChange={e => setRepeat(r => ({ ...r, count: e.target.value }))} style={{ ...inputStyle(), width: 64 }} /> times, every
                <select value={repeat.every} onChange={e => setRepeat(r => ({ ...r, every: e.target.value }))} style={{ ...inputStyle(), width: 110 }}>
                  <option value="1">day</option><option value="7">week</option><option value="14">2 weeks</option><option value="28">4 weeks</option>
                </select>
                <Button variant="secondary" onClick={addRepeats}>Add</Button>
              </div>
            </div>
          </Card>

          <Card id="tickets" title="Tickets" subtitle="Seats are per date. Price 0 means free.">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tickets.map((t, i) => {
                const sold = soldByTicket[t.id] ?? 0;
                return (
                  <div key={t.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-3" style={{ alignItems: "end", padding: 12, borderRadius: 12, background: "#fff", border: `1px solid ${C.sand}` }}>
                    <Field label={`Ticket ${i + 1} name`}><input value={t.name} onChange={e => touch(setTickets)(tickets.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))} style={inputStyle()} placeholder="e.g. Early bird" /></Field>
                    <Field label="Price (₹)"><input type="number" min={0} inputMode="numeric" value={t.price} onChange={e => touch(setTickets)(tickets.map(x => x.id === t.id ? { ...x, price: e.target.value } : x))} style={inputStyle()} placeholder="0" /></Field>
                    <Field label="Seats per date" hint={sold ? `Min ${sold} (already sold)` : undefined}><input type="number" min={Math.max(1, sold)} inputMode="numeric" value={t.available} onChange={e => touch(setTickets)(tickets.map(x => x.id === t.id ? { ...x, available: e.target.value } : x))} style={inputStyle()} /></Field>
                    <div style={{ paddingBottom: 4 }}>
                      <Button variant="ghost" aria-label="Remove ticket" disabled={sold > 0 || tickets.length === 1} title={sold > 0 ? "Has bookings" : undefined} onClick={() => touch(setTickets)(tickets.filter(x => x.id !== t.id))}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {errors.tickets && <p role="alert" style={{ color: C.clay, fontSize: 12, marginTop: 8 }}>{errors.tickets}</p>}
            <div style={{ marginTop: 14 }}><Button variant="secondary" onClick={() => touch(setTickets)([...tickets, { id: crypto.randomUUID(), name: "", price: "", available: "" }])}><Plus size={14} /> Add ticket type</Button></div>
          </Card>

          <Card id="images" title="Images">
            <ImageUploader cover={images.cover} gallery={images.gallery} onChange={touch(setImages)} onBusyChange={setUploading} error={errors.image} />
          </Card>

          <Card id="description" title="Description">
            <EventDescriptionEditor value={form.description} format={initial?.descriptionFormat ?? "html"} onChange={v => setField("description", v)} />
            {errors.description && <p role="alert" style={{ color: C.clay, fontSize: 12, marginTop: 8 }}>{errors.description}</p>}
          </Card>

          <Card id="videos" title="YouTube videos" subtitle="Optional, up to two.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {videos.map((v, i) => (
                <Field key={i} label={`Video ${i + 1}`}><input type="url" value={v} placeholder="https://www.youtube.com/watch?v=…" onChange={e => { const n: [string, string] = [...videos]; n[i] = e.target.value; touch(setVideos)(n); }} style={inputStyle(!!errors.videos && !!v && !youtubeVideoId(v))} /></Field>
              ))}
            </div>
            {errors.videos && <p role="alert" style={{ color: C.clay, fontSize: 12, marginTop: 8 }}>{errors.videos}</p>}
          </Card>
        </div>
      </div>

      {/* Sticky action bar */}
      <div style={{ position: "sticky", bottom: 0, zIndex: 20, background: "rgba(245,239,228,0.96)", borderTop: `1px solid ${C.sand}`, padding: "12px 0", display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        {uploading && <span style={{ fontSize: 12, alignSelf: "center", color: C.ink }}>Uploading images…</span>}
        {isEdit && <Link href={`/events/${initial!.id}?preview=1`} target="_blank"><Button variant="secondary"><Eye size={14} /> Preview</Button></Link>}
        {status !== "published" && <Button variant="secondary" disabled={saving || uploading} onClick={() => save("draft")}>{saving ? "Saving…" : "Save draft"}</Button>}
        <Button disabled={saving || uploading} onClick={() => save(status === "archived" ? "archived" : "published")}>
          {saving ? "Saving…" : status === "published" ? "Save changes" : status === "archived" ? "Save" : "Publish"}
        </Button>
      </div>
      {toastNode}
    </div>
  );
}

