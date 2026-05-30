/**
 * S3-compatible object storage. Works with AWS S3, Cloudflare R2, MinIO (dev).
 * License: @aws-sdk Apache-2.0.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT, // MinIO/dev: http://minio:9000
  forcePathStyle: !!process.env.S3_ENDPOINT,
  credentials: process.env.S3_ACCESS_KEY
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      }
    : undefined,
});

const BUCKET = process.env.S3_BUCKET ?? "toeic-media";
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE ?? "";

export async function uploadS3(args: { key: string; body: Buffer; contentType: string }) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return PUBLIC_BASE ? `${PUBLIC_BASE}/${args.key}` : `s3://${BUCKET}/${args.key}`;
}
