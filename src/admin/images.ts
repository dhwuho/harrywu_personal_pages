import { MAX_IMAGE_SIZE } from './config';

/** An image picked in the editor, waiting to be committed with the next save. */
export interface Upload {
  name: string;
  bytes: Uint8Array;
  /** Object URL for the preview. */
  url: string;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

export const isImagePath = (path: string) => IMAGE_EXT.test(path);

/** "My Photo (1).JPG" → "my-photo-1" */
function baseName(file: File): string {
  const stem = file.name.replace(/\.[^.]+$/, '');
  const clean = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || `image-${Date.now().toString(36)}`;
}

/** A name not already in `taken`: photo.webp, photo-2.webp, ... */
function uniqueName(stem: string, ext: string, taken: Set<string>): string {
  let name = `${stem}.${ext}`;
  for (let i = 2; taken.has(name); i++) name = `${stem}-${i}.${ext}`;
  return name;
}

/**
 * Resize to fit MAX_IMAGE_SIZE and convert to WebP in the browser.
 * GIF and SVG are kept as they are (animation / vector).
 */
export async function prepareImage(file: File, taken: Set<string>): Promise<Upload> {
  const stem = baseName(file);
  if (/image\/(gif|svg\+xml)/.test(file.type)) {
    const ext = file.type === 'image/gif' ? 'gif' : 'svg';
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { name: uniqueName(stem, ext, taken), bytes, url: URL.createObjectURL(file) };
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/webp', 0.85),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { name: uniqueName(stem, 'webp', taken), bytes, url: URL.createObjectURL(blob) };
}
