"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Upload, X, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import { createEvent } from "@/lib/firestore";
import { EventDescriptionEditor } from "@/components/EventDescriptionEditor";
import { EventDescription } from "@/components/EventDescription";
import { EventVideoFields } from "@/components/EventVideoFields";
import { EventVideos } from "@/components/EventVideos";
import { descriptionText, normalizeYouTubeUrls, safeExternalUrl, youtubeVideoId } from "@/lib/event-content";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EventSessionFields, newSession } from "@/components/EventSessionFields";
import { validateSessions, type EventSession } from "@/lib/event-sessions";
import { EVENT_CATEGORY_OPTIONS } from "@/lib/event-options";

type TicketDraft = { id: string; name: string; available: string; price: string };
function newTicket(): TicketDraft { return { id: crypto.randomUUID(), name: "", available: "", price: "" }; }

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: "10px",
  border: "1.5px solid #EEE2D5", backgroundColor: "#ffffff",
  fontFamily: "Poppins, sans-serif", fontSize: "14px", color: "#2F3328",
  outline: "none", boxSizing: "border-box",
};

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>{children}</label>;
}

export default function AdminEventCreatePage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<EventSession[]>([newSession()]);
  const [originalSessions] = useState<EventSession[]>([]);
  const [confirmSave, setConfirmSave] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", location: "", locationUrl: "", category: "" });
  const [tickets, setTickets] = useState<TicketDraft[]>([newTicket()]);
  const [heroBanner, setHeroBanner] = useState<string | null>(null);
  const [youtubeLinks, setYoutubeLinks] = useState<[string, string]>(["", ""]);
  const [galleryImgs, setGalleryImgs] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const heroInputRef    = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function uploadToCloudinary(file: File, folder: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.url as string;
  }

  async function onHeroFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setHeroBanner(localUrl);
    setHeroUploading(true);
    try {
      const url = await uploadToCloudinary(file, "chapterone/hero");
      setHeroBanner(url);
      setToast({ type: "success", msg: "Hero image uploaded successfully!" });
    } catch {
      setHeroBanner(null);
      if (heroInputRef.current) heroInputRef.current.value = "";
      setToast({ type: "error", msg: "Hero image upload failed. Please try again." });
    } finally {
      setHeroUploading(false);
    }
  }

  async function onGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 4 - galleryImgs.length);
    if (!files.length || galleryUploading) return;
    setGalleryUploading(true);
    const startCount = galleryImgs.length;
    const localUrls = files.map(f => URL.createObjectURL(f));
    setGalleryImgs(p => [...p, ...localUrls].slice(0, 4));
    try {
      const uploaded = await Promise.all(files.map(f => uploadToCloudinary(f, "chapterone/gallery")));
      setGalleryImgs(p => {
        const updated = [...p];
        uploaded.forEach((url, i) => { updated[startCount + i] = url; });
        return updated;
      });
      setToast({ type: "success", msg: `${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded successfully!` });
    } catch {
      setGalleryImgs(p => p.slice(0, startCount));
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      setToast({ type: "error", msg: "Gallery upload failed. Please try again." });
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  function removeGallery(i: number) { setGalleryImgs(p => p.filter((_, idx) => idx !== i)); }

  const [saving, setSaving] = useState(false);

  async function handleSave(e?: React.FormEvent, confirmed = false) {
    e?.preventDefault();
    if (saving) return;
    try { validateSessions(sessions, originalSessions); } catch (error) { setToast({ type: "error", msg: (error as Error).message }); return; }
    if (!descriptionText(form.description, "html").trim()) {
      setToast({ type: "error", msg: "Enter an event description." });
      return;
    }
    if (youtubeLinks.some((url) => url.trim() && !youtubeVideoId(url))) {
      setToast({ type: "error", msg: "Enter valid YouTube video links or leave them empty." });
      return;
    }
    if (form.locationUrl.trim() && !safeExternalUrl(form.locationUrl)) {
      setToast({ type: "error", msg: "Enter a valid http:// or https:// venue URL." });
      return;
    }
    const validTickets = tickets.filter(t => t.name.trim() && Number(t.available) > 0);
    if (validTickets.length === 0) {
      setToast({ type: "error", msg: "Add at least one ticket type with a name and quantity." });
      return;
    }
    if (!confirmed) { setConfirmSave(true); return; }
    setSaving(true);
    try {
      await createEvent({
        title:       form.title,
        description: form.description,
        descriptionFormat: "html",
        youtubeUrls: normalizeYouTubeUrls(youtubeLinks),
        category:    form.category,
        date:        sessions[0].date,
        startTime:   sessions[0].startTime,
        endTime:     sessions[0].endTime,
        sessions,
        location:    form.location,
        locationUrl: safeExternalUrl(form.locationUrl) ?? "",
        image:       heroBanner ?? "",
        gallery:     galleryImgs,
        ticketTypes: validTickets
          .map(t => ({ id: crypto.randomUUID(), name: t.name, price: Number(t.price) || 0, available: Number(t.available) || 0, sold: 0 })),
      });
      setSaved(true);
      setTimeout(() => router.push("/admin/dashboard"), 1500);
    } catch (error) {
      setToast({ type: "error", msg: (error as Error).message });
    } finally {
      setSaving(false);
      setConfirmSave(false);
    }
  }

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button onClick={() => router.push("/admin/dashboard")} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid #EEE2D5", color: "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "13px", borderRadius: "9999px", padding: "8px 16px", cursor: "pointer" }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "24px", fontWeight: 700 }}>Create Event</h1>
        </div>
        <button type="button" onClick={() => setShowPreview(true)} style={{ display: "flex", alignItems: "center", gap: "7px", backgroundColor: "#EEE2D5", color: "#0F332B", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "9999px", padding: "10px 22px", cursor: "pointer" }}>
          <Eye size={14} /> Preview
        </button>
      </div>

      {saved && (
        <div style={{ backgroundColor: "rgba(15,51,43,0.1)", border: "1px solid rgba(15,51,43,0.2)", borderRadius: "12px", padding: "14px 20px", marginBottom: "20px" }}>
          <span style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: 600 }}>✓ Event saved! Redirecting…</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Title + Category row */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)", display: "grid", gap: "16px" }} className="grid grid-cols-1 sm:grid-cols-3">
          <div style={{ gridColumn: "1 / 3" }}>
            <Label>Event Title</Label>
            <input value={form.title} onChange={e => set("title", e.target.value)} required placeholder="e.g. An Evening with the Author" style={inputStyle} />
          </div>
          <div>
            <Label>Category</Label>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {EVENT_CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <Label>Description</Label>
          <EventDescriptionEditor value={form.description} onChange={(html) => set("description", html)} />
        </div>

        <EventVideoFields values={youtubeLinks} onChange={setYoutubeLinks} />

        <EventSessionFields value={sessions} onChange={setSessions} persistedIds={originalSessions.map(s => s.id)} />

        {/* Location */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>Location</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Venue Name</Label><input value={form.location} onChange={e => set("location", e.target.value)} required placeholder="e.g. The Literary Hall, Coimbatore" style={inputStyle} /></div>
            <div>
              <Label>Google Maps URL</Label>
              <input value={form.locationUrl} onChange={e => set("locationUrl", e.target.value)} placeholder="https://maps.google.com/…" style={inputStyle} />
              {safeExternalUrl(form.locationUrl) && (
                <a href={safeExternalUrl(form.locationUrl) ?? undefined} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "6px", fontFamily: "Poppins, sans-serif", fontSize: "12px", color: "#C8734F", textDecoration: "underline" }}>Open in Maps ↗</a>
              )}
            </div>
          </div>
        </div>

        {/* Hero banner upload */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>Hero Banner</p>
          <input ref={heroInputRef} type="file" accept="image/*" onChange={onHeroFile} style={{ display: "none" }} />
          {!heroBanner ? (
            <button type="button" onClick={() => heroInputRef.current?.click()} style={{ width: "100%", height: "160px", border: "2px dashed #C9A25F", borderRadius: "12px", backgroundColor: "#EEE2D540", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", background: "none" }}>
              <Upload size={28} style={{ color: "#C9A25F" }} />
              <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "13px", opacity: 0.6 }}>Click to upload hero image</p>
            </button>
          ) : (
            <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", height: "200px" }}>
              <img src={heroBanner} alt="hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button type="button" onClick={() => setHeroBanner(null)} style={{ position: "absolute", top: "10px", right: "10px", width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={14} color="#fff" />
              </button>
              {heroUploading && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                  <p style={{ color: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600 }}>Uploading…</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              <button type="button" onClick={() => heroInputRef.current?.click()} style={{ position: "absolute", bottom: "10px", right: "10px", backgroundColor: "rgba(0,0,0,0.5)", border: "none", borderRadius: "9999px", padding: "6px 14px", cursor: "pointer", color: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                <Upload size={12} /> Change
              </button>
            </div>
          )}
        </div>

        {/* Gallery upload */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700 }}>Gallery Images <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "12px", fontWeight: 400, opacity: 0.5 }}>({galleryImgs.length}/4){galleryUploading && " · Uploading…"}</span></p>
            {galleryImgs.length < 4 && (
              <button type="button" disabled={galleryUploading} onClick={() => galleryInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#EEE2D5", color: "#0F332B", fontFamily: "Poppins, sans-serif", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "9999px", padding: "7px 16px", cursor: "pointer" }}>
                <Plus size={13} /> Add Images
              </button>
            )}
          </div>
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={onGalleryFiles} style={{ display: "none" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {galleryImgs.map((img, i) => (
              <div key={i} style={{ position: "relative", aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden" }}>
                <img src={img} alt={`Gallery ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {galleryUploading && img.startsWith("blob:") && (
                  <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                  </div>
                )}
                {!galleryUploading && (
                  <button type="button" disabled={galleryUploading} onClick={() => removeGallery(i)} style={{ position: "absolute", top: "6px", right: "6px", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={12} color="#fff" />
                  </button>
                )}
              </div>
            ))}
            {galleryImgs.length < 4 && Array.from({ length: 4 - galleryImgs.length }).map((_, i) => (
              <button key={i} type="button" disabled={galleryUploading} onClick={() => galleryInputRef.current?.click()} style={{ aspectRatio: "1/1", borderRadius: "10px", border: "2px dashed #EEE2D5", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Plus size={20} style={{ color: "#EEE2D5" }} />
              </button>
            ))}
          </div>
        </div>

        {/* Ticket types */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>Ticket Types</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {tickets.map((t, idx) => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 36px", gap: "10px", alignItems: "end" }}>
                <div>{idx === 0 && <Label>Ticket Name</Label>}<input value={t.name} onChange={e => setTickets(p => p.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))} placeholder="e.g. General, VIP" style={inputStyle} /></div>
                <div>{idx === 0 && <Label>Qty</Label>}<input type="number" min="0" value={t.available} onChange={e => setTickets(p => p.map(x => x.id === t.id ? { ...x, available: e.target.value } : x))} placeholder="100" style={inputStyle} /></div>
                <div>{idx === 0 && <Label>Price (₹)</Label>}<input type="number" min="0" value={t.price} onChange={e => setTickets(p => p.map(x => x.id === t.id ? { ...x, price: e.target.value } : x))} placeholder="499" style={inputStyle} /></div>
                <div style={{ paddingBottom: idx === 0 ? "0" : "0", display: "flex", alignItems: "flex-end" }}>
                  {tickets.length > 1 && (
                    <button type="button" onClick={() => setTickets(p => p.filter(x => x.id !== t.id))} style={{ width: "36px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(200,115,79,0.1)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#C8734F" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTickets(p => [...p, newTicket()])} style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "12px", background: "none", border: "1.5px dashed #C9A25F", color: "#C9A25F", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, borderRadius: "10px", padding: "9px 16px", cursor: "pointer" }}>
            <Plus size={14} /> Add Ticket Type
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "4px" }}>
          <button type="button" onClick={() => router.push("/admin/dashboard")} style={{ backgroundColor: "transparent", color: "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "1.5px solid #EEE2D5", borderRadius: "9999px", padding: "13px 24px", cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={heroUploading || galleryUploading || saving} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", border: "none", borderRadius: "9999px", padding: "13px 30px", cursor: (heroUploading || galleryUploading || saving) ? "not-allowed" : "pointer", opacity: (heroUploading || galleryUploading || saving) ? 0.6 : 1 }}>{heroUploading || galleryUploading ? "UPLOADING…" : saving ? "SAVING…" : "CREATE EVENT"}</button>
        </div>
      </form>
      <ConfirmModal open={confirmSave} title="Create event?" message={`Create “${form.title}” with ${sessions.length} date(s)? Cancelled dates remain cancelled. Existing bookings keep their original details.`} confirmLabel="Create event" busyLabel="Saving…" busy={saving} onCancel={() => setConfirmSave(false)} onConfirm={() => void handleSave(undefined, true)} />

      {/* Toast notification */}
      {toast && (
        <div style={{ position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", alignItems: "center", gap: "10px", backgroundColor: toast.type === "success" ? "#0F332B" : "#C8734F", color: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 500, borderRadius: "9999px", padding: "12px 22px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", whiteSpace: "nowrap" }}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ backgroundColor: "#FBF4E8", borderRadius: "20px", width: "100%", maxWidth: "680px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 16px 64px rgba(0,0,0,0.3)" }}>
            {/* Preview header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #EEE2D5", position: "sticky", top: 0, backgroundColor: "#FBF4E8", zIndex: 1 }}>
              <p style={{ fontFamily: "Poppins, sans-serif", color: "#C9A25F", fontSize: "11px", fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase" }}>Preview</p>
              <button onClick={() => setShowPreview(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2F3328", display: "flex", alignItems: "center", gap: "5px", fontFamily: "Poppins, sans-serif", fontSize: "13px" }}>
                <X size={16} /> Close
              </button>
            </div>
            {/* Hero */}
            {heroBanner ? (
              <div style={{ height: "220px", overflow: "hidden" }}>
                <img src={heroBanner} alt="hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div style={{ height: "120px", backgroundColor: "#EEE2D5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "13px", opacity: 0.4 }}>No banner uploaded</p>
              </div>
            )}
            <div style={{ padding: "24px 24px 28px" }}>
              {form.category && <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "11px", fontWeight: 600, backgroundColor: "rgba(201,162,95,0.2)", color: "#C9A25F", borderRadius: "9999px", padding: "4px 14px" }}>{form.category}</span>}
              <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "24px", fontWeight: 700, margin: "12px 0 8px" }}>{form.title || "Event Title"}</h2>
              <EventDescription value={form.description} format="html" />
              <EventVideos urls={youtubeLinks} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                {[
                  { label: "Date",  value: sessions[0]?.date ? new Date(sessions[0]?.date || "").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—" },
                  { label: "Time",  value: sessions[0]?.startTime ? `${formatTime(sessions[0]?.startTime || "")}${sessions[0]?.endTime ? " — " + formatTime(sessions[0]?.endTime || "") : ""}` : "—" },
                  { label: "Venue", value: form.location || "—" },
                ].map(f => (
                  <div key={f.label} style={{ backgroundColor: "#EEE2D540", borderRadius: "10px", padding: "12px 14px" }}>
                    <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "10px", opacity: 0.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "3px" }}>{f.label}</p>
                    <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "13px", fontWeight: 500 }}>{f.value}</p>
                  </div>
                ))}
                {safeExternalUrl(form.locationUrl) && (
                  <div style={{ backgroundColor: "#EEE2D540", borderRadius: "10px", padding: "12px 14px" }}>
                    <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "10px", opacity: 0.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "3px" }}>Location</p>
                    <a href={safeExternalUrl(form.locationUrl) ?? undefined} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Poppins, sans-serif", color: "#C8734F", fontSize: "13px", fontWeight: 500 }}>Open in Maps ↗</a>
                  </div>
                )}
              </div>
              {/* Gallery preview */}
              {galleryImgs.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700, marginBottom: "10px" }}>Gallery</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                    {galleryImgs.map((img, i) => (
                      <div key={i} style={{ aspectRatio: "1/1", borderRadius: "8px", overflow: "hidden" }}>
                        <img src={img} alt={`g${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Tickets preview */}
              {tickets.some(t => t.name) && (
                <div>
                  <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700, marginBottom: "10px" }}>Tickets</p>
                  {tickets.filter(t => t.name).map(t => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#EEE2D540", borderRadius: "10px", marginBottom: "8px" }}>
                      <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", fontSize: "14px", fontWeight: 600 }}>{t.name}</p>
                      <p style={{ fontFamily: "Poppins, sans-serif", color: "#C8734F", fontSize: "14px", fontWeight: 700 }}>{t.price ? `₹${t.price}` : "Free"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
