import { Router, type IRouter } from "express";
import { RecordPageViewBody } from "@workspace/api-zod";
import { analyticsEventsTable, db } from "@workspace/db";

const router: IRouter = Router();

router.post("/analytics/page-view", async (req, res): Promise<void> => {
  const parsed = RecordPageViewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.insert(analyticsEventsTable).values({
    eventType: "page_view",
    path: parsed.data.path,
    visitorId: parsed.data.visitorId ?? null,
  });
  res.status(204).send();
});

export default router;