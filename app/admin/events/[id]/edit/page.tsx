"use client";
import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { getEvent, updateEvent } from "@/lib/firestore";
import type { TicketType } from "@/lib/firestore";

type TicketDraft = { id: string; name: string; available: string; price: string; sold: number };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: "10px",
  border: "1.5px solid #EEE2D5", backgroundColor: "#ffffff",
  fontFamily: "Poppins, sans-serif", fontSize: "14px", color: "#2F3328",
  outline: "none", boxSizing: "border-box",
};

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "12px", fontWeight: 600, letterSpacing: "0.04em", display: "block", marginBottom: "6px" }}>{children}</label>;
}

function parseTime(t: string) {
  if (!t) return "";
  const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return "";
  let h = parseInt(match[1]);
  const m = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function AdminEventEditPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ title: "", description: "", date: "", startTime: "", endTime: "", location: "", locationUrl: "", category: "" });
  const [tickets, setTickets]   = useState<TicketDraft[]>([]);
  const [heroBanner, setHeroBanner]   = useState<string | null>(null);
  const [galleryImgs, setGalleryImgs] = useState<string[]>([]);
  const [heroUploading, setHeroUploading]       = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const heroInputRef    = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getEvent(id).then(evt => {
      if (!evt) { router.push("/admin/dashboard"); return; }
      setForm({
        title:       evt.title,
        description: evt.description,
        date:        evt.date,
        startTime:   parseTime(evt.startTime),
        endTime:     parseTime(evt.endTime),
        location:    evt.location,
        locationUrl: evt.locationUrl,
        category:    evt.category,
      });
      setHeroBanner(evt.image);
      setGalleryImgs(evt.gallery);
      setTickets(evt.ticketTypes.map(t => ({ id: t.id, name: t.name, available: String(t.available), price: String(t.price), sold: t.sold })));
      setLoading(false);
    });
  }, [id, router]);

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
    return (await res.json()).url as string;
  }

  async function onHeroFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroBanner(URL.createObjectURL(file));
    setHeroUploading(true);
    try {
      const url = await uploadToCloudinary(file, "chapterone/hero");
      setHeroBanner(url);
      setToast({ type: "success", msg: "Hero image uploaded!" });
    } catch {
      setHeroBanner(null);
      setToast({ type: "error", msg: "Hero upload failed. Try again." });
    } finally { setHeroUploading(false); }
  }

  async function onGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 4 - galleryImgs.length);
    if (!files.length) return;
    const startCount = galleryImgs.length;
    setGalleryImgs(p => [...p, ...files.map(f => URL.createObjectURL(f))].slice(0, 4));
    setGalleryUploading(true);
    try {
      const uploaded = await Promise.all(files.map(f => uploadToCloudinary(f, "chapterone/gallery")));
      setGalleryImgs(p => { const u = [...p]; uploaded.forEach((url, i) => { u[startCount + i] = url; }); return u; });
      setToast({ type: "success", msg: `${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded!` });
    } catch {
      setGalleryImgs(p => p.slice(0, startCount));
      setToast({ type: "error", msg: "Gallery upload failed. Try again." });
    } finally { setGalleryUploading(false); }
  }

  function removeGallery(i: number) { setGalleryImgs(p => p.filter((_, idx) => idx !== i)); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updatedTickets: TicketType[] = tickets.filter(t => t.name.trim() && Number(t.available) > 0).map(t => ({
      id: t.id, name: t.name, price: Number(t.price) || 0,
      available: Number(t.available) || 0, sold: t.sold,
    }));
    if (updatedTickets.length === 0) {
      setToast({ type: "error", msg: "Add at least one ticket type with a name and quantity." });
      return;
    }
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      setToast({ type: "error", msg: "End time must be after start time." });
      return;
    }
    setSaving(true);
    try {
      await updateEvent(id, {
        title:       form.title,
        description: form.description,
        category:    form.category,
        date:        form.date,
        startTime:   formatTime(form.startTime),
        endTime:     formatTime(form.endTime),
        location:    form.location,
        locationUrl: form.locationUrl,
        image:       heroBanner ?? "",
        gallery:     galleryImgs,
        ticketTypes: updatedTickets,
      });
      setToast({ type: "success", msg: "Event updated successfully!" });
      setTimeout(() => router.push(`/admin/events/${id}`), 1200);
    } catch {
      setToast({ type: "error", msg: "Failed to save. Please try again." });
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
      <p style={{ fontFamily: "Poppins, sans-serif", color: "#0F332B", opacity: 0.5 }}>Loading event…</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button type="button" onClick={() => router.push(`/admin/events/${id}`)} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid #EEE2D5", color: "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "13px", borderRadius: "9999px", padding: "8px 16px", cursor: "pointer" }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h1 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "24px", fontWeight: 700 }}>Edit Event</h1>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Title + Category */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)", display: "grid", gap: "16px" }} className="grid grid-cols-1 sm:grid-cols-3">
          <div style={{ gridColumn: "1 / 3" }}>
            <Label>Event Title</Label>
            <input value={form.title} onChange={e => set("title", e.target.value)} required placeholder="Event title" style={inputStyle} />
          </div>
          <div>
            <Label>Category</Label>
            <select value={form.category} onChange={e => set("category", e.target.value)} style={inputStyle}>
              <option value="">Select…</option>
              {["Author Talk","Workshop","Panel Event","Open Mic","Family","Retreat"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <Label>Description</Label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} required rows={4} style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {/* Date & Time */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>Date &amp; Time</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label>Event Date</Label><input type="date" value={form.date} onChange={e => set("date", e.target.value)} required style={inputStyle} /></div>
            <div><Label>Start Time</Label><input type="time" value={form.startTime} onChange={e => set("startTime", e.target.value)} style={inputStyle} /></div>
            <div><Label>End Time</Label><input type="time" value={form.endTime} onChange={e => set("endTime", e.target.value)} style={inputStyle} /></div>
          </div>
        </div>

        {/* Location */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>Location</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Venue Name</Label><input value={form.location} onChange={e => set("location", e.target.value)} required placeholder="e.g. The Literary Hall" style={inputStyle} /></div>
            <div>
              <Label>Google Maps URL</Label>
              <input value={form.locationUrl} onChange={e => set("locationUrl", e.target.value)} placeholder="https://maps.google.com/…" style={inputStyle} />
              {form.locationUrl && <a href={form.locationUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "6px", fontFamily: "Poppins, sans-serif", fontSize: "12px", color: "#C8734F", textDecoration: "underline" }}>Open in Maps ↗</a>}
            </div>
          </div>
        </div>

        {/* Hero Banner */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>Hero Banner</p>
          <input ref={heroInputRef} type="file" accept="image/*" onChange={onHeroFile} style={{ display: "none" }} />
          {!heroBanner ? (
            <button type="button" onClick={() => heroInputRef.current?.click()} style={{ width: "100%", height: "160px", border: "2px dashed #C9A25F", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", cursor: "pointer", background: "none" }}>
              <Upload size={28} style={{ color: "#C9A25F" }} />
              <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "13px", opacity: 0.6 }}>Click to upload hero image</p>
            </button>
          ) : (
            <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", height: "200px" }}>
              <img src={heroBanner} alt="hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {heroUploading && (
                <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                  <p style={{ color: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600 }}>Uploading…</p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              <button type="button" onClick={() => setHeroBanner(null)} style={{ position: "absolute", top: "10px", right: "10px", width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={14} color="#fff" /></button>
              <button type="button" onClick={() => heroInputRef.current?.click()} style={{ position: "absolute", bottom: "10px", right: "10px", backgroundColor: "rgba(0,0,0,0.5)", border: "none", borderRadius: "9999px", padding: "6px 14px", cursor: "pointer", color: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                <Upload size={12} /> Change
              </button>
            </div>
          )}
        </div>

        {/* Gallery */}
        <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", padding: "22px 24px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "16px", fontWeight: 700 }}>Gallery <span style={{ fontFamily: "Poppins, sans-serif", fontSize: "12px", fontWeight: 400, opacity: 0.5 }}>({galleryImgs.length}/4){galleryUploading && " · Uploading…"}</span></p>
            {galleryImgs.length < 4 && <button type="button" onClick={() => galleryInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#EEE2D5", color: "#0F332B", fontFamily: "Poppins, sans-serif", fontSize: "12px", fontWeight: 600, border: "none", borderRadius: "9999px", padding: "7px 16px", cursor: "pointer" }}><Plus size={13} /> Add Images</button>}
          </div>
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={onGalleryFiles} style={{ display: "none" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {galleryImgs.map((img, i) => (
              <div key={i} style={{ position: "relative", aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden" }}>
                <img src={img} alt={`Gallery ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {galleryUploading && img.startsWith("blob:") ? (
                  <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                  </div>
                ) : (
                  <button type="button" onClick={() => removeGallery(i)} style={{ position: "absolute", top: "6px", right: "6px", width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={12} color="#fff" /></button>
                )}
              </div>
            ))}
            {galleryImgs.length < 4 && Array.from({ length: 4 - galleryImgs.length }).map((_, i) => (
              <button key={i} type="button" onClick={() => galleryInputRef.current?.click()} style={{ aspectRatio: "1/1", borderRadius: "10px", border: "2px dashed #EEE2D5", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
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
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  {tickets.length > 1 && <button type="button" onClick={() => setTickets(p => p.filter(x => x.id !== t.id))} style={{ width: "36px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(200,115,79,0.1)", border: "none", borderRadius: "8px", cursor: "pointer", color: "#C8734F" }}><Trash2 size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTickets(p => [...p, { id: crypto.randomUUID(), name: "", available: "", price: "", sold: 0 }])} style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "12px", background: "none", border: "1.5px dashed #C9A25F", color: "#C9A25F", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, borderRadius: "10px", padding: "9px 16px", cursor: "pointer" }}>
            <Plus size={14} /> Add Ticket Type
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", paddingTop: "4px" }}>
          <button type="button" onClick={() => router.push(`/admin/events/${id}`)} style={{ backgroundColor: "transparent", color: "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "1.5px solid #EEE2D5", borderRadius: "9999px", padding: "13px 24px", cursor: "pointer" }}>Cancel</button>
          <button type="submit" disabled={heroUploading || galleryUploading || saving} style={{ backgroundColor: "#0F332B", color: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", border: "none", borderRadius: "9999px", padding: "13px 30px", cursor: "pointer", opacity: (heroUploading || galleryUploading || saving) ? 0.6 : 1 }}>
            {saving ? "SAVING…" : "SAVE CHANGES"}
          </button>
        </div>
      </form>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", alignItems: "center", gap: "10px", backgroundColor: toast.type === "success" ? "#0F332B" : "#C8734F", color: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 500, borderRadius: "9999px", padding: "12px 22px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", whiteSpace: "nowrap" }}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
