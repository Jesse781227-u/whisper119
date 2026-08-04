import { createHmac, timingSafeEqual } from "node:crypto";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { deliverOrderEmail } from "./delivery";

type PaystackResponse = {
  status: boolean;
  message: string;
  data?: { authorization_url: string; access_code: string; reference: string };
};

function paystackKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY ?? null;
}

export async function initializePaystack(reference: string, email: string, amount: number, currency: string, orderId: string): Promise<PaystackResponse["data"]> {
  const key = paystackKey();
  if (!key) throw new Error("PAYSTACK_NOT_CONFIGURED");
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      amount: Math.round(amount * 100),
      currency,
      reference,
      callback_url: process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL}/order/${orderId}` : undefined,
      metadata: { orderId },
    }),
  });
  const payload = (await response.json()) as PaystackResponse;
  if (!response.ok || !payload.status || !payload.data) throw new Error(payload.message || "Paystack initialization failed");
  return payload.data;
}

export function validPaystackSignature(rawBody: string, signature: string | undefined): boolean {
  const key = paystackKey();
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function confirmPaystackReference(reference: string): Promise<void> {
  const key = paystackKey();
  if (!key) throw new Error("PAYSTACK_NOT_CONFIGURED");
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const payload = (await response.json()) as { status: boolean; data?: { status?: string; reference?: string } };
  if (!response.ok || !payload.status || payload.data?.status !== "success" || payload.data.reference !== reference) {
    throw new Error("PAYMENT_NOT_CONFIRMED");
  }
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.reference, reference));
  if (!order || order.status === "paid") return;
  await db.update(ordersTable).set({ status: "paid", paymentStatus: "success", paidAt: new Date() }).where(eq(ordersTable.id, order.id));
  try {
    await deliverOrderEmail(order.id);
  } catch {
    // Payment remains paid; the admin delivery flag remains false for retry/inspection.
  }
}