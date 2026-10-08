"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBookings, getEvents, type Booking, type BookingStatus, type Event } from "@/lib/firestore";
import { BookingsTable, type BookingFlag } from "@/components/admin/BookingsTable";
import { Card, Empty, PageHeader, PageSkeleton, useToast } from "@/components/admin/ui";

export default function AdminBookingsPage() {
  return <Suspense fallback={<PageSkeleton />}><BookingsView /></Suspense>;
}

function BookingsView() {
  const params = useSearchParams();
  const [data, setData] = useState<{ bookings: Booking[]; events: Event[] } | null>(null);
  const [error, setError] = useState("");
  const { setToast, toastNode } = useToast();

  const load = useCallback(() => {
    Promise.all([getBookings(), getEvents()])
      .then(([bookings, events]) => setData({ bookings, events }))
      .catch(() => setError("Couldn't load bookings. Check your connection and admin access, then refresh."));
  }, []);
  useEffect(load, [load]);

  if (error) return <Card><Empty>{error}</Empty></Card>;
  if (!data) return <PageSkeleton />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Bookings" subtitle="Every booking across all events. Click a row to see details, cancel, refund or resend the email." />
      <BookingsTable bookings={data.bookings} events={data.events}
        initialStatus={(params.get("status") as BookingStatus) ?? ""} initialFlag={(params.get("flag") as BookingFlag) ?? ""} initialOpenId={params.get("id") ?? undefined}
        onChanged={msg => { setToast({ type: "success", msg }); load(); }} />
      {toastNode}
    </div>
  );
}
