"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBookings, getEvents, type Booking, type BookingStatus, type Event } from "@/lib/firestore";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { C, Empty, useToast } from "@/components/admin/ui";

export default function AdminBookingsPage() {
  return <Suspense fallback={<Empty>Loading…</Empty>}><BookingsView /></Suspense>;
}

function BookingsView() {
  const params = useSearchParams();
  const [data, setData] = useState<{ bookings: Booking[]; events: Event[] } | null>(null);
  const [error, setError] = useState("");
  const { setToast, toastNode } = useToast();

  const load = useCallback(() => {
    Promise.all([getBookings(), getEvents()])
      .then(([bookings, events]) => setData({ bookings, events }))
      .catch(() => setError("Could not load bookings. Check your admin access."));
  }, []);
  useEffect(load, [load]);

  if (error) return <Empty>{error}</Empty>;
  if (!data) return <Empty>Loading…</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 700, color: C.green }}>Bookings</h1>
      <BookingsTable bookings={data.bookings} events={data.events} initialStatus={(params.get("status") as BookingStatus) ?? ""}
        onChanged={msg => { setToast({ type: "success", msg }); load(); }} />
      {toastNode}
    </div>
  );
}
