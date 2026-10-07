import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { POST } from "../app/api/verify-payment/route";

test("original Razorpay verification contract requires only checkout fields and the existing API secret", async () => {
  const previous = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = "test-only-api-secret";
  try {
    const fields = { razorpay_order_id: "order_test", razorpay_payment_id: "pay_test", razorpay_signature: crypto.createHmac("sha256", "test-only-api-secret").update("order_test|pay_test").digest("hex") };
    const send = (body: object) => POST(new NextRequest("http://localhost/api/verify-payment", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }));
    assert.deepEqual(await (await send(fields)).json(), { verified: true });
    assert.equal((await send({ ...fields, razorpay_signature: "invalid" })).status, 400);
    assert.equal((await send({})).status, 400);
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = previous;
  }
});
