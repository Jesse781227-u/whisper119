import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SESSION_COOKIE = "whisper119_admin";

function secret(): string | null {
  return process.env.SESSION_SECRET ?? null;
}

function digest(value: string): string {
  return createHmac("sha256", secret() ?? "missing-secret").update(value).digest("base64url");
}

export function createAdminSession(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + 1000 * 60 * 60 * 12 })).toString("base64url");
  return `${payload}.${digest(payload)}`;
}

export function getAdminEmail(req: Request): string | null {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const configuredSecret = secret();
  if (!token || !configuredSecret) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = digest(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; exp?: number };
    return parsed.email && parsed.exp && parsed.exp > Date.now() ? parsed.email : null;
  } catch {
    return null;
  }
}

export function setAdminSession(res: Response, email: string): void {
  const token = createAdminSession(email);
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 12,
    path: "/",
  });
}

export function clearAdminSession(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", path: "/" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!getAdminEmail(req)) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
}