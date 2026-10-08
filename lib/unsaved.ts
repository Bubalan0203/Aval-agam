"use client";
/** Shared "unsaved changes" flag so admin navigation can warn before leaving an editor. */
let dirty = false;
export function setUnsaved(v: boolean) { dirty = v; }
export function confirmLeave(): boolean {
  if (!dirty) return true;
  const ok = window.confirm("You have unsaved changes. Leave without saving?");
  if (ok) dirty = false;
  return ok;
}
