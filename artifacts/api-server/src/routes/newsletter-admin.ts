import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, countDistinct, desc, eq, sql } from "drizzle-orm";
import { db, emailEvents, messages } from "@workspace/db";
import { CreateNewsletterMessageBody, UpdateNewsletterMessageBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { markdownToHtml } from "../lib/newsletter-content";
import { sendMessageToAllSubscribers } from "../lib/newsletter-sender";

const router: IRouter = Router();
router.use("/admin/newsletter", requireAdmin);

const emptyStats = () => ({ sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 });

async function listMessages() {
  const rows = await db.select().from(messages).orderBy(desc(messages.createdAt));
  const eventRows = await db.select({ messageId: emailEvents.messageId, eventType: emailEvents.eventType, subscribers: countDistinct(emailEvents.subscriberId) })
    .from(emailEvents).where(sql`${emailEvents.messageId} is not null`).groupBy(emailEvents.messageId, emailEvents.eventType);
  const stats = new Map<string, ReturnType<typeof emptyStats>>();
  for (const row of eventRows) {
    if (!row.messageId) continue;
    const current = stats.get(row.messageId) ?? emptyStats();
    current[row.eventType] = Number(row.subscribers);
    stats.set(row.messageId, current);
  }
  return rows.map((message) => ({
    ...message,
    scheduledAt: message.scheduledAt?.toISOString() ?? null,
    sentAt: message.sentAt?.toISOString() ?? null,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    stats: stats.get(message.id) ?? emptyStats(),
  }));
}

router.get("/admin/newsletter/messages", async (_req, res): Promise<void> => {
  res.json(await listMessages());
});

router.post("/admin/newsletter/messages", async (req, res): Promise<void> => {
  const parsed = CreateNewsletterMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [message] = await db.insert(messages).values({
    id: randomUUID(), subject: parsed.data.subject.trim(), bodyHtml: markdownToHtml(parsed.data.bodyMarkdown),
  }).returning();
  res.status(201).json((await listMessages()).find((item) => item.id === message.id));
});

router.patch("/admin/newsletter/messages/:messageId", async (req, res): Promise<void> => {
  const parsed = UpdateNewsletterMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [message] = await db.update(messages).set({
    subject: parsed.data.subject.trim(), bodyHtml: markdownToHtml(parsed.data.bodyMarkdown), status: parsed.data.scheduledAt ? "scheduled" : "draft",
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null, updatedAt: new Date(),
  }).where(and(eq(messages.id, req.params.messageId), eq(messages.status, "draft"))).returning();
  if (!message) { res.status(404).json({ error: "Draft message not found" }); return; }
  res.json((await listMessages()).find((item) => item.id === message.id));
});

router.post("/admin/newsletter/messages/:messageId/send", async (req, res): Promise<void> => {
  try {
    const [message] = await db.select().from(messages).where(eq(messages.id, req.params.messageId));
    if (!message) { res.status(404).json({ error: "Message not found" }); return; }
    if (message.status === "sent") { res.status(409).json({ error: "This message has already been sent." }); return; }
    await sendMessageToAllSubscribers(message.id);
    res.json((await listMessages()).find((item) => item.id === message.id));
  } catch (error) {
    req.log.error({ err: error, messageId: req.params.messageId }, "Newsletter send failed");
    res.status(502).json({ error: error instanceof Error ? error.message : "Newsletter send failed" });
  }
});

export { listMessages };
export default router;