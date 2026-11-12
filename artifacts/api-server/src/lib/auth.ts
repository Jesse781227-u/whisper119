import type { NextFunction, Request, Response } from "express";
import { createVerify } from "node:crypto";

function getFirebaseProjectId(): string | null {
  return process.env.FIREBASE_PROJECT_ID?.trim() || process.env.VITE_FIREBASE_PROJECT_ID?.trim() || null;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  return scheme.toLowerCase() === "bearer" ? token : null;
}

let cachedFirebaseCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getFirebasePublicKeys(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && cachedFirebaseCerts && cachedFirebaseCerts.expiresAt > now) {
    return cachedFirebaseCerts.certs;
  }

  try {
    const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
    if (!response.ok) throw new Error("Could not fetch Firebase token signing certificates.");
    const certs = await response.json() as Record<string, string>;
    const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 3600);
    cachedFirebaseCerts = { certs, expiresAt: now + maxAge * 1000 };
    return certs;
  } catch (error) {
    if (cachedFirebaseCerts) return cachedFirebaseCerts.certs;
    throw error;
  }
}

function decodeBase64UrlJson(segment: string): Record<string, unknown> {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as Record<string, unknown>;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<{ email: string; uid: string } | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId) return null;

  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const [headerPart, payloadPart, signaturePart] = parts;
    const header = decodeBase64UrlJson(headerPart);
    const payload = decodeBase64UrlJson(payloadPart);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
    if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) return null;
    if (typeof payload.iat !== "number" || payload.iat > nowSeconds) return null;
    if (typeof payload.auth_time !== "number" || payload.auth_time > nowSeconds) return null;
    if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 128) return null;
    if (typeof payload.email !== "string" || !payload.email.trim()) return null;

    let certs = await getFirebasePublicKeys();
    let cert = certs[header.kid];
    if (!cert) {
      certs = await getFirebasePublicKeys(true);
      cert = certs[header.kid];
    }
    if (!cert) return null;

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerPart}.${payloadPart}`);
    verifier.end();
    if (!verifier.verify(cert, Buffer.from(signaturePart, "base64url"))) return null;

    return {
      email: payload.email.trim().toLowerCase(),
      uid: payload.sub,
    };
  } catch {
    return null;
  }
}

export async function requireReader(req: Request, res: Response, next: NextFunction): Promise<void> {
  const idToken = getBearerToken(req);
  if (!idToken) { res.status(401).json({ error: "Reader authentication required" }); return; }
  const reader = await verifyFirebaseIdToken(idToken);
  if (!reader?.email) { res.status(401).json({ error: "Reader authentication required" }); return; }
  res.locals.reader = reader;
  next();
}

function firstEnv(...names: string[]): string | undefined {
  return names.map((name) => process.env[name]?.trim()).find(Boolean);
}

let cachedServiceToken: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(bytes: Uint8Array | string): string {
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Exchanges the Firebase service account for a Firestore access token using
 * the OAuth 2 JWT-bearer flow. Uses Web Crypto so it runs on Node and on
 * Cloudflare Workers alike.
 */
async function getServiceAccessToken(): Promise<string | null> {
  if (cachedServiceToken && cachedServiceToken.expiresAt > Date.now() + 60_000) {
    return cachedServiceToken.token;
  }

  const clientEmail = firstEnv("GCS_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL");
  const privateKey = firstEnv("GCS_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY")?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;

  try {
    const pkcs8 = Buffer.from(
      privateKey.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, ""),
      "base64",
    );
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64UrlEncode(JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }));
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${claims}`),
    );
    const assertion = `${header}.${claims}.${base64UrlEncode(new Uint8Array(signature))}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!response.ok) return null;
    const body = await response.json() as { access_token?: string; expires_in?: number };
    if (!body.access_token) return null;
    cachedServiceToken = {
      token: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
    };
    return body.access_token;
  } catch {
    return null;
  }
}

async function getFirestoreDoc(path: string): Promise<Record<string, unknown> | null> {
  const accessToken = await getServiceAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getBooleanField(doc: Record<string, unknown> | null, fieldPath: string): boolean {
  if (!doc) return false;
  const fields = doc.fields as Record<string, unknown> | undefined;
  if (!fields) return false;
  const value = fields[fieldPath] as Record<string, unknown> | undefined;
  return value?.booleanValue === true;
}

async function isAdminToken(idToken: string): Promise<boolean> {
  const projectId = getFirebaseProjectId();
  if (!projectId) return false;

  const applicant = await verifyFirebaseIdToken(idToken);
  if (!applicant) return false;

  const normalizedEmail = applicant.email.toLowerCase();

  const adminEmailsEnv = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
  if (normalizedEmail && adminEmailsEnv.includes(normalizedEmail)) {
    return true;
  }

  const emailDocPath = `projects/${projectId}/databases/(default)/documents/admins/${encodeURIComponent(normalizedEmail)}`;
  const userDocPath = `projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(applicant.uid)}`;

  const [adminDoc, userDoc] = await Promise.all([
    getFirestoreDoc(emailDocPath),
    getFirestoreDoc(userDocPath),
  ]);

  if (adminDoc) return true;
  return getBooleanField(userDoc, "isAdmin");
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const idToken = getBearerToken(req);
  if (!idToken) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  const isAdmin = await isAdminToken(idToken);
  if (!isAdmin) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  next();
}
