export async function fileToWebpBlob(
  file: File,
  options?: { maxSize?: number; quality?: number }
) {
  const quality = options?.quality ?? 0.82;
  const maxSize = options?.maxSize ?? 1600;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d context missing");
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error("Failed to encode webp"));
        else resolve(b);
      },
      "image/webp",
      quality
    );
  });

  return blob;
}

