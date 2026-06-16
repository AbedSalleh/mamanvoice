// Downscale + re-encode user-supplied images before they are stored in
// IndexedDB / backups. Phone photos are multi-MB; an AAC card never needs more
// than a few hundred pixels, and base64 in the backup adds another ~33%.

const MAX_DIM = 512;
const QUALITY = 0.8;

export async function compressImage(
  input: Blob,
  maxDim = MAX_DIM,
  quality = QUALITY,
): Promise<Blob> {
  // Vector images are already tiny and must not be rasterised.
  if (input.type === "image/svg+xml") return input;

  try {
    const bitmap = await createImageBitmap(input);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return input;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    // Only keep the compressed version if it actually helped.
    return blob && blob.size > 0 && blob.size < input.size ? blob : input;
  } catch {
    // If anything goes wrong (e.g. unsupported format) keep the original.
    return input;
  }
}
