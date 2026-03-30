import { NextResponse } from "next/server";
import { z } from "zod";
import { getS3Bucket, getS3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireUser } from "@/lib/serverAuth";

const BodySchema = z.object({
  key: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const bucket = getS3Bucket();
  const s3 = getS3Client();

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: parsed.data.key,
  });

  const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
  return NextResponse.json({ url });
}

