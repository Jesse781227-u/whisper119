import type { NextFunction, Request, Response } from "express";
import { GoogleAuth, OAuth2Client } from "google-auth-library";

function getFirebaseProjectId(): string | null {
  return process.env.FIREBASE_PROJECT_ID ?? process.env.VITE_FIREBASE_PROJECT_ID ?? null;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  return scheme.toLowerCase() === "bearer" ? token : null;
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ email: string; uid: string } | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId) return null;

  const client = new OAuth2Client();
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: projectId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub) return null;
    return { email: payload.email.toLowerCase(), uid: payload.sub };
  } catch {
    return null;
  }
}

async function getServiceAccessToken(): Promise<string | null> {
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/datastore"] });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse) return null;
  return typeof tokenResponse === "string" ? tokenResponse : tokenResponse.token ?? null;
}

async function getFirestoreDoc(path: string): Promise<Record<string, unknown> | null> {
  const accessToken = await getServiceAccessToken();
  if (!accessToken) return null;

  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as Record<string, unknown>;
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

  const emailDocPath = `projects/${projectId}/databases/(default)/documents/admins/${encodeURIComponent(applicant.email)}`;
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
