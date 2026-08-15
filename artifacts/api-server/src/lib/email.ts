export type PurchaseEmailTemplateData = {
  customerEmail: string;
  bookTitle: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  purchaseDate: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildPurchaseEmailHtml({
  customerEmail,
  bookTitle,
  orderId,
  amount,
  currency,
  paymentMethod,
  purchaseDate,
}: PurchaseEmailTemplateData): string {
  const safeBookTitle = escapeHtml(bookTitle);
  const safeOrderId = escapeHtml(orderId);
  const safeCustomerEmail = escapeHtml(customerEmail);
  const safeCurrency = escapeHtml(currency);
  const safePaymentMethod = escapeHtml(paymentMethod);
  const safePurchaseDate = escapeHtml(purchaseDate);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#faf8f5;color:#292522;font-family:Georgia,serif;line-height:1.6;">
    <div style="max-width:620px;margin:0 auto;padding:32px 22px;">
      <p>Hi there,</p>
      <p>Thank you for your purchase! Your copy of &quot;${safeBookTitle}&quot; is attached to this email.</p>
      <p>If you run into any trouble opening the file, just reply to this email and I'll sort it out.</p>
      <p>— Whisper 119</p>
      <hr style="margin:28px 0;border:0;border-top:1px solid #d9d1c9;" />
      <p style="font-family:Arial,sans-serif;font-size:13px;letter-spacing:.12em;"><strong>RECEIPT</strong></p>
      <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;">
        <strong>Order #:</strong> ${safeOrderId}<br />
        <strong>Book:</strong> ${safeBookTitle}<br />
        <strong>Amount paid:</strong> ${safeCurrency} ${amount.toFixed(2)}<br />
        <strong>Payment method:</strong> ${safePaymentMethod}<br />
        <strong>Date:</strong> ${safePurchaseDate}<br />
        <strong>Buyer email:</strong> ${safeCustomerEmail}
      </p>
      <p style="font-family:Arial,sans-serif;font-size:13px;">This receipt confirms your purchase of a digital copy for personal use.</p>
      <hr style="margin:28px 0 0;border:0;border-top:1px solid #d9d1c9;" />
    </div>
  </body>
</html>`;
}