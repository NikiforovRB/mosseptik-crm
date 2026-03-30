import { NextResponse } from "next/server";
import { z } from "zod";
import { getS3Bucket, getS3Client } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  purpose: z.enum(["communicationPhoto", "avatar"]),
  contentType: z.string().min(1),
  ext: z.string().min(1).max(10),
  variant: z.enum(["original", "webp"]),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { purpose, contentType, ext, variant } = parsed.data;
  const userId = auth.user.id ?? null;

  const bucket = getS3Bucket();
  const s3 = getS3Client();

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");

  const base = `${purpose}/${yyyy}/${mm}/${dd}/${randomUUID()}`;
  const key = `${base}.${variant}.${ext.replace(/^\./, "")}`;

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    Metadata: {
      purpose,
      variant,
      userId: userId ? String(userId) : "unknown",
    },
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });

  return NextResponse.json({ key, uploadUrl });
}

