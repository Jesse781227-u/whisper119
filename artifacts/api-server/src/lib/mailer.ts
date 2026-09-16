import { getMailFromAddress, resend } from "./resend";
import { htmlToText } from "./newsletter-content";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!resend) throw new Error("RESEND_API_KEY_NOT_CONFIGURED");

  const { data, error } = await resend.emails.send({
    from: getMailFromAddress(),
    to,
    subject,
    html,
    text: text ?? htmlToText(html),
  });
  if (error) {
    console.error("Resend send failed:", error);
    throw new Error(`Failed to send email to ${to}: ${error.message}`);
  }
  return data;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

export function buildWelcomeEmailHtml({
  subscriberName,
  unsubscribeUrl,
}: {
  subscriberName?: string | null;
  unsubscribeUrl: string;
}): string {
  const name = escapeHtml(subscriberName?.trim() || "there");
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Whisper 119</title>
  <style>
    body { margin: 0; padding: 0; background: #e9e4dc; color: #171717; font-family: Georgia, "Times New Roman", serif; }
    table { border-collapse: collapse; border-spacing: 0; }
    img { display: block; border: 0; max-width: 100%; }
    a { color: inherit; }
    .wrapper { width: 100%; padding: 35px 12px; background: #e9e4dc; }
    .email { width: 100%; max-width: 680px; margin: 0 auto; background: #fffdf9; }
    .header { background: #fffdf9; padding: 38px 35px 30px; text-align: center; border-bottom: 1px solid #ded7cc; }
    .logo { width: 205px; max-width: 70%; height: auto; margin: 0 auto; }
    .tagline, .eyebrow, .hero-small, .stat-text, .cta-label, .footer-copy, .footer-links, .genre-tags { font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; }
    .tagline { margin-top: 15px; font-size: 9px; letter-spacing: 4px; color: #8b8176; }
    .hero { background: #171717; padding: 65px 45px 70px; text-align: center; color: #fffdf9; }
    .hero-small { font-size: 10px; letter-spacing: 4px; color: #bcae99; margin-bottom: 22px; }
    .hero-title { margin: 0; font-size: 47px; line-height: 1.08; font-weight: normal; letter-spacing: -1.5px; }
    .hero-title em { color: #d5c3a5; }
    .hero-copy { max-width: 500px; margin: 25px auto 0; font-size: 17px; line-height: 1.8; color: #ddd7ce; }
    .hero-rule { width: 45px; height: 1px; background: #bcae99; margin: 30px auto 0; }
    .content { padding: 55px 52px; }
    .eyebrow { font-size: 9px; letter-spacing: 3px; color: #8b8176; margin-bottom: 13px; }
    .heading { margin: 0 0 20px; font-size: 31px; line-height: 1.2; font-weight: normal; color: #171717; }
    .body-copy { margin: 0 0 20px; font-size: 16px; line-height: 1.9; color: #625c55; }
    .dropcap:first-letter { float: left; font-size: 58px; line-height: .8; padding-right: 8px; color: #171717; }
    .rule { height: 1px; background: #ded7cc; margin: 42px 0; }
    .statement { background: #f2ede5; padding: 38px 35px; margin: 35px 0 45px; text-align: center; }
    .statement-text { margin: 0; font-size: 24px; line-height: 1.55; font-style: italic; color: #292722; }
    .statement-caption { margin-top: 18px; font-family: Arial, Helvetica, sans-serif; font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #918678; }
    .genre-box { border: 1px solid #ded7cc; padding: 30px; margin-top: 30px; }
    .genre-title { margin: 0 0 15px; font-size: 23px; font-weight: normal; }
    .genre-copy { margin: 0 0 22px; font-size: 14px; line-height: 1.8; color: #6c665f; }
    .genre-tags { font-size: 10px; line-height: 2.5; letter-spacing: 1px; color: #3f3a34; }
    .genre-tag { display: inline-block; border-bottom: 1px solid #bcae99; margin-right: 13px; }
    .stat-section { background: #171717; color: #fffdf9; text-align: center; padding: 45px 25px; margin: 45px 0; }
    .stat-number { font-size: 45px; line-height: 1; color: #d5c3a5; }
    .stat-text { margin-top: 13px; font-size: 9px; letter-spacing: 3px; color: #c7c0b6; }
    .feature { padding: 25px 0; border-bottom: 1px solid #e5dfd6; }
    .feature:last-child { border-bottom: 0; }
    .feature-number { display: inline-block; width: 32px; height: 32px; line-height: 32px; border: 1px solid #aaa092; border-radius: 50%; text-align: center; font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #625c55; margin-right: 11px; vertical-align: middle; }
    .feature-title { font-size: 19px; vertical-align: middle; }
    .feature-copy { margin: 13px 0 0 45px; font-size: 14px; line-height: 1.8; color: #706a62; }
    .reading-section { background: #f7f3ec; padding: 45px 35px; text-align: center; margin-top: 35px; }
    .reading-icon { font-size: 26px; margin-bottom: 15px; }
    .reading-title { margin: 0 0 13px; font-size: 27px; font-weight: normal; }
    .reading-copy { max-width: 450px; margin: auto; font-size: 14px; line-height: 1.8; color: #6c665f; }
    .cta { background: #171717; padding: 55px 35px 60px; text-align: center; color: #fffdf9; }
    .cta-label { font-size: 9px; letter-spacing: 4px; color: #bcae99; margin-bottom: 17px; }
    .cta-title { margin: 0; font-size: 32px; font-weight: normal; }
    .cta-copy { max-width: 430px; margin: 17px auto 28px; font-size: 15px; line-height: 1.8; color: #d3cec6; }
    .button { display: inline-block; padding: 15px 34px; background: #fffdf9; color: #171717 !important; text-decoration: none; font-family: Arial, Helvetica, sans-serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
    .footer { background: #fffdf9; border-top: 1px solid #ded7cc; text-align: center; padding: 35px 30px; }
    .footer-logo { width: 135px; max-width: 55%; margin: 0 auto 18px; }
    .footer-copy { max-width: 430px; margin: 0 auto 15px; font-size: 10px; line-height: 1.8; color: #8a8178; }
    .footer-links { font-size: 10px; color: #6e665d; }
    .footer-links a { text-decoration: underline; }
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 10px 5px; } .header { padding: 30px 20px 25px; } .logo { width: 180px; }
      .hero { padding: 50px 25px 55px; } .hero-title { font-size: 37px; } .hero-copy { font-size: 15px; }
      .content { padding: 42px 25px; } .heading { font-size: 28px; } .body-copy { font-size: 15px; }
      .statement { padding: 30px 22px; } .statement-text { font-size: 21px; } .genre-box { padding: 23px; }
      .cta { padding: 45px 25px 50px; } .cta-title { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="wrapper"><table class="email" width="100%" role="presentation">
    <tr><td class="header"><a href="https://whisper119.com" style="text-decoration:none;"><img src="https://whisper119.com/whisper-119-logo.png" alt="Whisper 119" class="logo"></a><div class="tagline">Romance · Fiction · Stories</div></td></tr>
    <tr><td class="hero"><div class="hero-small">Welcome to Whisper 119</div><h1 class="hero-title">Hello,<br><em>${name}</em></h1><p class="hero-copy">You’re officially on the list. And that means you’re now a little closer to the stories waiting inside Whisper 119.</p><div class="hero-rule"></div></td></tr>
    <tr><td class="content">
      <div class="eyebrow">A note for you</div><h2 class="heading">Come for the story.<br>Stay for the obsession.</h2>
      <p class="body-copy dropcap">Thank you for joining Whisper 119. This is a place for romance fiction with enough drama, danger, mystery and imagination to keep turning the page.</p>
      <p class="body-copy">Here you&apos;ll find stories that move between worlds — from dark romance and billionaire romance to werewolf and paranormal romance.</p>
      <p class="body-copy">And whether you&apos;re here because you love impossible relationships, supernatural worlds, powerful characters or simply a really good romance, we&apos;re glad you found us.</p>
      <div class="statement"><p class="statement-text">“The best stories are the ones you forget you&apos;re reading.”</p><div class="statement-caption">Whisper 119</div></div>
      <div class="eyebrow">The Whisper 119 collection</div><h2 class="heading">Stories you can actually finish.</h2>
      <p class="body-copy">There is something particularly satisfying about discovering a story when you know the journey has already been completed.</p><p class="body-copy">The books available through Whisper 119 are completed series. No stopping halfway through the story and wondering what happens next.</p><p class="body-copy">Find a series that pulls you in, settle down, and read it all the way through.</p>
      <div class="genre-box"><div class="eyebrow">Explore your kind of romance</div><h3 class="genre-title">What are you in the mood for?</h3><p class="genre-copy">Different worlds. Different characters. Different kinds of trouble.</p><div class="genre-tags"><span class="genre-tag">Dark Romance</span><span class="genre-tag">Werewolf Romance</span><span class="genre-tag">Paranormal Romance</span><span class="genre-tag">Billionaire Romance</span></div></div>
      <div class="stat-section"><div class="stat-number">225,000+</div><div class="stat-text">readers across multiple countries</div></div>
      <div class="eyebrow">What you&apos;ll receive</div><h2 class="heading">A few things worth knowing.</h2>
      <div class="feature"><span class="feature-number">01</span><span class="feature-title">Completed series</span><p class="feature-copy">Every book available on the site is a completed series, so your reading journey doesn&apos;t have to stop while you wait for another chapter.</p></div>
      <div class="feature"><span class="feature-number">02</span><span class="feature-title">Digital books</span><p class="feature-copy">Whisper 119 books are digital downloads available in PDF and EPUB formats, delivered directly to your inbox after purchase.</p></div>
      <div class="feature"><span class="feature-number">03</span><span class="feature-title">New release updates</span><p class="feature-copy">When there is something new from Whisper 119, you&apos;ll hear about it here — along with occasional updates from behind the scenes.</p></div>
      <div class="reading-section"><div class="reading-icon">✦</div><h3 class="reading-title">Make yourself comfortable.</h3><p class="reading-copy">Find your favourite reading spot. Put your phone on silent. Pick a story. And give yourself permission to disappear for a little while.</p></div>
      <div class="rule"></div><div class="eyebrow">Your next read</div><h2 class="heading">You might as well start looking.</h2><p class="body-copy">The shop is open whenever you&apos;re ready. Browse the collection, find a story that catches your attention, and see where it takes you.</p><p class="body-copy">And don&apos;t worry — we won&apos;t fill your inbox with endless noise. If we write, there should be something worth telling you.</p>
    </td></tr>
    <tr><td class="cta"><div class="cta-label">Whenever you&apos;re ready</div><h2 class="cta-title">Find your next story.</h2><p class="cta-copy">Explore the Whisper 119 collection and discover a completed romance series waiting for you.</p><a href="https://whisper119.com/shop" class="button">Browse the Shop</a></td></tr>
    <tr><td class="footer"><img src="https://whisper119.com/whisper-119-logo.png" alt="Whisper 119" class="footer-logo"><p class="footer-copy">Whisper 119 is an author brand operated by Audrey Leilani Global Limited.</p><p class="footer-copy">You&apos;re receiving this email because you subscribed to the Whisper 119 mailing list.</p><div class="footer-links"><a href="${safeUnsubscribeUrl}">Unsubscribe</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://whisper119.com">Visit Whisper 119</a></div></td></tr>
  </table></div>
</body>
</html>`;
}