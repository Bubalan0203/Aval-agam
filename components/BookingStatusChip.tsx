import type { Booking, Event } from "@/lib/firestore";
import { legacySessions } from "@/lib/event-sessions";
export function bookingStatus(booking: Booking, event?: Event | null): NonNullable<Booking["status"]> {
  if (booking.status === "refunded") return "refunded";
  if (booking.status === "refund_required") return "refund_required";
  const cancelled = event && legacySessions(event).some(s => s.id === (booking.sessionId ?? "legacy") && s.status === "cancelled");
  if (cancelled || booking.status === "cancelled") return booking.amount > 0 ? "refund_required" : "cancelled";
  return booking.status ?? "confirmed";
}
export function BookingStatusChip({ booking, event }: { booking: Booking; event: Event }) {
  const status = bookingStatus(booking, event);
  const label = { confirmed: "Confirmed", pending: "Payment pending", cancelled: "Cancelled", refund_required: "Cancelled · Refund needed", refunded: "Cancelled · Refunded" }[status];
  const attention = status === "refund_required";
  return <span style={{ display: "inline-block", width: "fit-content", borderRadius: 999, padding: "4px 9px", marginTop: 6, fontSize: 11, fontWeight: 600, background: attention ? "#FDE8D5" : status === "confirmed" ? "#E2EEE8" : "#EEE2D5", color: attention ? "#8B3516" : "#0F332B" }}>{label}</span>;
}
