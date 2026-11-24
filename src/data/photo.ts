// Local mode's stand-in for photo storage: shrink the picked image to a small JPEG kept inside the
// listing. A backend uploads the file to storage instead and returns its URL.

import { MAX_PHOTO_CHARS, RuleError } from "./rules/index.ts";

const MAX_FILE_BYTES = 12 * 1024 * 1024;

export async function compressPhoto(file: File, options?: { maxDimension?: number; quality?: number; maxChars?: number }): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > MAX_FILE_BYTES) throw new RuleError("Choose an image under 12 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {
      throw new RuleError("That image couldn't be read. Try another one.");
    });
    const scale = Math.min(1, (options?.maxDimension ?? 600) / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const jpeg = canvas.toDataURL("image/jpeg", options?.quality ?? 0.5);
    if (jpeg.length > (options?.maxChars ?? MAX_PHOTO_CHARS)) throw new RuleError("This photo is too large. Choose a smaller one.");
    return jpeg;
  } finally {
    URL.revokeObjectURL(url);
  }
}
