import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subscribers } from "@workspace/db";

const router: IRouter = Router();

router.get("/unsubscribe/:token", async (req, res): Promise<void> => {
  const token = typeof req.params.token === "string" ? req.params.token : "";
  if (token) {
    await db.update(subscribers)
      .set({ subscribed: false })
      .where(eq(subscribers.unsubscribeToken, token));
  }

  res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Whisper 119</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#100b18;color:#f8edf5;font:16px/1.6 system-ui,sans-serif;padding:24px}main{max-width:520px;text-align:center;border:1px solid #67415e;border-radius:24px;padding:40px;background:#1c1222}h1{margin:0 0 12px;font-size:32px}p{color:#d2b8ca}</style></head>
<body><main><h1>You&apos;ve been unsubscribed</h1><p>Sorry to see you go. You won&apos;t receive any more newsletter updates from Whisper 119.</p></main></body></html>`);
});

export default router;