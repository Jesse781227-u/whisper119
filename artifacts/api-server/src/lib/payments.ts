import { createHmac, timingSafeEqual } from "node:crypto";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { deliverOrderEmail } from "./delivery";

type FlutterwaveResponse = {
  status: string;
  message: string;
  data?: { link: string };
};

function flutterwaveKey(): string | null {
  return process.env.FLW_SECRET_KEY?.trim() || null;
}

export function paymentProvider(): "flutterwave" {
  return "flutterwave";
}

export async function initializeFlutterwave(reference: string, email: string, amount: number, currency: string, orderId: string): Promise<{ link: string }> {
  const key = flutterwaveKey();
  if (!key) throw new Error("FLUTTERWAVE_NOT_CONFIGURED");
  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: reference,
      amount,
      currency,
      redirect_url: process.env.PUBLIC_APP_URL ? `${process.env.PUBLIC_APP_URL}/order/${orderId}` : undefined,
      customer: { email },
      meta: { orderId },
      customizations: { title: "Whisper 119" },
    }),
  });
  const payload = (await response.json()) as FlutterwaveResponse;
  if (!response.ok || payload.status !== "success" || !payload.data?.link) throw new Error(payload.message || "Flutterwave initialization failed");
  return payload.data;
}

export async function confirmFlutterwaveTransaction(transactionId: string, reference: string, amount: number, currency: string): Promise<void> {
  const key = flutterwaveKey();
  if (!key) throw new Error("FLUTTERWAVE_NOT_CONFIGURED");
  const response = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, { headers: { Authorization: `Bearer ${key}` } });
  const payload = (await response.json()) as { status: string; data?: { status?: string; tx_ref?: string; reference?: string; amount?: number; charged_amount?: number; currency?: string } };
  const transaction = payload.data;
  const transactionStatus = transaction?.status?.toLowerCase();
  const transactionReference = transaction?.tx_ref ?? transaction?.reference;
  const paid = payload.status === "success"
    && (transactionStatus === "successful" || transactionStatus === "succeeded")
    && transactionReference === reference
    && transaction?.currency?.toUpperCase() === currency.toUpperCase()
    && Number(transaction.charged_amount ?? transaction.amount) >= amount;
  if (!response.ok || !paid) throw new Error("PAYMENT_NOT_CONFIRMED");
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.reference, reference));
  if (!order || order.status === "fulfilled") return;
  if (order.status === "pending") {
    await db.update(ordersTable)
      .set({ status: "paid", paymentStatus: "success", paidAt: new Date(), paymentReference: transactionId })
      .where(eq(ordersTable.id, order.id));
  }
  // Let the webhook retry if SMTP or ebook storage is temporarily unavailable.
  // The order is already marked paid, so this is safe to run more than once.
  await deliverOrderEmail(order.id);
}

export function validFlutterwaveSignature(rawBody: string, signature: string | undefined, legacySignature?: string): boolean {
  const hash = process.env.FLW_SECRET_HASH?.trim();
  if (!hash) return false;
  if (legacySignature === hash) return true;
  if (!signature) return false;
  const expected = createHmac("sha256", hash).update(rawBody).digest("base64");
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
