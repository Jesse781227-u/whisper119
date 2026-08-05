import { Router, type IRouter } from "express";
import { SubscribeNewsletterBody, SubscribeNewsletterResponse } from "@workspace/api-zod";
import { subscribeToNewsletter } from "../lib/newsletter";

const router: IRouter = Router();

router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const parsed = SubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    await subscribeToNewsletter(parsed.data.email);
    res.status(201).json(SubscribeNewsletterResponse.parse({ subscribed: true }));
  } catch (error) {
    if (error instanceof Error && error.message === "NEWSLETTER_NOT_CONFIGURED") {
      res.status(503).json({ error: "The newsletter is not configured yet. Please try again later." });
      return;
    }
    req.log.error({ err: error }, "Newsletter subscription failed");
    res.status(502).json({ error: "We could not subscribe you right now. Please try again." });
  }
});

export default router;