import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY?.trim();

export const resend = apiKey ? new Resend(apiKey) : null;

export function getMailFromAddress(): string {
  const from = process.env.MAIL_FROM_ADDRESS?.trim();
  if (!from) throw new Error("MAIL_FROM_ADDRESS_NOT_CONFIGURED");
  return from;
}

export function getResendWebhookSecret(): string {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("RESEND_WEBHOOK_SECRET_NOT_CONFIGURED");
  return secret;
}