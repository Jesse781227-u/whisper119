import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured.`);
  return value;
}

function objectKey(objectPath: string): string {
  if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
  const key = objectPath.slice("/objects/".length);
  if (!key || key.includes("..")) throw new ObjectNotFoundError();
  return key;
}

export const objectStorageClient = new S3Client({
  region: process.env.R2_REGION?.trim() || "auto",
  endpoint: requiredEnv("R2_ENDPOINT"),
  forcePathStyle: true,
  credentials: {
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
  },
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class R2ObjectFile {
  constructor(public readonly name: string) {}
}

export class ObjectStorageService {
  private getBucketName(): string {
    return requiredEnv("R2_BUCKET");
  }

  private getUploadPrefix(): string {
    return (process.env.R2_UPLOAD_PREFIX?.trim() || "uploads").replace(/^\/+|\/+$/g, "");
  }

  private send<T>(command: T): Promise<any> {
    return objectStorageClient.send(command as any);
  }

  async searchPublicObject(filePath: string): Promise<R2ObjectFile | null> {
    const prefixes = (process.env.R2_PUBLIC_PREFIXES || "public").split(",").map((prefix) => prefix.trim()).filter(Boolean);
    for (const prefix of prefixes) {
      const key = `${prefix.replace(/\/+$/, "")}/${filePath.replace(/^\/+/, "")}`;
      try {
        await this.send(new HeadObjectCommand({ Bucket: this.getBucketName(), Key: key }));
        return new R2ObjectFile(key);
      } catch (error: any) {
        if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== "NotFound") throw error;
      }
    }
    return null;
  }

  async downloadObject(file: R2ObjectFile, cacheTtlSec: number = 3600): Promise<Response> {
    const result = await this.send(new GetObjectCommand({ Bucket: this.getBucketName(), Key: file.name }));
    if (!result.Body) throw new ObjectNotFoundError();
    const metadata = await this.send(new HeadObjectCommand({ Bucket: this.getBucketName(), Key: file.name }));
    const webStream = Readable.toWeb(result.Body as Readable) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": metadata.ContentType || result.ContentType || "application/octet-stream",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (metadata.ContentLength !== undefined) headers["Content-Length"] = String(metadata.ContentLength);
    return new Response(webStream, { headers });
  }

  async downloadBuffer(file: R2ObjectFile): Promise<Buffer> {
    const result = await this.send(new GetObjectCommand({ Bucket: this.getBucketName(), Key: file.name }));
    if (!result.Body) throw new ObjectNotFoundError();
    return Buffer.from(await (result.Body as any).transformToByteArray());
  }

  async getObjectEntityUploadURL(contentType?: string): Promise<string> {
    const key = `${this.getUploadPrefix()}/${randomUUID()}`;
    return getSignedUrl(objectStorageClient, new PutObjectCommand({
      Bucket: this.getBucketName(),
      Key: key,
      ...(contentType ? { ContentType: contentType } : {}),
    }), { expiresIn: 15 * 60 });
  }

  async getObjectEntityFile(objectPath: string): Promise<R2ObjectFile> {
    const key = objectKey(objectPath);
    try {
      await this.send(new HeadObjectCommand({ Bucket: this.getBucketName(), Key: key }));
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") throw new ObjectNotFoundError();
      throw error;
    }
    return new R2ObjectFile(key);
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath) return rawPath;
    if (rawPath.startsWith("/objects/")) return rawPath;
    try {
      const url = new URL(rawPath);
      const bucket = this.getBucketName();
      const path = url.pathname.replace(/^\/+/, "");
      const key = path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path;
      return key ? `/objects/${key}` : rawPath;
    } catch {
      return rawPath;
    }
  }
}
