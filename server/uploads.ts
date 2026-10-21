import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface DetectedImage {
  extension: 'jpg' | 'png' | 'webp';
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Detects the real image type from the file signature. The browser-provided
 * MIME type and filename are never trusted.
 */
export function detectImage(buffer: Buffer): DetectedImage | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', mime: 'image/jpeg' };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { extension: 'png', mime: 'image/png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { extension: 'webp', mime: 'image/webp' };
  }
  return null;
}

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedKinds = new Set(['portrait', 'share', 'project']);

export type UploadKind = 'portrait' | 'share' | 'project' | 'resume';

export interface SavedUpload {
  url: string;
  filename: string;
  contentType: string;
  bytes: number;
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/**
 * Writes an image to durable storage under a generated name. SVG is rejected
 * because it can carry executable content; the accepted formats are raster
 * images with verified signatures.
 */
export async function saveImage(
  directory: string,
  kind: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined,
): Promise<SavedUpload> {
  if (!file) throw new UploadError('Choose an image file to upload.');
  if (!allowedKinds.has(kind)) throw new UploadError('Unknown upload type.');
  if (file.size === 0) throw new UploadError('The uploaded file is empty.');
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError('Images must be 5 MB or smaller.', 413);
  }
  if (!allowedMimeTypes.has(file.mimetype.toLowerCase())) {
    throw new UploadError('Only JPEG, PNG, or WebP images are accepted.');
  }

  const detected = detectImage(file.buffer);
  if (!detected) {
    throw new UploadError('The file is not a valid JPEG, PNG, or WebP image.');
  }

  // The declared extension must agree with the verified file signature.
  const declaredExtension = path.extname(file.originalname).toLowerCase();
  const declaredMatches = { jpg: ['.jpg', '.jpeg'], png: ['.png'], webp: ['.webp'] }[
    detected.extension
  ].includes(declaredExtension);
  if (declaredExtension && !declaredMatches) {
    throw new UploadError('The file extension does not match its contents.');
  }

  await mkdir(directory, { recursive: true });
  const filename = `${kind}-${randomUUID()}.${detected.extension}`;
  await writeFile(path.join(directory, filename), file.buffer, { mode: 0o644 });

  return {
    url: `/media/${filename}`,
    filename,
    contentType: detected.mime,
    bytes: file.size,
  };
}

/**
 * Stores a resume PDF. The signature is checked so a renamed executable or
 * HTML file cannot be published as a document.
 */
export async function saveDocument(
  directory: string,
  kind: string,
  file: { buffer: Buffer; mimetype: string; originalname: string; size: number } | undefined,
): Promise<SavedUpload> {
  if (!file) throw new UploadError('Choose a PDF file to upload.');
  if (kind !== 'resume') throw new UploadError('Unknown upload type.');
  if (file.size === 0) throw new UploadError('The uploaded file is empty.');
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError('Files must be 5 MB or smaller.', 413);
  }
  if (file.mimetype.toLowerCase() !== 'application/pdf') {
    throw new UploadError('Only PDF documents are accepted.');
  }
  if (file.buffer.length < 5 || file.buffer.toString('ascii', 0, 5) !== '%PDF-') {
    throw new UploadError('The file is not a valid PDF document.');
  }
  if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
    throw new UploadError('The file extension must be .pdf.');
  }

  await mkdir(directory, { recursive: true });
  const filename = `resume-${randomUUID()}.pdf`;
  await writeFile(path.join(directory, filename), file.buffer, { mode: 0o644 });

  return {
    url: `/media/${filename}`,
    filename,
    contentType: 'application/pdf',
    bytes: file.size,
  };
}

const mediaNamePattern = /^(portrait|share|project|resume)-[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/;

/** Deletes a published media file. Unknown or traversing names are rejected. */
export async function deleteMedia(directory: string, filename: string): Promise<boolean> {
  if (!mediaNamePattern.test(filename)) {
    throw new UploadError('Unknown media file.');
  }
  try {
    await unlink(path.join(directory, filename));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}
