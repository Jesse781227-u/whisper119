import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { File, Storage } from "@google-cloud/storage";

import {
  canAccessObject,
  getObjectAclPolicy,
  ObjectAclPolicy,
  ObjectPermission,
  setObjectAclPolicy,
} from "./objectAcl";

function firstEnv(...names: string[]): string | undefined {
  return names.map((name) => process.env[name]?.trim()).find(Boolean);
}

function normalizeBucketName(value: string): string {
  return value.replace(/^gs:\/\//, "").replace(/^https?:\/\/storage\.googleapis\.com\//, "").split("/", 1)[0];
}

export const objectStorageClient = new Storage({
  projectId: firstEnv("GCS_PROJECT_ID", "GOOGLE_CLOUD_PROJECT", "GCP_PROJECT", "FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID"),
  credentials: firstEnv("GCS_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL") && firstEnv("GCS_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY")
    ? {
        client_email: firstEnv("GCS_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL"),
        private_key: firstEnv("GCS_PRIVATE_KEY", "FIREBASE_PRIVATE_KEY")?.replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
      }
    : undefined,
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private getBucketName(): string {
    const value = firstEnv("GCS_BUCKET_NAME", "FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_STORAGE_BUCKET");
    if (!value) throw new Error("GCS_BUCKET_NAME or FIREBASE_STORAGE_BUCKET must be configured.");
    return normalizeBucketName(value);
  }

  private getUploadPrefix(): string {
    return (process.env.GCS_UPLOAD_PREFIX?.trim() || "uploads").replace(/^\/+|\/+$/g, "");
  }

  private getBucketFile(objectPath: string): File {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const objectName = objectPath.slice("/objects/".length);
    if (!objectName) throw new ObjectNotFoundError();
    return objectStorageClient.bucket(this.getBucketName()).file(objectName);
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    const prefixes = (process.env.GCS_PUBLIC_PREFIXES || "public").split(",").map((prefix) => prefix.trim()).filter(Boolean);
    const bucket = objectStorageClient.bucket(this.getBucketName());
    for (const prefix of prefixes) {
      const file = bucket.file(`${prefix.replace(/\/+$/, "")}/${filePath.replace(/^\/+/, "")}`);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  async downloadObject(file: File, cacheTtlSec: number = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";
    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) headers["Content-Length"] = String(metadata.size);
    return new Response(webStream, { headers });
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectName = `${this.getUploadPrefix()}/${randomUUID()}`;
    const clientEmail = firstEnv("GCS_CLIENT_EMAIL", "FIREBASE_CLIENT_EMAIL");
    const options: any = {
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
    };
    if (clientEmail) {
      options.clientEmail = clientEmail;
    }
    const [url] = await objectStorageClient.bucket(this.getBucketName()).file(objectName).getSignedUrl(options);
    return url;
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    const objectFile = this.getBucketFile(objectPath);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath) return rawPath;
    if (rawPath.startsWith("/objects/")) return rawPath;
    try {
      if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
        const url = new URL(rawPath);
        const parts = url.pathname.replace(/^\/+/, "").split("/");
        const bucketName = this.getBucketName();
        if (parts[0] === bucketName) {
          parts.shift();
        }
        return `/objects/${parts.join("/")}`;
      }
    } catch {
      // Ignore URL parsing failure and return original rawPath
    }
    return rawPath;
  }

  async trySetObjectEntityAclPolicy(rawPath: string, aclPolicy: ObjectAclPolicy): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({ userId, objectFile, requestedPermission: requestedPermission ?? ObjectPermission.READ });
  }
}
