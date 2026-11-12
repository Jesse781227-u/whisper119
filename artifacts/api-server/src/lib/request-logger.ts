import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { Logger } from "pino";
import { logger } from "./logger";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      log: Logger;
    }
  }
}

/**
 * Minimal replacement for pino-http that works on both Node and Cloudflare
 * Workers: attaches `req.log` and logs one line per completed request.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  req.id = req.get("cf-ray") ?? randomUUID();
  req.log = logger.child({ reqId: req.id });

  res.on("finish", () => {
    const entry = {
      req: { id: req.id, method: req.method, url: req.originalUrl.split("?")[0] },
      res: { statusCode: res.statusCode },
      responseTime: Date.now() - startedAt,
    };
    if (res.statusCode >= 500) req.log.error(entry, "request errored");
    else if (res.statusCode >= 400) req.log.warn(entry, "request failed");
    else req.log.info(entry, "request completed");
  });

  next();
};
