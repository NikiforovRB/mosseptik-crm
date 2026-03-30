import { z } from "zod";

const PresignResponseSchema = z.object({
  key: z.string().min(1),
  uploadUrl: z.string().url(),
});

export async function presignUpload(input: {
  purpose: "communicationPhoto" | "avatar";
  variant: "original" | "webp";
  contentType: string;
  ext: string;
}) {
  const res = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Presign failed");
  const json = await res.json();
  return PresignResponseSchema.parse(json);
}

export async function putObject(uploadUrl: string, blob: Blob) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": blob.type || "application/octet-stream",
    },
    body: blob,
  });
  if (!res.ok) throw new Error("Upload failed");
}

