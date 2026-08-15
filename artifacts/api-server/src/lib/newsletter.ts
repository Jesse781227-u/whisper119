import { createHash } from "node:crypto";

function mailchimpConfig() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  if (!apiKey || !listId || !serverPrefix) return null;
  return { apiKey, listId, baseUrl: `https://${serverPrefix}.api.mailchimp.com/3.0` };
}

function subscriberHash(email: string): string {
  return createHash("md5").update(email).digest("hex");
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  const config = mailchimpConfig();
  if (!config) throw new Error("NEWSLETTER_NOT_CONFIGURED");
  const normalizedEmail = email.trim().toLowerCase();
  const response = await fetch(`${config.baseUrl}/lists/${config.listId}/members/${subscriberHash(normalizedEmail)}`, {
    method: "PUT",
    headers: {
      Authorization: `apikey ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: normalizedEmail,
      status: "subscribed",
      status_if_new: "subscribed",
    }),
  });
  if (!response.ok) {
    let body: { title?: string; detail?: string } | null = null;
    try {
      body = await response.json() as { title?: string; detail?: string };
    } catch {
      // Keep the provider failure generic if Mailchimp does not return JSON.
    }
    throw new Error(`MAILCHIMP_SUBSCRIBE_FAILED:${response.status}:${body?.title ?? body?.detail ?? "unknown"}`);
  }
}