"use client";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { BookingStatus, EventStatus } from "@/lib/firestore";

export const C = { green: "#0F332B", cream: "#FBF4E8", sand: "#EEE2D5", gold: "#C9A25F", clay: "#C8734F", ink: "#2F3328", bg: "#F5EFE4", red: "#a54c2c" };

export const inputStyle = (error?: boolean): React.CSSProperties => ({
  width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${error ? C.clay : C.sand}`,
  background: "#fff", fontSize: 14, color: C.ink, outline: "none", boxSizing: "border-box",
});

export function Card({ title, subtitle, action, children, id }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ background: C.cream, borderRadius: 16, padding: 20, boxShadow: "0 1px 8px rgba(15,51,43,0.06)", scrollMarginTop: 90 }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            {title && <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 700, color: C.green }}>{title}</h2>}
            {subtitle && <p style={{ fontSize: 12, color: C.ink, opacity: 0.65, marginTop: 4 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, error, hint, children, required }: { label: string; error?: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 600, color: C.ink }}>
      <span>{label}{required && <span style={{ color: C.clay }}> *</span>}</span>
      {children}
      {hint && !error && <span style={{ fontWeight: 400, opacity: 0.6 }}>{hint}</span>}
      {error && <span role="alert" style={{ color: C.clay, fontWeight: 500 }}>{error}</span>}
    </label>
  );
}

export function Button({ variant = "primary", children, style, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const v = {
    primary:   { background: C.green, color: C.cream, border: "none" },
    secondary: { background: "#fff", color: C.green, border: `1.5px solid ${C.sand}` },
    danger:    { background: "rgba(200,115,79,0.12)", color: C.clay, border: "none" },
    ghost:     { background: "transparent", color: C.clay, border: "none" },
  }[variant];
  return (
    <button type="button" {...rest} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: rest.disabled ? "not-allowed" : "pointer", opacity: rest.disabled ? 0.5 : 1, whiteSpace: "nowrap", ...v, ...style }}>
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "gold"; children: React.ReactNode }) {
  const t = { neutral: [C.sand, C.green], good: ["#E2EEE8", C.green], warn: ["#FDE8D5", "#8B3516"], bad: ["#F5D9D0", C.red], gold: ["rgba(201,162,95,0.18)", "#8a6a2f"] }[tone];
  return <span style={{ display: "inline-block", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600, background: t[0], color: t[1], whiteSpace: "nowrap" }}>{children}</span>;
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge tone={status === "published" ? "good" : status === "draft" ? "gold" : "neutral"}>{status === "published" ? "Published" : status === "draft" ? "Draft" : "Archived"}</Badge>;
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirmed", cancelled: "Cancelled", refund_required: "Refund needed", refunded: "Refunded",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={status === "confirmed" ? "good" : status === "refund_required" ? "warn" : "neutral"}>{BOOKING_STATUS_LABEL[status]}</Badge>;
}

export type ToastMsg = { type: "success" | "error"; msg: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastMsg>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast && (
    <div role="status" style={{ position: "fixed", bottom: 24, right: 24, left: 24, marginLeft: "auto", maxWidth: 420, zIndex: 200, display: "flex", gap: 10, alignItems: "center", padding: "12px 16px", borderRadius: 12, background: toast.type === "success" ? C.green : C.clay, color: "#fff", fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
      {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {toast.msg}
    </div>
  );
  return { setToast, toastNode: node };
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ padding: "28px 12px", textAlign: "center", fontSize: 14, color: C.ink, opacity: 0.55 }}>{children}</p>;
}
