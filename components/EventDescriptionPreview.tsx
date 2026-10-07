"use client";
import { useEffect, useRef, useState } from "react";
import { EventDescription } from "./EventDescription";
import type { DescriptionFormat } from "@/lib/event-content";

export function EventDescriptionPreview({ value, format }: { value: string; format?: DescriptionFormat }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const box = viewport.current;
    const text = content.current;
    if (!box || !text) return;
    const measure = () => setTruncated(text.scrollHeight > box.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(text);
    return () => observer.disconnect();
  }, [value, format]);

  return (
    <div ref={viewport} className="event-description-preview" style={{ position: "relative", maxHeight: "66.3px", overflow: "hidden", fontSize: "13px", lineHeight: "22.1px", color: "#2F3328" }}>
      <div ref={content}><EventDescription value={value} format={format} /></div>
      {truncated && <span aria-hidden="true" style={{ position: "absolute", right: 0, bottom: 0, paddingLeft: "18px", background: "linear-gradient(to right, transparent, white 35%)", lineHeight: "22.1px" }}>…</span>}
    </div>
  );
}
