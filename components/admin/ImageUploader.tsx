"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, RotateCcw, Star, Trash2, Upload, X } from "lucide-react";
import { C } from "./ui";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_GALLERY = 20;

type Job = { key: string; file: File; target: "cover" | "gallery"; progress: number; error?: string; preview: string };

function uploadFile(file: File, folder: string, onProgress: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file); fd.append("folder", folder);
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status < 300 && data.url) resolve(data.url); else reject(new Error(data.error || "Upload failed"));
      } catch { reject(new Error("Upload failed")); }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.open("POST", "/api/upload"); xhr.send(fd);
  });
}

function checkFile(f: File): string | null {
  if (!ACCEPT.includes(f.type)) return "Use JPG, PNG, WebP, GIF or AVIF.";
  if (f.size > MAX_BYTES) return `Too large (${(f.size / 1048576).toFixed(1)} MB). Max 8 MB.`;
  return null;
}

export function ImageUploader({ cover, gallery, onChange, onBusyChange, error }: {
  cover: string; gallery: string[];
  onChange: (v: { cover: string; gallery: string[] }) => void;
  onBusyChange: (busy: boolean) => void;
  error?: string;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [rejects, setRejects] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const latest = useRef({ cover, gallery });
  latest.current = { cover, gallery };

  const busy = jobs.some(j => !j.error);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  function start(files: File[], target: "cover" | "gallery") {
    const bad: string[] = [];
    let ok = files.filter(f => { const e = checkFile(f); if (e) bad.push(`${f.name}: ${e}`); return !e; });
    if (target === "cover") ok = ok.slice(0, 1);
    const room = MAX_GALLERY - latest.current.gallery.length - jobs.filter(j => j.target === "gallery" && !j.error).length;
    if (target === "gallery" && ok.length > room) { bad.push(`Gallery is limited to ${MAX_GALLERY} images.`); ok = ok.slice(0, Math.max(0, room)); }
    setRejects(bad);
    ok.forEach(file => run({ key: crypto.randomUUID(), file, target, progress: 0, preview: URL.createObjectURL(file) }));
  }

  function run(job: Job) {
    setJobs(j => [...j.filter(x => x.key !== job.key), { ...job, progress: 0, error: undefined }]);
    uploadFile(job.file, job.target === "cover" ? "chapterone/hero" : "chapterone/gallery", p => setJobs(j => j.map(x => x.key === job.key ? { ...x, progress: p } : x)))
      .then(url => {
        const cur = latest.current;
        const next = job.target === "cover" ? { ...cur, cover: url } : { ...cur, gallery: [...cur.gallery, url] };
        latest.current = next; // two uploads can finish before the next render
        onChange(next);
        URL.revokeObjectURL(job.preview);
        setJobs(j => j.filter(x => x.key !== job.key));
      })
      .catch(err => setJobs(j => j.map(x => x.key === job.key ? { ...x, error: (err as Error).message } : x)));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= gallery.length || from === to) return;
    const next = [...gallery]; const [it] = next.splice(from, 1); next.splice(to, 0, it);
    onChange({ cover, gallery: next });
  }

  function makeCover(i: number) {
    const next = [...gallery]; const [img] = next.splice(i, 1);
    if (cover) next.splice(i, 0, cover);
    onChange({ cover: img, gallery: next });
  }

  const coverJob = jobs.find(j => j.target === "cover");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cover */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Cover image <span style={{ color: C.clay }}>*</span> <span style={{ fontWeight: 400, opacity: 0.6 }}>— shown on event cards and the event page banner. Wide (16:9) works best.</span></p>
        {cover || coverJob ? (
          <div style={{ position: "relative", aspectRatio: "16/9", maxWidth: 560, borderRadius: 12, overflow: "hidden", background: C.sand }}>
            <img src={coverJob?.preview ?? cover} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: coverJob && !coverJob.error ? 0.5 : 1 }} />
            {coverJob && <JobOverlay job={coverJob} onRetry={() => run(coverJob)} onDismiss={() => setJobs(j => j.filter(x => x.key !== coverJob.key))} />}
            {!coverJob && (
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
                <PickButton label="Replace" onFiles={f => start(f, "cover")} />
                <IconBtn label="Remove cover" onClick={() => onChange({ cover: "", gallery })}><Trash2 size={14} /></IconBtn>
              </div>
            )}
          </div>
        ) : (
          <DropZone onFiles={f => start(f, "cover")} label="Drop the cover image here, or click to choose" error={!!error} />
        )}
        {error && <p role="alert" style={{ color: C.clay, fontSize: 12, marginTop: 6 }}>{error}</p>}
      </div>

      {/* Gallery */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Gallery <span style={{ fontWeight: 400, opacity: 0.6 }}>— {gallery.length}/{MAX_GALLERY}. Drag to reorder. Star an image to make it the cover.</span></p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {gallery.map((url, i) => (
            <div key={url + i} draggable onDragStart={() => setDragIdx(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (dragIdx !== null) move(dragIdx, i); setDragIdx(null); }}
              style={{ position: "relative", aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", background: C.sand, cursor: "grab", outline: dragIdx === i ? `2px dashed ${C.gold}` : "none" }}>
              <img src={url} alt={`Gallery ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
              <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(15,51,43,0.75)", color: "#fff", fontSize: 10, borderRadius: 999, padding: "2px 7px" }}>{i + 1}</span>
              <div style={{ position: "absolute", bottom: 6, left: 6, right: 6, display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 4 }}>
                  <IconBtn label="Move left" onClick={() => move(i, i - 1)} disabled={i === 0}><ChevronLeft size={13} /></IconBtn>
                  <IconBtn label="Move right" onClick={() => move(i, i + 1)} disabled={i === gallery.length - 1}><ChevronRight size={13} /></IconBtn>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <IconBtn label="Use as cover" onClick={() => makeCover(i)}><Star size={13} /></IconBtn>
                  <IconBtn label="Remove image" onClick={() => onChange({ cover, gallery: gallery.filter((_, x) => x !== i) })}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
            </div>
          ))}
          {jobs.filter(j => j.target === "gallery").map(job => (
            <div key={job.key} style={{ position: "relative", aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", background: C.sand }}>
              <img src={job.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: job.error ? 1 : 0.5 }} />
              <JobOverlay job={job} onRetry={() => run(job)} onDismiss={() => { URL.revokeObjectURL(job.preview); setJobs(j => j.filter(x => x.key !== job.key)); }} />
            </div>
          ))}
          {gallery.length < MAX_GALLERY && <DropZone compact onFiles={f => start(f, "gallery")} multiple label="Add photos" />}
        </div>
      </div>

      {rejects.length > 0 && (
        <div role="alert" style={{ background: "#FDE8D5", color: "#8B3516", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
          {rejects.map(r => <p key={r}>{r}</p>)}
        </div>
      )}
    </div>
  );
}

function JobOverlay({ job, onRetry, onDismiss }: { job: Job; onRetry: () => void; onDismiss: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 10, background: job.error ? "rgba(165,76,44,0.82)" : "transparent", color: "#fff", fontSize: 12, textAlign: "center" }}>
      {job.error ? (
        <>
          <span>{job.error}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <IconBtn label="Retry upload" onClick={onRetry}><RotateCcw size={13} /></IconBtn>
            <IconBtn label="Dismiss" onClick={onDismiss}><X size={13} /></IconBtn>
          </div>
        </>
      ) : (
        <div style={{ width: "70%", height: 6, background: "rgba(255,255,255,0.5)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${job.progress}%`, height: "100%", background: C.green, transition: "width .2s" }} />
        </div>
      )}
    </div>
  );
}

function DropZone({ onFiles, label, multiple, compact, error }: { onFiles: (f: File[]) => void; label: string; multiple?: boolean; compact?: boolean; error?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div role="button" tabIndex={0} onClick={() => ref.current?.click()} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") ref.current?.click(); }}
      onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
      style={{ aspectRatio: compact ? "1/1" : "16/9", maxWidth: compact ? undefined : 560, border: `2px dashed ${error ? C.clay : over ? C.green : C.gold}`, borderRadius: 12, background: over ? "#fff" : "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", color: C.ink, fontSize: 13, padding: 12, textAlign: "center" }}>
      {compact ? <ImagePlus size={22} color={C.gold} /> : <Upload size={26} color={C.gold} />}
      <span>{label}</span>
      {!compact && <span style={{ fontSize: 11, opacity: 0.55 }}>JPG, PNG, WebP · up to 8 MB</span>}
      <input ref={ref} type="file" accept={ACCEPT.join(",")} multiple={multiple} hidden onChange={e => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </div>
  );
}

function PickButton({ label, onFiles }: { label: string; onFiles: (f: File[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} style={{ background: "rgba(15,51,43,0.85)", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 12 }}>{label}</button>
      <input ref={ref} type="file" accept={ACCEPT.join(",")} hidden onChange={e => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={e => { e.stopPropagation(); onClick(); }}
      style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(15,51,43,0.85)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", opacity: disabled ? 0.35 : 1, cursor: disabled ? "default" : "pointer" }}>
      {children}
    </button>
  );
}
