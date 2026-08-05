function mailchimpConfig() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  if (!apiKey || !listId || !serverPrefix) return null;
  return { apiKey, listId, baseUrl: `https://${serverPrefix}.api.mailchimp.com/3.0` };
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  const config = mailchimpConfig();
  if (!config) throw new Error("NEWSLETTER_NOT_CONFIGURED");
  const normalizedEmail = email.trim().toLowerCase();
  const response = await fetch(`${config.baseUrl}/lists/${config.listId}/members`, {
    method: "POST",
    headers: {
      Authorization: `apikey ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: normalizedEmail,
      status: "subscribed",
      tags: ["FREE_CHAPTER"],
    }),
  });
  if (!response.ok) {
    let body: { title?: string } | null = null;
    try {
      body = await response.json() as { title?: string };
    } catch {
      // Keep the provider failure generic if Mailchimp does not return JSON.
    }
    if (body?.title === "Member Exists") return;
    throw new Error(`MAILCHIMP_SUBSCRIBE_FAILED:${response.status}:${body?.title ?? "unknown"}`);
  }

  // TODO: Trigger the free-chapter delivery through a Mailchimp automation or
  // approved transactional email once that delivery workflow is configured.
}