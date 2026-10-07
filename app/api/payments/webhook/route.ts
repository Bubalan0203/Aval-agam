import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server-admin";
import { finalizeBooking } from "@/lib/server-bookings";
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest("hex");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return new Response("Invalid signature", { status: 401 });
    const payload = JSON.parse(body);
    if (payload.event === "payment.captured") {
      const payment = payload.payload.payment.entity;
      const matches = await adminDb().collection("bookings").where("orderId", "==", payment.order_id).limit(1).get();
      if (matches.empty) return new Response("Order not linked yet", { status: 503 });
      const booking = matches.docs[0];
      if (Number(payment.amount) !== Math.round(booking.data().amount * 100) || payment.currency !== "INR") throw new Error("Payment mismatch");
      await finalizeBooking(booking.id, payment.id);
    }
    return NextResponse.json({ received: true });
  } catch { return new Response("Webhook processing failed", { status: 500 }); }
}
