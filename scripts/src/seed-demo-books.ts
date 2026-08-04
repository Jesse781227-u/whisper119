import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { db, booksTable } from "@workspace/db";

type DemoBook = typeof booksTable.$inferInsert;
const execFileAsync = promisify(execFile);

const fixturePath = new URL("../data/demo-books.json", import.meta.url);
const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as Array<Omit<DemoBook, "currency" | "publishedAt"> & { publishedAt: string }>;
const books: DemoBook[] = fixture.map((book) => ({
  ...book,
  currency: "USD",
  publishedAt: new Date(book.publishedAt),
}));

function pdfContent(book: DemoBook): Buffer {
  const text = `Whisper 119 demo edition\\n\\n${book.title}\\nBy ${book.author}\\n\\nThis is a sample attachment for the development catalogue.`;
  return Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${text.length + 44} >>
stream
BT /F1 16 Tf 72 720 Td (${text.replace(/[()]/g, "")}) Tj ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`);
}

async function epubContent(book: DemoBook): Promise<Buffer> {
  const root = await mkdtemp(`${tmpdir()}/whisper119-`);
  try {
    await writeFile(`${root}/mimetype`, "application/epub+zip");
    await mkdir(`${root}/META-INF`);
    await writeFile(`${root}/META-INF/container.xml`, `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
    await mkdir(`${root}/OEBPS`);
    await writeFile(`${root}/OEBPS/content.opf`, `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${book.id}</dc:identifier><dc:title>${book.title}</dc:title><dc:creator>${book.author}</dc:creator><dc:language>en</dc:language></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>`);
    await writeFile(`${root}/OEBPS/chapter.xhtml`, `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${book.title}</title></head><body><h1>${book.title}</h1><p>Demo edition by ${book.author}.</p><p>This sample attachment is included for development testing.</p></body></html>`);
    const output = `${root}/${book.fileName}`;
    await execFileAsync("zip", ["-X0", "-q", output, "mimetype"], { cwd: root });
    await execFileAsync("zip", ["-Xr9", "-q", output, "META-INF", "OEBPS"], { cwd: root });
    return await readFile(output);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function uploadDemoAttachment(book: DemoBook, content: Buffer): Promise<void> {
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR must be configured before seeding demo attachments.");
  const fullPath = `${privateDir.replace(/\/$/, "")}/${book.fileObjectPath.replace(/^\/objects\//, "")}`;
  const pathParts = fullPath.replace(/^\/+/, "").split("/");
  const bucketName = pathParts.shift();
  const objectName = pathParts.join("/");
  if (!bucketName || !objectName) throw new Error(`Could not parse private object path for ${book.fileName}.`);
  const signed = await fetch("http://127.0.0.1:1106/object-storage/signed-object-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: "PUT",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
  });
  if (!signed.ok) throw new Error(`Could not sign demo attachment upload for ${book.fileName}.`);
  const payload = (await signed.json()) as { signed_url?: string };
  if (!payload.signed_url) throw new Error(`Missing signed URL for ${book.fileName}.`);
  const upload = await fetch(payload.signed_url, {
    method: "PUT",
    headers: { "Content-Type": book.format === "PDF" ? "application/pdf" : "application/epub+zip" },
    body: content,
  });
  if (!upload.ok) throw new Error(`Could not upload demo attachment ${book.fileName}.`);
}

for (const book of books) {
  const content = book.format === "PDF" ? pdfContent(book) : await epubContent(book);
  await uploadDemoAttachment(book, content);
}

await db.insert(booksTable).values(books).onConflictDoNothing({ target: booksTable.slug });
console.log(`Seeded ${books.length} demo books and private sample attachments (existing slugs were left unchanged).`);