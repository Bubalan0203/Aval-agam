"use client";
import { AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({ open, title, message, confirmLabel = "Delete", busy = false, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,51,43,0.45)", backdropFilter: "blur(4px)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: "#FBF4E8", borderRadius: "20px", padding: "32px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 20px 60px rgba(15,51,43,0.25)" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "rgba(200,115,79,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <AlertTriangle size={26} style={{ color: "#C8734F" }} />
        </div>
        <h2 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>{title}</h2>
        <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", lineHeight: 1.6, opacity: 0.75, marginBottom: "24px" }}>{message}</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={onCancel} disabled={busy} style={{ backgroundColor: "transparent", color: "#2F3328", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "1.5px solid #EEE2D5", borderRadius: "9999px", padding: "12px 26px", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} disabled={busy} style={{ backgroundColor: "#C8734F", color: "#fff", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: "0.05em", border: "none", borderRadius: "9999px", padding: "12px 26px", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
