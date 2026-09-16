import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, count, countDistinct, desc, eq, sql } from "drizzle-orm";
import { db, emailEvents, messages, newsletterTemplates, subscribers } from "@workspace/db";
import { CreateNewsletterMessageBody, UpdateNewsletterMessageBody } from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";
import { htmlToMarkdown, markdownToHtml } from "../lib/newsletter-content";
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
    bodyMarkdown: htmlToMarkdown(message.bodyHtml),
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

router.get("/admin/newsletter/overview", async (_req, res): Promise<void> => {
  const [subscriberRows, sentMessageRows, eventRows] = await Promise.all([
    db.select().from(subscribers).orderBy(desc(subscribers.createdAt)),
    db.select({ count: count() }).from(messages).where(eq(messages.status, "sent")),
    db.select({ eventType: emailEvents.eventType, subscribers: countDistinct(emailEvents.subscriberId) })
      .from(emailEvents).groupBy(emailEvents.eventType),
  ]);
  const engagement = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 };
  for (const row of eventRows) engagement[row.eventType] = Number(row.subscribers);
  const totalSubscribers = subscriberRows.length;
  const activeSubscribers = subscriberRows.filter((subscriber) => subscriber.subscribed).length;
  const bySource = { signup_form: 0, purchase: 0, both: 0 };
  for (const subscriber of subscriberRows) bySource[subscriber.source] += 1;
  const byStatus = { active: activeSubscribers, unsubscribed: totalSubscribers - activeSubscribers };
  const rate = (value: number) => engagement.sent ? Math.round((value / engagement.sent) * 1000) / 10 : 0;
  res.json({
    subscribers: subscriberRows.map((subscriber) => ({
      id: subscriber.id, email: subscriber.email, name: subscriber.name, source: subscriber.source,
      subscribed: subscriber.subscribed, createdAt: subscriber.createdAt.toISOString(),
    })),
    summary: {
      totalSubscribers, activeSubscribers, totalMessagesSent: Number(sentMessageRows[0]?.count ?? 0),
      engagement, rates: { delivered: rate(engagement.delivered), opened: rate(engagement.opened), clicked: rate(engagement.clicked), bounced: rate(engagement.bounced) },
    },
    bySource, byStatus,
  });
});

router.get("/admin/newsletter/templates", async (_req, res): Promise<void> => {
  const rows = await db.select().from(newsletterTemplates).orderBy(desc(newsletterTemplates.updatedAt));
  res.json(rows.map((template) => ({ ...template, bodyMarkdown: htmlToMarkdown(template.bodyHtml), createdAt: template.createdAt.toISOString(), updatedAt: template.updatedAt.toISOString() })));
});

router.post("/admin/newsletter/templates", async (req, res): Promise<void> => {
  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
  const bodyMarkdown = typeof req.body?.bodyMarkdown === "string" ? req.body.bodyMarkdown.trim() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : subject;
  if (!name || !subject || !bodyMarkdown) { res.status(400).json({ error: "Template name, subject, and body are required." }); return; }
  const [template] = await db.insert(newsletterTemplates).values({ id: randomUUID(), name, subject, bodyHtml: markdownToHtml(bodyMarkdown) }).returning();
  res.status(201).json({ ...template, bodyMarkdown, createdAt: template.createdAt.toISOString(), updatedAt: template.updatedAt.toISOString() });
});

router.post("/admin/newsletter/messages", async (req, res): Promise<void> => {
  const parsed = CreateNewsletterMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [message] = await db.insert(messages).values({
    id: randomUUID(), subject: parsed.data.subject.trim(), bodyHtml: markdownToHtml(parsed.data.bodyMarkdown),
    status: parsed.data.scheduledAt ? "scheduled" : "draft",
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
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