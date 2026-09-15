import { getMailFromAddress, resend } from "./resend";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) throw new Error("RESEND_API_KEY_NOT_CONFIGURED");

  const { data, error } = await resend.emails.send({
    from: getMailFromAddress(),
    to,
    subject,
    html,
  });
  if (error) {
    console.error("Resend send failed:", error);
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
  return data;
}

export function buildWelcomeEmailHtml({ unsubscribeUrl }: { unsubscribeUrl: string }): string {
  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #241526;">
      <p>Hi there,</p>
      <p>Thanks for joining the Whisper 119 list! You'll be the first to hear about new releases, and I like to share behind-the-scenes updates from time to time too.</p>
      <p>If you're new here — Whisper 119 writes serialized romance fiction: dark romance, werewolf romance, paranormal romance, billionaire romance, and more. All books are available as completed series, delivered straight to your inbox as PDF or EPUB.</p>
      <p>Talk soon,<br />Whisper 119</p>
      <hr style="border: 0; border-top: 1px solid #ddd; margin: 24px 0;" />
      <p style="font-size: 12px; color: #666;">Unsubscribe: <a href="${unsubscribeUrl}">${unsubscribeUrl}</a></p>
    </div>
  `.trim();
}