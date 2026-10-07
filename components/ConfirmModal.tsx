"use client";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";

type Props = {
  open: boolean; title: string; message: string; confirmLabel?: string;
  busy?: boolean; busyLabel?: string; requiredText?: string;
  onConfirm: () => void; onCancel: () => void;
};
export function ConfirmModal({ open, title, message, confirmLabel = "Delete", busy = false, busyLabel = "Working…", requiredText, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState("");
  return <AlertDialog.Root open={open} onOpenChange={value => { if (!value && !busy) { setTyped(""); onCancel(); } }}>
    <AlertDialog.Portal>
      <AlertDialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(15,51,43,.5)", backdropFilter: "blur(4px)", zIndex: 120 }} />
      <AlertDialog.Content onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 121, width: "min(440px,calc(100vw - 32px))", background: "#FBF4E8", padding: 28, borderRadius: 20, color: "#0F332B" }}>
        <AlertDialog.Title style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>{title}</AlertDialog.Title>
        <AlertDialog.Description style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{message}</AlertDialog.Description>
        {requiredText && <label style={{ display: "block", marginBottom: 20 }}>Type “{requiredText}” to confirm<input autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} disabled={busy} style={{ display: "block", width: "100%", padding: 10, border: "1px solid #C9A25F", borderRadius: 8, marginTop: 8 }} /></label>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <AlertDialog.Cancel disabled={busy} style={{ padding: "10px 20px", borderRadius: 24, border: "1px solid #C9A25F" }}>Go back</AlertDialog.Cancel>
          <button type="button" disabled={busy || !!requiredText && typed !== requiredText} onClick={onConfirm} style={{ padding: "10px 20px", borderRadius: 24, background: "#0F332B", color: "white", opacity: busy || !!requiredText && typed !== requiredText ? .5 : 1 }}>{busy ? busyLabel : confirmLabel}</button>
        </div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
