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
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function buildPurchaseEmailHtml({ customerEmail, bookTitle, orderId, amount, currency, paymentMethod, purchaseDate }: PurchaseEmailTemplateData): string {
  const safeBookTitle = escapeHtml(bookTitle);
  const safeOrderId = escapeHtml(orderId);
  const safeCustomerEmail = escapeHtml(customerEmail);
  const safeCurrency = escapeHtml(currency);
  const safePaymentMethod = escapeHtml(paymentMethod);
  const safePurchaseDate = escapeHtml(purchaseDate);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f3ef;color:#292522;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ef;padding:40px 15px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td style="padding:32px 38px 25px;border-bottom:1px solid #eeeae5;"><div style="font-size:22px;font-weight:700;letter-spacing:-.5px;">Whisper 119</div><div style="margin-top:6px;font-size:13px;color:#8a827b;">Digital Bookstore</div></td></tr>
<tr><td style="padding:42px 38px 30px;"><div style="margin-bottom:12px;font-size:13px;font-weight:700;color:#8a827b;text-transform:uppercase;letter-spacing:1.2px;">Your book has arrived</div><h1 style="margin:0;color:#292522;font-size:30px;line-height:1.2;">A little something for your bookshelf.</h1><p style="margin:20px 0 0;color:#5f5954;font-size:16px;line-height:1.7;">Hi there,</p><p style="margin:12px 0 0;color:#5f5954;font-size:16px;line-height:1.7;">Thank you for choosing Whisper 119. I hope <strong style="color:#292522;">&ldquo;${safeBookTitle}&rdquo;</strong> finds you at just the right moment.</p><p style="margin:12px 0 0;color:#5f5954;font-size:16px;line-height:1.7;">Your copy is attached to this email and ready for you to enjoy. If you need any help opening it, just reply to this email. I&rsquo;ll be happy to help.</p><p style="margin:20px 0 0;color:#5f5954;font-size:16px;line-height:1.7;">Wishing you a beautiful reading experience,<br><strong style="color:#292522;">Whisper 119</strong></p></td></tr>
<tr><td style="padding:0 38px 35px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f2;border:1px solid #ebe6df;border-radius:12px;"><tr><td style="padding:24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="52" valign="top"><div style="width:46px;height:58px;background:#292522;border-radius:4px;text-align:center;color:#fff;font-size:11px;line-height:58px;font-weight:700;">BOOK</div></td><td style="padding-left:16px;" valign="middle"><div style="margin-bottom:5px;color:#8a827b;font-size:12px;">DIGITAL COPY</div><div style="color:#292522;font-size:16px;line-height:1.4;font-weight:700;">${safeBookTitle}</div><div style="margin-top:6px;color:#8a827b;font-size:13px;">Your purchased book is attached to this email.</div></td></tr></table></td></tr></table></td></tr>
<tr><td style="padding:0 38px 40px;"><div style="margin-bottom:15px;color:#8a827b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">Receipt</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ebe6df;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;font-size:13px;"><tr><td style="padding:18px 20px;border-bottom:1px solid #eeeae5;color:#8a827b;">Order #</td><td align="right" style="padding:18px 20px;border-bottom:1px solid #eeeae5;font-weight:700;">${safeOrderId}</td></tr><tr><td style="padding:18px 20px;border-bottom:1px solid #eeeae5;color:#8a827b;">Book</td><td align="right" style="padding:18px 20px;border-bottom:1px solid #eeeae5;">${safeBookTitle}</td></tr><tr><td style="padding:18px 20px;border-bottom:1px solid #eeeae5;color:#8a827b;">Amount paid</td><td align="right" style="padding:18px 20px;border-bottom:1px solid #eeeae5;font-weight:700;">${safeCurrency} ${amount.toFixed(2)}</td></tr><tr><td style="padding:18px 20px;border-bottom:1px solid #eeeae5;color:#8a827b;">Payment method</td><td align="right" style="padding:18px 20px;border-bottom:1px solid #eeeae5;">${safePaymentMethod}</td></tr><tr><td style="padding:18px 20px;border-bottom:1px solid #eeeae5;color:#8a827b;">Date</td><td align="right" style="padding:18px 20px;border-bottom:1px solid #eeeae5;">${safePurchaseDate}</td></tr><tr><td style="padding:18px 20px;color:#8a827b;">Buyer email</td><td align="right" style="padding:18px 20px;">${safeCustomerEmail}</td></tr></table><p style="margin:18px 2px 0;color:#9a938d;font-size:12px;line-height:1.6;">This receipt confirms your purchase of a digital copy for personal use.</p></td></tr>
<tr><td align="center" style="padding:25px 38px;background:#292522;color:#fff;"><div style="font-size:16px;font-weight:700;">Whisper 119</div><div style="margin-top:7px;color:#bdb7b1;font-size:12px;">Thank you for supporting independent digital books.</div></td></tr>
</table><div style="max-width:620px;padding:18px 20px 0;color:#99928b;font-size:11px;line-height:1.5;text-align:center;">This email was sent because you purchased a digital book from Whisper 119.</div>
</td></tr></table></body></html>`;
}
