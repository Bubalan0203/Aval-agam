"use client";
/** Shared "unsaved changes" flag so admin navigation can warn (with an in-app modal) before leaving an editor. */
let dirty = false;
let ask: ((go: () => void) => void) | null = null;
export function setUnsaved(v: boolean) { dirty = v; }
export function isUnsaved() { return dirty; }
/** Registered by the admin layout's <LeaveDialog/>. */
export function registerLeavePrompt(fn: typeof ask) { ask = fn; }
/** Runs `go` now if nothing is unsaved, otherwise after the admin confirms in the modal. */
export function leaveThen(go: () => void) {
  if (!dirty || !ask) { go(); return; }
  ask(() => { dirty = false; go(); });
}
