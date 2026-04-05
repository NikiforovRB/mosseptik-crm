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

/** PUT with upload progress (percent 0–100). */
export function putObjectWithProgress(
  uploadUrl: string,
  blob: Blob,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
    xhr.send(blob);
  });
}

