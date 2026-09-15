import { Router, type IRouter } from "express";
import { upsertSubscriber } from "../lib/subscribers";

const router: IRouter = Router();

router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  if (email.length < 3 || !email.includes("@")) {
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }

  try {
    await upsertSubscriber({ email, source: "signup_form" });
    res.status(201).json({ subscribed: true });
  } catch (error) {
    req.log.error({ err: error }, "Newsletter subscription failed");
    res.status(500).json({ error: "The newsletter subscription could not be saved." });
  }
});

export default router;