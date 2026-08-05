import { createHash } from "node:crypto";

function mailchimpConfig() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  const datacenter = apiKey?.split("-").at(-1);
  if (!apiKey || !audienceId || !datacenter) return null;
  return { apiKey, audienceId, baseUrl: `https://${datacenter}.api.mailchimp.com/3.0` };
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  const config = mailchimpConfig();
  if (!config) throw new Error("NEWSLETTER_NOT_CONFIGURED");
  const subscriberHash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  const response = await fetch(`${config.baseUrl}/lists/${config.audienceId}/members/${subscriberHash}`, {
    method: "PUT",
    headers: {
      Authorization: `apikey ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: email.trim().toLowerCase(),
      status_if_new: "subscribed",
      tags: ["FREE_CHAPTER"],
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`MAILCHIMP_SUBSCRIBE_FAILED:${response.status}:${body.slice(0, 240)}`);
  }
}