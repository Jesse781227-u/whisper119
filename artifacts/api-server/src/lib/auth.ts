import type { NextFunction, Request, Response } from "express";
import { GoogleAuth } from "google-auth-library";
import { createVerify } from "node:crypto";

function getFirebaseProjectId(): string | null {
  return process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID ?? null;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  return scheme.toLowerCase() === "bearer" ? token : null;
}

let cachedCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getFirebasePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && cachedCerts.expiresAt > now) {
    return cachedCerts.certs;
  }
  try {
    const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
    if (!res.ok) throw new Error("Failed to fetch Google public keys for Firebase tokens.");
    const certs = (await res.json()) as Record<string, string>;
    const cacheControl = res.headers.get("cache-control");
    let maxAge = 3600;
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/);
      if (match) maxAge = parseInt(match[1], 10);
    }
    cachedCerts = { certs, expiresAt: now + maxAge * 1000 };
    return certs;
  } catch (err) {
    if (cachedCerts) return cachedCerts.certs;
    throw err;
  }
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ email: string; uid: string } | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId) return null;

  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(base64UrlDecode(headerB64));
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    const nowSec = Math.floor(Date.now() / 1000);

    if (header.alg !== "RS256") return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;

    const certs = await getFirebasePublicKeys();
    const cert = certs[header.kid];
    if (!cert) return null;

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    const signature = Buffer.from(signatureB64, "base64url");
    const isValid = verifier.verify(cert, signature);

    if (!isValid) return null;

    return {
      email: (payload.email ?? "").toLowerCase(),
      uid: payload.sub,
    };
  } catch {
    return null;
  }
}

function firstEnv(...names: string[]): string | undefined {
  return names.map((name) => process.env[name]?.trim()).find(Boolean);
}

async function getServiceAccessToken(): Promise<string | null> {
  try {
    const clientEmail = firstEnv("GCS_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL");
    const privateKey = firstEnv("GCS_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY")?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
    const authOptions: any = { scopes: ["https://www.googleapis.com/auth/datastore"] };
    if (clientEmail && privateKey) {
      authOptions.credentials = { client_email: clientEmail, private_key: privateKey };
    }
    const auth = new GoogleAuth(authOptions);
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse) return null;
    return typeof tokenResponse === "string" ? tokenResponse : tokenResponse.token ?? null;
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
