"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getEvent, type Event } from "@/lib/firestore";
import { EventEditor } from "@/components/admin/EventEditor";
import { Empty } from "@/components/admin/ui";

export default function AdminEventEditPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null | undefined>(undefined);
  useEffect(() => { getEvent(id).then(setEvent).catch(() => setEvent(null)); }, [id]);
  if (event === undefined) return <Empty>Loading…</Empty>;
  if (!event) return <Empty>Event not found.</Empty>;
  return <EventEditor key={event.id} initial={event} />;
}
