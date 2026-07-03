"use client";

import { useState } from "react";
import { Search, Download } from "lucide-react";
import { BOOKINGS, EVENTS } from "@/lib/mock-data";

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  "Paid": { bg: "rgba(15,51,43,0.1)", color: "#0F332B" },
  "Pending": { bg: "rgba(200,115,79,0.15)", color: "#C8734F" },
  "Refunded": { bg: "rgba(47,51,40,0.1)", color: "#2F3328" },
};

export default function AdminBookingsPage() {
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = BOOKINGS.filter((b) => {
    const matchSearch =
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    const matchEvent = filterEvent === "all" || b.eventId === filterEvent;
    const matchStatus = filterStatus === "all" || b.paymentStatus === filterStatus;
    return matchSearch && matchEvent && matchStatus;
  });

  const totalRevenue = filtered.reduce((a, b) => a + b.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "26px", fontWeight: 700, marginBottom: "4px" }}>Bookings</h1>
          <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", opacity: 0.6 }}>
            {filtered.length} bookings · ₹{totalRevenue.toLocaleString()} total
          </p>
        </div>
        <button style={{ display: "flex", alignItems: "center", gap: "7px", backgroundColor: "#EEE2D5", color: "#0F332B", fontFamily: "Poppins, sans-serif", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "9999px", padding: "11px 20px", cursor: "pointer" }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flexGrow: 1, minWidth: "220px", maxWidth: "340px" }}>
          <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#C9A25F" }} />
          <input
            type="text"
            placeholder="Search by name, email, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: "9999px", border: "1.5px solid #EEE2D5", backgroundColor: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#2F3328", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Event filter */}
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          style={{ padding: "10px 16px", borderRadius: "9999px", border: "1.5px solid #EEE2D5", backgroundColor: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#2F3328", cursor: "pointer", outline: "none" }}
        >
          <option value="all">All Events</option>
          {EVENTS.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "10px 16px", borderRadius: "9999px", border: "1.5px solid #EEE2D5", backgroundColor: "#FBF4E8", fontFamily: "Poppins, sans-serif", fontSize: "13px", color: "#2F3328", cursor: "pointer", outline: "none" }}
        >
          <option value="all">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: "#FBF4E8", borderRadius: "16px", boxShadow: "0 1px 8px rgba(15,51,43,0.06)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Poppins, sans-serif" }}>
            <thead style={{ backgroundColor: "#EEE2D5" }}>
              <tr>
                {["Booking ID", "Customer", "Event", "Ticket", "Qty", "Amount", "Payment", "Date"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 14px", color: "#2F3328", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.65, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const ss = STATUS_PILL[b.paymentStatus];
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #EEE2D5" }} className="hover:bg-[rgba(238,226,213,0.4)] transition-colors">
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontFamily: "Poppins, sans-serif", color: "#C8734F", fontSize: "13px", fontWeight: 700 }}>{b.id}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <p style={{ color: "#0F332B", fontSize: "13px", fontWeight: 600 }}>{b.customerName}</p>
                      <p style={{ color: "#2F3328", fontSize: "11px", opacity: 0.55 }}>{b.email}</p>
                      <p style={{ color: "#2F3328", fontSize: "11px", opacity: 0.55 }}>{b.phone}</p>
                    </td>
                    <td style={{ padding: "12px 14px", maxWidth: "160px" }}>
                      <p style={{ color: "#2F3328", fontSize: "13px", lineHeight: 1.4 }}>{b.eventTitle}</p>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ backgroundColor: "rgba(201,162,95,0.15)", color: "#C9A25F", fontSize: "11px", fontWeight: 600, borderRadius: "9999px", padding: "3px 10px", whiteSpace: "nowrap" }}>{b.ticketType}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ color: "#0F332B", fontSize: "14px", fontWeight: 700 }}>{b.quantity}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ color: "#0F332B", fontSize: "14px", fontWeight: 700 }}>{b.amount === 0 ? "Free" : `₹${b.amount.toLocaleString()}`}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ backgroundColor: ss.bg, color: ss.color, fontSize: "11px", fontWeight: 600, borderRadius: "9999px", padding: "4px 12px" }}>{b.paymentStatus}</span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ color: "#2F3328", fontSize: "12px", opacity: 0.65 }}>
                        {new Date(b.bookingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "18px" }}>No bookings found</p>
            <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "14px", opacity: 0.6, marginTop: "6px" }}>Try adjusting your filters.</p>
          </div>
        )}
      </div>

      {/* Summary row */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { label: "Filtered bookings", value: String(filtered.length) },
            { label: "Total revenue", value: `₹${totalRevenue.toLocaleString()}` },
            { label: "Paid", value: String(filtered.filter((b) => b.paymentStatus === "Paid").length) },
            { label: "Pending", value: String(filtered.filter((b) => b.paymentStatus === "Pending").length) },
          ].map((s) => (
            <div key={s.label} style={{ backgroundColor: "#FBF4E8", borderRadius: "12px", padding: "14px 20px", boxShadow: "0 1px 6px rgba(15,51,43,0.05)" }}>
              <p style={{ fontFamily: "Poppins, sans-serif", color: "#2F3328", fontSize: "11px", opacity: 0.55, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{s.label}</p>
              <p style={{ fontFamily: "Playfair Display, serif", color: "#0F332B", fontSize: "22px", fontWeight: 700 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
