import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// API clients expect a JSON body on successful catalogue requests. Express's
// default ETag handling can turn a cached GET into a 304 response, which has
// no body and is treated as an error by the generated client.
app.disable("etag");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ?? process.env.PUBLIC_APP_URL ?? "https://whisper119.com,https://www.whisper119.com")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
);
app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin.replace(/\/+$/, ""))) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
}));
app.use(express.json({
  // Ebook bytes are uploaded directly to Firebase Storage. API requests only
  // contain small metadata payloads, but this gives them a useful upper bound.
  limit: "2mb",
  verify: (req, _res, body) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = body;
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

// Keep malformed/oversized requests JSON-shaped so clients never receive an
// empty or framework-generated HTML response for an API failure.
app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof Error && "type" in error && error.type === "entity.too.large") {
    req.log.warn({ err: error }, "API request exceeded the JSON body limit");
    res.status(413).json({ error: "Request metadata is too large. Ebook files must be uploaded directly to Firebase Storage." });
    return;
  }

  req.log.error({ err: error }, "Unhandled API request error");
  res.status(500).json({ error: "The server could not complete that request." });
});

export default app;
