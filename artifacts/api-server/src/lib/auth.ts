import type { NextFunction, Request, Response } from "express";
import { GoogleAuth, OAuth2Client } from "google-auth-library";

function getFirebaseProjectId(): string | null {
  return process.env.FIREBASE_PROJECT_ID?.trim() || process.env.VITE_FIREBASE_PROJECT_ID?.trim() || null;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  return scheme.toLowerCase() === "bearer" ? token : null;
}

const firebaseTokenVerifier = new OAuth2Client();

export async function verifyFirebaseIdToken(idToken: string): Promise<{ email: string; uid: string } | null> {
  const projectId = getFirebaseProjectId();
  if (!projectId) return null;

  try {
    const ticket = await firebaseTokenVerifier.verifyIdToken(idToken, projectId);
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) return null;

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
