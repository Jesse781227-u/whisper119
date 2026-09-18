import { convert } from "html-to-text";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

export function markdownToHtml(markdown: string): string {
  return markdown.trim().split(/\r?\n\r?\n/).map((block) => {
    const content = escapeHtml(block.trim())
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, "<br />");
    return /^<h[1-3]>/.test(content) ? content : `<p>${content}</p>`;
  }).join("\n");
}

export function htmlToMarkdown(html: string): string {
  return html.replace(/<h[1-3]>(.*?)<\/h[1-3]>/gi, "# $1\n\n")
    .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<a href="(https?:\/\/[^\"]+)">(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function htmlToText(html: string): string {
  return convert(html, {
    wordwrap: 80,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
      { selector: "h1", options: { uppercase: false } },
      { selector: "h2", options: { uppercase: false } },
      { selector: "h3", options: { uppercase: false } },
      { selector: "h4", options: { uppercase: false } },
      { selector: "h5", options: { uppercase: false } },
      { selector: "h6", options: { uppercase: false } },
      { selector: "ul", options: { itemPrefix: " - " } },
    ],
  }).trim();
}
