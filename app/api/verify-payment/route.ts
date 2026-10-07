import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminDb } from "@/lib/server-admin";
import { finalizeBooking, payments, tokenHash } from "@/lib/server-bookings";
export async function POST(request: Request) {
  try {
    const { bookingId, token, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
    if (typeof bookingId !== "string" || !/^[\w-]{1,100}$/.test(bookingId) || typeof token !== "string") throw new Error("Invalid booking.");
    const booking = (await adminDb().collection("bookings").doc(bookingId).get()).data();
    if (!booking || booking.tokenHash !== tokenHash(token) || booking.orderId !== razorpay_order_id) throw new Error("Invalid booking.");
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (typeof razorpay_signature !== "string" || expected.length !== razorpay_signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))) throw new Error("Invalid signature.");
    const payment = await payments().payments.fetch(razorpay_payment_id);
    if (payment.order_id !== booking.orderId || Number(payment.amount) !== Math.round(booking.amount * 100) || payment.currency !== "INR" || payment.status !== "captured") throw new Error("Payment is not captured yet.");
    const status = await finalizeBooking(bookingId, razorpay_payment_id);
    return NextResponse.json({ verified: status === "confirmed", status });
  } catch (error) { return NextResponse.json({ verified: false, error: (error as Error).message }, { status: 400 }); }
}
