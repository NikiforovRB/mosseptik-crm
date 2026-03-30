import { S3Client } from "@aws-sdk/client-s3";

export function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint) throw new Error("S3_ENDPOINT is missing");
  if (!accessKeyId) throw new Error("S3_ACCESS_KEY_ID is missing");
  if (!secretAccessKey) throw new Error("S3_SECRET_ACCESS_KEY is missing");

  return new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getS3Bucket() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET is missing");
  return bucket;
}

