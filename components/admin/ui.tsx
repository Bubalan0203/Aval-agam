"use client";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as RSelect from "@radix-ui/react-select";
import { AlertCircle, Check, CheckCircle2, ChevronDown, X } from "lucide-react";
import type { BookingStatus, EventStatus } from "@/lib/firestore";

/**
 * Admin tokens (SmartPA-style). Keys kept stable so every admin screen picks up the theme:
 * green = brand primary, cream = surface, sand = border, ink = secondary text, clay = danger.
 */
export const C = {
  green: "#0F332B", greenSoft: "#F0F5F3",
  cream: "#FFFFFF", bg: "#F9FAFB",
  sand: "#EAECF0", border: "#D0D5DD",
  text: "#101828", ink: "#475467", muted: "#667085",
  gold: "#B54708", goldSoft: "#FFFAEB",
  clay: "#D92D20", claySoft: "#FEF3F2",
  good: "#067647", goodSoft: "#ECFDF3",
  red: "#B42318",
};

export const shadow = "0 1px 2px rgba(16,24,40,0.05)";

export const inputStyle = (error?: boolean): React.CSSProperties => ({
  width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${error ? "#FDA29B" : C.border}`,
  background: "#fff", fontSize: 14, color: C.text, outline: "none", boxSizing: "border-box", boxShadow: shadow,
  fontFamily: "inherit",
});

export function Card({ title, subtitle, action, children, id, padded = true }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; id?: string; padded?: boolean }) {
  return (
    <section id={id} style={{ background: C.cream, border: `1px solid ${C.sand}`, borderRadius: 12, boxShadow: shadow, scrollMarginTop: 24 }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "18px 20px", borderBottom: `1px solid ${C.sand}`, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            {title && <h2 style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{title}</h2>}
            {subtitle && <p style={{ fontSize: 13, color: C.ink, marginTop: 2 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: padded ? 20 : 0 }}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, back, badge }: { title: string; subtitle?: string; actions?: React.ReactNode; back?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
      <div style={{ minWidth: 0 }}>
        {back && <div style={{ marginBottom: 8 }}>{back}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{title}</h1>
          {badge}
        </div>
        {subtitle && <p style={{ fontSize: 14, color: C.ink, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children, required }: { label: string; error?: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 500, color: "#344054" }}>
      <span>{label}{required && <span style={{ color: C.clay }}> *</span>}</span>
      {children}
      {hint && !error && <span style={{ fontWeight: 400, fontSize: 13, color: C.muted }}>{hint}</span>}
      {error && <span role="alert" style={{ color: C.clay, fontWeight: 400, fontSize: 13 }}>{error}</span>}
    </label>
  );
}

export function Button({ variant = "primary", size = "md", children, style, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" | "dangerSolid"; size?: "sm" | "md" }) {
  const v = {
    primary:     { background: C.green, color: "#fff", border: `1px solid ${C.green}` },
    secondary:   { background: "#fff", color: "#344054", border: `1px solid ${C.border}` },
    danger:      { background: "#fff", color: C.red, border: "1px solid #FDA29B" },
    dangerSolid: { background: C.clay, color: "#fff", border: `1px solid ${C.clay}` },
    ghost:       { background: "transparent", color: C.ink, border: "1px solid transparent" },
  }[variant];
  return (
    <button type="button" {...rest} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: size === "sm" ? "6px 10px" : "9px 14px", borderRadius: 8, fontSize: size === "sm" ? 13 : 14, fontWeight: 600, cursor: rest.disabled ? "not-allowed" : "pointer", opacity: rest.disabled ? 0.5 : 1, whiteSpace: "nowrap", boxShadow: variant === "ghost" ? "none" : shadow, fontFamily: "inherit", ...v, ...style }}>
      {children}
    </button>
  );
}

type Tone = "neutral" | "good" | "warn" | "bad" | "gold" | "brand";
const TONES: Record<Tone, [string, string, string]> = {
  neutral: ["#F9FAFB", "#344054", "#EAECF0"], good: [C.goodSoft, C.good, "#ABEFC6"], warn: [C.goldSoft, C.gold, "#FEDF89"],
  bad: [C.claySoft, C.red, "#FECDCA"], gold: [C.goldSoft, C.gold, "#FEDF89"], brand: [C.greenSoft, C.green, "#C9DCD5"],
};

export function Badge({ tone = "neutral", dot, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }) {
  const [bg, fg, bd] = TONES[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 500, background: bg, color: fg, border: `1px solid ${bd}`, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: fg }} />}{children}
    </span>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge dot tone={status === "published" ? "good" : status === "draft" ? "warn" : "neutral"}>{status === "published" ? "Published" : status === "draft" ? "Draft" : "Archived"}</Badge>;
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Confirmed", cancelled: "Cancelled", refund_required: "Refund needed", refunded: "Refunded",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge dot tone={status === "confirmed" ? "good" : status === "refund_required" ? "bad" : "neutral"}>{BOOKING_STATUS_LABEL[status]}</Badge>;
}

export function StatCard({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "bad" }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 12, padding: 20, boxShadow: shadow }}>
      <p style={{ fontSize: 14, color: C.ink, fontWeight: 500 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 600, color: tone === "bad" ? C.red : C.text, marginTop: 6, lineHeight: 1.2 }}>{value}</p>
      {hint && <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export type ToastMsg = { type: "success" | "error"; msg: string } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastMsg>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const node = toast && (
    <div role="status" style={{ position: "fixed", bottom: 24, right: 24, left: 24, marginLeft: "auto", maxWidth: 420, zIndex: 300, display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 12, background: "#fff", border: `1px solid ${C.sand}`, color: C.text, fontSize: 14, boxShadow: "0 12px 16px -4px rgba(16,24,40,.08), 0 4px 6px -2px rgba(16,24,40,.03)" }}>
      {toast.type === "success" ? <CheckCircle2 size={20} color={C.good} /> : <AlertCircle size={20} color={C.clay} />}
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button aria-label="Dismiss" onClick={() => setToast(null)} style={{ color: C.muted }}><X size={16} /></button>
    </div>
  );
  return { setToast, toastNode: node };
}

export function Empty({ children, icon, action }: { children: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ padding: "40px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      {icon && <div style={{ width: 48, height: 48, borderRadius: 999, background: C.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", color: C.green }}>{icon}</div>}
      <p style={{ fontSize: 14, color: C.ink, maxWidth: 360 }}>{children}</p>
      {action}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%", style }: { h?: number; w?: number | string; style?: React.CSSProperties }) {
  return <div className="admin-skeleton" style={{ height: h, width: w, ...style }} />;
}

export function PageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Skeleton h={28} w={220} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} h={96} />)}</div>
      <Skeleton h={320} />
    </div>
  );
}

/** Right-side slide-over panel (full screen on phones). */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 520 }: { open: boolean; onClose: () => void; title: string; subtitle?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,.45)", zIndex: 120 }} />
        <Dialog.Content className="admin-root admin-drawer" style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 121, width: `min(${width}px, 100vw)`, background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-12px 0 24px rgba(16,24,40,.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "20px 24px", borderBottom: `1px solid ${C.sand}` }}>
            <div style={{ minWidth: 0 }}>
              <Dialog.Title style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{title}</Dialog.Title>
              <Dialog.Description style={{ fontSize: 14, color: C.ink, marginTop: 2 }}>{subtitle ?? ""}</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" style={{ color: C.muted, padding: 4 }}><X size={20} /></Dialog.Close>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>{children}</div>
          {footer && <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.sand}`, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Centered confirm dialog with optional reason input. */
export function ConfirmDialog({ open, title, message, confirmLabel, danger, busy, onConfirm, onCancel, children, confirmDisabled }: {
  open: boolean; title: string; message?: React.ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean;
  onConfirm: () => void; onCancel: () => void; children?: React.ReactNode; confirmDisabled?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v && !busy) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,.45)", zIndex: 130 }} />
        <Dialog.Content className="admin-root" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 131, width: "min(460px, calc(100vw - 24px))", background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 20px 24px -4px rgba(16,24,40,.08)" }}>
          <Dialog.Title style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{title}</Dialog.Title>
          <Dialog.Description asChild><div style={{ fontSize: 14, color: C.ink, marginTop: 8, lineHeight: 1.6 }}>{message}</div></Dialog.Description>
          {children && <div style={{ marginTop: 16 }}>{children}</div>}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <Button variant="secondary" style={{ flex: 1 }} disabled={busy} onClick={onCancel}>Cancel</Button>
            <Button variant={danger ? "dangerSolid" : "primary"} style={{ flex: 1 }} disabled={busy || confirmDisabled} onClick={onConfirm}>{busy ? "Working…" : confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export type SelectOption = { value: string; label: React.ReactNode; disabled?: boolean; hint?: string };

/** Styled dropdown (Radix) replacing native <select>. Empty value is shown as the placeholder. */
export function Select({ value, onChange, options, placeholder = "Select…", error, disabled, ariaLabel, width }: {
  value: string; onChange: (v: string) => void; options: SelectOption[]; placeholder?: string;
  error?: boolean; disabled?: boolean; ariaLabel?: string; width?: number | string;
}) {
  const EMPTY = "__empty__";
  return (
    <RSelect.Root value={value === "" ? EMPTY : value} onValueChange={v => onChange(v === EMPTY ? "" : v)} disabled={disabled}>
      <RSelect.Trigger aria-label={ariaLabel} style={{ ...inputStyle(error), width: width ?? "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, textAlign: "left", minHeight: 42 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value === "" ? C.muted : C.text }}>
          <RSelect.Value placeholder={placeholder} />
        </span>
        <RSelect.Icon><ChevronDown size={16} color={C.muted} /></RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content position="popper" sideOffset={6} className="admin-root"
          style={{ zIndex: 400, background: "#fff", border: `1px solid ${C.sand}`, borderRadius: 10, boxShadow: "0 12px 16px -4px rgba(16,24,40,.08), 0 4px 6px -2px rgba(16,24,40,.03)", minWidth: "var(--radix-select-trigger-width)", maxHeight: "min(360px, var(--radix-select-content-available-height))", overflow: "hidden" }}>
          <RSelect.Viewport style={{ padding: 6 }}>
            {options.map(o => (
              <RSelect.Item key={o.value || EMPTY} value={o.value === "" ? EMPTY : o.value} disabled={o.disabled} className="admin-select-item"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 10px", borderRadius: 6, fontSize: 14, color: o.disabled ? C.muted : C.text, cursor: o.disabled ? "not-allowed" : "pointer", outline: "none", maxWidth: 480 }}>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <RSelect.ItemText>{o.label}</RSelect.ItemText>
                  {o.hint && <span style={{ fontSize: 12, color: C.muted }}>{o.hint}</span>}
                </span>
                <RSelect.ItemIndicator><Check size={16} color={C.green} /></RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
