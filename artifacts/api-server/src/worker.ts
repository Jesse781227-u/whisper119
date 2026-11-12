/**
 * Cloudflare Workers entry point.
 *
 * One Worker serves the whole site:
 *   - static storefront files (artifacts/whisper119/dist/public) come straight
 *     from Cloudflare's edge via the `assets` binding;
 *   - /api/* and /unsubscribe/* are routed to the existing Express app, which
 *     runs on Workers' Node.js HTTP compatibility layer;
 *   - /book/* and /series/* get per-page title, Open Graph tags and JSON-LD
 *     injected into the SPA shell so shared links preview properly;
 *   - /img/<key> serves cover images from R2 on our own domain, resized and
 *     cached at the edge;
 *   - the Cron Trigger replaces node-cron for scheduled newsletters.
 *
 * Postgres is reached through Hyperdrive. Workers cannot share sockets between
 * requests, so each request gets its own short-lived pool via `runWithDatabase`.
 * Schema migrations run once per isolate on the first API request.
 */
import { httpServerHandler } from "cloudflare:node";
import { eq, or } from "drizzle-orm";
import { booksTable, db, runWithDatabase, seriesTable } from "@workspace/db";
import app from "./app";
import { coverUrl } from "./lib/bookstore";
import { ensureMigrations } from "./lib/migrations";
import { sendDueNewsletters } from "./lib/newsletter-scheduler";
import { ObjectStorageService } from "./lib/objectStorage";

interface ImagesBinding {
  input(stream: ReadableStream): {
    transform(options: { width?: number }): {
      output(options: { format: string; quality?: number }): Promise<{ response(): Response }>;
    };
  };
}

interface Env {
  HYPERDRIVE: { connectionString: string };
  ASSETS: { fetch(request: Request): Promise<Response> };
  IMAGES?: ImagesBinding;
}

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

declare const caches: { default: { match(request: Request): Promise<Response | undefined>; put(request: Request, response: Response): Promise<void> } };
declare class HTMLRewriter {
  on(selector: string, handlers: { element?(element: { setAttribute(name: string, value: string): void; setInnerContent(content: string): void; append(content: string, options?: { html: boolean }): void }): void }): HTMLRewriter;
  transform(response: Response): Response;
}

const PORT = 8787;
app.listen(PORT);
const expressHandler = httpServerHandler({ port: PORT });
const SITE = "https://whisper119.com";
const IMAGE_WIDTHS = new Set([300, 600, 900]);

function connectionString(env: Env): string {
  return env.HYPERDRIVE?.connectionString || process.env.DATABASE_URL || "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function summary(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

type PageMeta = { title: string; description: string; url: string; image: string | null; jsonLd?: unknown };

function withMeta(shell: Response, meta: PageMeta): Response {
  const set = (selector: string, value: string) => ({ selector, value });
  const image = meta.image ?? `${SITE}/og-image.jpg`;
  const attrs = [
    set('meta[name="description"]', meta.description),
    set('meta[property="og:title"]', meta.title),
    set('meta[property="og:description"]', meta.description),
    set('meta[property="og:url"]', meta.url),
    set('meta[property="og:image"]', image),
    set('meta[name="twitter:title"]', meta.title),
    set('meta[name="twitter:description"]', meta.description),
    set('meta[name="twitter:image"]', image),
  ];
  let rewriter = new HTMLRewriter()
    .on("title", { element: (el) => el.setInnerContent(escapeHtml(meta.title)) })
    .on('link[rel="canonical"]', { element: (el) => el.setAttribute("href", meta.url) });
  for (const { selector, value } of attrs) {
    rewriter = rewriter.on(selector, { element: (el) => el.setAttribute("content", value) });
  }
  if (!meta.image) {
    // Book covers are portrait; drop the landscape size hints of the default image.
  } else {
    rewriter = rewriter
      .on('meta[property="og:image:width"]', { element: (el) => el.setAttribute("content", "600") })
      .on('meta[property="og:image:height"]', { element: (el) => el.setAttribute("content", "900") });
  }
  if (meta.jsonLd) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, "\\u003c");
    rewriter = rewriter.on("head", { element: (el) => el.append(`<script type="application/ld+json">${json}</script>`, { html: true }) });
  }
  const response = rewriter.transform(shell);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  return new Response(response.body, { status: shell.status, headers });
}

async function pageMeta(pathname: string): Promise<PageMeta | null> {
  const bookMatch = pathname.match(/^\/book\/([^/]+)\/?$/);
  if (bookMatch) {
    const key = decodeURIComponent(bookMatch[1]);
    const [book] = await db.select().from(booksTable).where(or(eq(booksTable.id, key), eq(booksTable.slug, key))).limit(1);
    if (!book) return null;
    const [series] = book.seriesId ? await db.select().from(seriesTable).where(eq(seriesTable.id, book.seriesId)) : [];
    const displayTitle = series && book.seriesNumber ? `${series.name}, Book ${book.seriesNumber}` : book.title;
    const price = `$${Number(book.price).toFixed(2)}`;
    const cover = coverUrl(book);
    const image = cover ? `${new URL(cover, SITE).href}${cover.includes("/img/") ? "?w=600" : ""}` : null;
    const url = `${SITE}/book/${book.id}`;
    return {
      title: `${displayTitle} — Whisper 119`,
      description: summary(`${price} · PDF ebook by ${book.author}. ${book.description}`),
      url,
      image,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": ["Book", "Product"],
        name: displayTitle,
        author: { "@type": "Person", name: book.author },
        inLanguage: book.language,
        bookFormat: "https://schema.org/EBook",
        image: image ?? undefined,
        description: summary(book.description, 500),
        url,
        ...(series ? { isPartOf: { "@type": "BookSeries", name: series.name, url: `${SITE}/series/${series.slug}` } } : {}),
        offers: { "@type": "Offer", price: Number(book.price).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url },
      },
    };
  }
  const seriesMatch = pathname.match(/^\/series\/([^/]+)\/?$/);
  if (seriesMatch) {
    const [series] = await db.select().from(seriesTable).where(eq(seriesTable.slug, decodeURIComponent(seriesMatch[1])));
    if (!series) return null;
    const volumes = await db.select().from(booksTable).where(eq(booksTable.seriesId, series.id)).orderBy(booksTable.seriesNumber);
    const first = volumes[0];
    const cover = first ? coverUrl(first) : null;
    return {
      title: `${series.name} — Whisper 119`,
      description: summary(`${volumes.length} book${volumes.length === 1 ? "" : "s"} by Whisper 119. ${series.description || first?.description || ""}`),
      url: `${SITE}/series/${series.slug}`,
      image: cover ? `${new URL(cover, SITE).href}${cover.includes("/img/") ? "?w=600" : ""}` : null,
    };
  }
  return null;
}

async function serveImage(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.slice("/img/".length));
  const width = Number(url.searchParams.get("w"));
  const cacheKey = new Request(`${url.origin}/img/${encodeURI(key)}${IMAGE_WIDTHS.has(width) ? `?w=${width}` : ""}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const storage = new ObjectStorageService();
  let original: Response;
  try {
    original = await storage.downloadObject(await storage.getObjectEntityFile(`/objects/${key}`), 31536000);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  // Only images are public here; paid ebook files are never served by this route.
  const type = original.headers.get("Content-Type") ?? "";
  if (!type.startsWith("image/")) return new Response("Not found", { status: 404 });

  let response = original;
  if (IMAGE_WIDTHS.has(width) && env.IMAGES && original.body) {
    try {
      const result = await env.IMAGES.input(original.body).transform({ width }).output({ format: "image/webp", quality: 80 });
      response = result.response();
    } catch {
      response = await storage.downloadObject(await storage.getObjectEntityFile(`/objects/${key}`), 31536000);
    }
  }
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.delete("Content-Length");
  const final = new Response(response.body, { status: 200, headers });
  ctx.waitUntil(caches.default.put(cacheKey, final.clone()));
  return final;
}

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    // Visitor country from Cloudflare's edge, used to decide whether to show
    // NGN alongside USD prices. Never cached: it differs per visitor.
    if (pathname === "/api/geo") {
      const country = (request as Request & { cf?: { country?: string } }).cf?.country ?? null;
      return Response.json({ country }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (pathname.startsWith("/img/")) {
      return runWithDatabase(connectionString(env), () => serveImage(request, env, ctx), (p) => ctx.waitUntil(p));
    }
    if (/^\/(book|series)\//.test(pathname)) {
      const shell = await env.ASSETS.fetch(request);
      if (/\/sample\/?$/.test(pathname) || !shell.headers.get("Content-Type")?.includes("text/html")) return shell;
      try {
        const meta = await runWithDatabase(connectionString(env), () => pageMeta(pathname), (p) => ctx.waitUntil(p));
        return meta ? withMeta(shell, meta) : shell;
      } catch {
        return shell;
      }
    }
    if (!pathname.startsWith("/api/") && pathname !== "/api" && !pathname.startsWith("/unsubscribe/")) {
      return env.ASSETS.fetch(request);
    }
    return runWithDatabase(
      connectionString(env),
      async () => {
        await ensureMigrations();
        return expressHandler.fetch!(request as never, env as never, ctx as never) as Promise<Response>;
      },
      (promise) => ctx.waitUntil(promise),
    );
  },

  async scheduled(_controller: unknown, env: Env, ctx: WorkerContext): Promise<void> {
    await runWithDatabase(connectionString(env), async () => {
      await ensureMigrations();
      await sendDueNewsletters();
    }, (promise) => ctx.waitUntil(promise));
  },
};
